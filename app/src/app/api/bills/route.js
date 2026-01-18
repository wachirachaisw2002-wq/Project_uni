import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ฟังก์ชันช่วยเช็คว่ามี Column นี้ในตารางไหม
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
    // *** 1. เปลี่ยนจาก .json() เป็น .formData() เพื่อรับไฟล์ ***
    const formData = await request.formData();

    // ดึงค่าพื้นฐาน
    const tableId = Number(formData.get("table_id"));
    const total = Number(formData.get("total_price"));
    const payType = formData.get("payment_type");
    const closedById = Number(formData.get("closed_by_id")) || null;
    let closedByName = formData.get("closed_by_name") || null;
    const received = Number(formData.get("cash_received") || 0);
    const change = Number(formData.get("change_amount") || 0);

    // แปลง items จาก JSON String กลับเป็น Array
    const items = JSON.parse(formData.get("items") || "[]");

    // *** 2. จัดการไฟล์รูปภาพสลิป ***
    const slipFile = formData.get("slip_image");
    let slipPath = null;

    if (slipFile && typeof slipFile !== "string") {
      const buffer = Buffer.from(await slipFile.arrayBuffer());
      const filename = `slip-${tableId}-${Date.now()}${path.extname(slipFile.name)}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/slips");

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      try { await mkdir(uploadDir, { recursive: true }); } catch (e) { }

      await writeFile(path.join(uploadDir, filename), buffer);
      slipPath = `/uploads/slips/${filename}`; // พาธสำหรับเก็บลง DB และเรียกใช้งานหน้าเว็บ
    }

    if (!tableId || items.length === 0 || !total || !payType) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    await conn.beginTransaction();

    // 3. ตรวจสอบ Column ที่มีในตาราง (Dynamic Support)
    const hasClosedById = await hasColumn(conn, "bills", "closed_by_id");
    const hasClosedByName = await hasColumn(conn, "bills", "closed_by_name");
    const hasCashReceived = await hasColumn(conn, "bills", "cash_received");
    const hasChangeAmount = await hasColumn(conn, "bills", "change_amount");
    const hasSlipUrl = await hasColumn(conn, "bills", "slip_url"); // เช็คคอลัมน์เก็บรูป

    // ดึงชื่อพนักงานถ้าไม่มี
    if (hasClosedById && closedById && !closedByName) {
      const [empRows] = await conn.query("SELECT name FROM employees WHERE employee_id = ? LIMIT 1", [closedById]);
      closedByName = empRows?.[0]?.name ?? null;
    }

    // 4. เตรียมข้อมูล Insert ตาราง bills
    const cols = ["table_id", "total_price", "payment_type", "created_at"];
    const vals = [tableId, total, payType, new Date()];

    if (hasClosedById) { cols.push("closed_by_id"); vals.push(closedById); }
    if (hasClosedByName) { cols.push("closed_by_name"); vals.push(closedByName); }
    if (hasCashReceived) { cols.push("cash_received"); vals.push(received); }
    if (hasChangeAmount) { cols.push("change_amount"); vals.push(change); }
    if (hasSlipUrl && slipPath) { cols.push("slip_url"); vals.push(slipPath); }

    const placeholders = cols.map(() => "?").join(", ");
    const sqlInsertBill = `INSERT INTO bills (${cols.join(", ")}) VALUES (${placeholders})`;

    const [billResult] = await conn.query(sqlInsertBill, vals);
    const billId = billResult.insertId;

    // 5. บันทึกรายการลง bill_items
    const billItemsData = items.map((item) => [billId, item.menu_id, item.qty, item.price]);
    if (billItemsData.length > 0) {
      await conn.query("INSERT INTO bill_items (bill_id, menu_id, qty, price) VALUES ?", [billItemsData]);
    }

    // 6. อัปเดตรายการอาหารและสถานะโต๊ะ
    const hasBillIdInOrderItems = await hasColumn(conn, "order_items", "bill_id");
    if (hasBillIdInOrderItems) {
      await conn.query(
        `UPDATE order_items SET bill_id = ? 
         WHERE order_id IN (SELECT id FROM orders WHERE table_number = ?)
         AND status = 'เสิร์ฟแล้ว' AND bill_id IS NULL`,
        [billId, tableId]
      );
    }

    // ปรับสถานะโต๊ะเป็น 'ว่าง'
    await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0 WHERE table_id = ?", [tableId]);

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