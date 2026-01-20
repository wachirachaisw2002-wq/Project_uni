import { NextResponse } from "next/server";
import pool from "@/lib/db";

async function getTableColumns(connection) {
  const [cols] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bills'`
  );
  return cols.map(c => c.COLUMN_NAME);
}

async function getEmployeeName(connection, employeeId) {
  const [emp] = await connection.query("SELECT name_th FROM employees WHERE employee_id = ?", [employeeId]);
  return emp?.[0]?.name_th || null;
}

export async function GET() {
  const connection = await pool.getConnection();
  try {
    const columns = await getTableColumns(connection);
    let fields = [
      "b.bill_id", "b.table_id", "b.total_price", "b.payment_type",
      "b.created_at", "b.cash_received", "b.change_amount"
    ];

    if (columns.includes('status')) fields.push("b.status");
    if (columns.includes('void_reason')) fields.push("b.void_reason");

    fields.push("(SELECT customer_name FROM orders WHERE bill_id = b.bill_id LIMIT 1) AS customer_name");

    if (columns.includes('remark')) fields.push("b.remark");

    if (columns.includes('closed_by_id')) {
      fields.push("b.closed_by_id");
      fields.push("e.name_th AS cashier_name");
    }

    const sql = `
      SELECT ${fields.join(", ")}
      FROM bills b
      LEFT JOIN employees e ON b.closed_by_id = e.employee_id
      ORDER BY b.created_at DESC
    `;

    const [rows] = await connection.query(sql);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(req) {
  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const { bill_id, type, status, user_id, payment_type, total_price, items, closed_by_id, void_reason } = body;

    if (!bill_id) return NextResponse.json({ error: "No Bill ID" }, { status: 400 });

    if (closed_by_id && !type && !status) {
      await connection.query("UPDATE bills SET closed_by_id = ? WHERE bill_id = ?", [closed_by_id, bill_id]);
      const name = await getEmployeeName(connection, closed_by_id);
      return NextResponse.json({ bill_id, closed_by_id, closed_by_name: name });
    }

    if (status === 'VOID' && type !== 'EDIT') {
      if (!user_id || !void_reason) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

      await connection.query(
        "UPDATE bills SET status = 'VOID', total_price = 0, closed_by_id = ?, void_reason = ? WHERE bill_id = ?",
        [user_id, void_reason, bill_id]
      );
      return NextResponse.json({ success: true });
    }

    if (type === 'EDIT') {
      if (!user_id || !items?.length || !void_reason) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

      await connection.beginTransaction();
      try {
        const [oldBill] = await connection.query(`
          SELECT 
            table_id, 
            remark,
            (SELECT customer_name FROM orders WHERE bill_id = bills.bill_id LIMIT 1) AS customer_name
          FROM bills 
          WHERE bill_id = ?
        `, [bill_id]);

        if (!oldBill.length) throw new Error("ไม่พบข้อมูลบิลเดิม");

        await connection.query(
          "UPDATE bills SET status = 'VOID', total_price = 0, closed_by_id = ?, void_reason = ? WHERE bill_id = ?",
          [user_id, void_reason, bill_id]
        );

        const cashReceived = payment_type === 'เงินสด' ? total_price : 0;

        const [insertRes] = await connection.query(
          `INSERT INTO bills (table_id, remark, total_price, payment_type, status, created_at, closed_by_id, cash_received, change_amount) 
            VALUES (?, ?, ?, ?, 'COMPLETED', NOW(), ?, ?, 0)`,
          [oldBill[0].table_id, oldBill[0].remark, total_price, payment_type, user_id, cashReceived]
        );
        const newId = insertRes.insertId;

        const itemValues = items.map(i => [newId, i.menu_id, i.qty || i.quantity, i.price]);
        await connection.query(
          "INSERT INTO bill_items (bill_id, menu_id, qty, price) VALUES ?",
          [itemValues]
        );

        await connection.commit();
        return NextResponse.json({ success: true, new_bill_id: newId });
      } catch (e) {
        await connection.rollback();
        throw e;
      }
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}