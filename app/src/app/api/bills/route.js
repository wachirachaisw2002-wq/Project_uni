import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

export async function POST(request) {
  const conn = await pool.getConnection();
  try {
    const formData = await request.formData();

    const tableIdStr = formData.get("table_id");
    const tableId = (tableIdStr && tableIdStr !== 'null' && tableIdStr !== '0') ? Number(tableIdStr) : null;

    const total = Number(formData.get("total_price"));
    const payType = formData.get("payment_type");
    const closedById = Number(formData.get("closed_by_id")) || null;
    let closedByName = formData.get("closed_by_name") || null;
    const received = Number(formData.get("cash_received") || 0);
    const change = Number(formData.get("change_amount") || 0);
    const customerName = formData.get("customer_name") || null;
    const orderType = formData.get("order_type") || 'DINE_IN';
    const items = JSON.parse(formData.get("items") || "[]");

    let finalRemark = formData.get("remark") || null;

    const slipFile = formData.get("slip_image");
    let slipPath = null;
    if (slipFile && typeof slipFile !== "string") {
      const buffer = Buffer.from(await slipFile.arrayBuffer());
      const filename = `slip-${tableId || 'takeaway'}-${Date.now()}${path.extname(slipFile.name)}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/slips");
      try { await mkdir(uploadDir, { recursive: true }); } catch (e) { }
      await writeFile(path.join(uploadDir, filename), buffer);
      slipPath = `/uploads/slips/${filename}`;
    }

    if ((!tableId && orderType !== 'TAKEAWAY') || items.length === 0 || !total || !payType) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    await conn.beginTransaction();

    let currentTableData = null;

    if (tableId) {
      const [tRows] = await conn.query("SELECT number, group_id FROM tables WHERE table_id = ?", [tableId]);

      if (tRows.length > 0) {
        currentTableData = tRows[0];

        if (currentTableData.group_id) {
          const [gRows] = await conn.query(
            "SELECT number FROM tables WHERE group_id = ? ORDER BY number ASC",
            [currentTableData.group_id]
          );

          const tableNumbers = gRows.map(r => r.number).join(", ");
          const autoText = `รวมโต๊ะ: ${tableNumbers}`;

          finalRemark = finalRemark ? `${autoText} (${finalRemark})` : autoText;
        }
      }
    }

    const hasClosedById = await hasColumn(conn, "bills", "closed_by_id");
    const hasClosedByName = await hasColumn(conn, "bills", "closed_by_name");
    const hasCashReceived = await hasColumn(conn, "bills", "cash_received");
    const hasChangeAmount = await hasColumn(conn, "bills", "change_amount");
    const hasSlipUrl = await hasColumn(conn, "bills", "slip_url");
    const hasCustomerName = await hasColumn(conn, "bills", "customer_name");
    const hasRemark = await hasColumn(conn, "bills", "remark");

    if (hasClosedById && closedById && !closedByName) {
      const [empRows] = await conn.query("SELECT name FROM employees WHERE employee_id = ? LIMIT 1", [closedById]);
      closedByName = empRows?.[0]?.name ?? null;
    }

    const cols = ["table_id", "total_price", "payment_type", "created_at"];
    const vals = [tableId, total, payType, new Date()];

    if (hasClosedById) { cols.push("closed_by_id"); vals.push(closedById); }
    if (hasClosedByName) { cols.push("closed_by_name"); vals.push(closedByName); }
    if (hasCashReceived) { cols.push("cash_received"); vals.push(received); }
    if (hasChangeAmount) { cols.push("change_amount"); vals.push(change); }
    if (hasSlipUrl && slipPath) { cols.push("slip_url"); vals.push(slipPath); }
    if (hasCustomerName && customerName) { cols.push("customer_name"); vals.push(customerName); }

    if (hasRemark && finalRemark) { cols.push("remark"); vals.push(finalRemark); }

    const placeholders = cols.map(() => "?").join(", ");
    const [billResult] = await conn.query(`INSERT INTO bills (${cols.join(", ")}) VALUES (${placeholders})`, vals);
    const billId = billResult.insertId;

    const hasTotalCol = await hasColumn(conn, "bill_items", "total");
    const billItemsData = items.map((item) => {
      const row = [billId, item.menu_id, item.qty, item.price];
      if (hasTotalCol) row.push(item.total || (item.qty * item.price));
      return row;
    });

    if (billItemsData.length > 0) {
      let insertCols = "bill_id, menu_id, qty, price";
      if (hasTotalCol) insertCols += ", total";
      await conn.query(`INSERT INTO bill_items (${insertCols}) VALUES ?`, [billItemsData]);
    }

    if (currentTableData) {
      if (currentTableData.group_id) {
        const groupId = currentTableData.group_id;
        await conn.query(
          `UPDATE orders o 
           JOIN tables t ON o.table_number = t.number
           SET o.paid = 1
           WHERE t.group_id = ? AND o.paid = 0`,
          [groupId]
        );
        await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0, group_id = NULL WHERE group_id = ?", [groupId]);
      } else {
        const tableNum = currentTableData.number;
        await conn.query(
          "UPDATE orders SET paid = 1 WHERE table_number = ? AND paid = 0",
          [tableNum]
        );
        await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0 WHERE table_id = ?", [tableId]);
      }
    } else {
      if (customerName) {
        await conn.query(
          `UPDATE orders 
           SET paid = 1
           WHERE customer_name = ? AND order_type = 'TAKEAWAY' AND paid = 0`,
          [customerName]
        );
      }
    }

    await conn.commit();
    return NextResponse.json({ message: "บันทึกบิลเรียบร้อย", bill_id: billId, slip_url: slipPath }, { status: 201 });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error("POST /api/bills error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาด", error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}