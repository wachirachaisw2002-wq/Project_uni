import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const connection = await pool.getConnection();
  try {
    const [orders] = await connection.query(`
      SELECT 
        o.order_id     AS id,
        o.table_number AS table_number,
        o.total_price,
        o.created_at,
        o.paid,
        o.order_type,
        o.customer_name,
        t.number       AS table_display
      FROM orders o
      LEFT JOIN tables t ON o.table_number = t.table_id
      WHERE o.paid = 0
      ORDER BY o.created_at ASC
    `);

    const orderIds = orders.map((o) => o.id);
    let items = [];

    if (orderIds.length > 0) {
      const [rows] = await connection.query(
        `
        SELECT 
          oi.order_item_id AS orderItemId,
          oi.order_id,
          oi.qty,
          oi.note,
          oi.status,
          m.name,
          m.price,
          m.category,
          m.type
        FROM order_items oi
        JOIN menus m ON oi.menu_id = m.menu_id
        WHERE oi.order_id IN (?)
        ORDER BY oi.order_item_id ASC
        `,
        [orderIds]
      );
      items = rows;
    }

    const ordersWithItems = orders.map((o) => ({
      id: o.id,
      table: o.table_display ?? o.table_number ?? "-",
      table_number: o.table_number,
      orderType: o.order_type,       
      customerName: o.customer_name, 
      total_price: o.total_price,
      paid: o.paid,
      created_at: o.created_at,
      items: items.filter((i) => i.order_id === o.id),
    }));

    return NextResponse.json({ orders: ordersWithItems }, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PATCH(request) {
  const connection = await pool.getConnection();
  try {
    const { orderItemId, qty, note, action } = await request.json();
    if (!orderItemId) {
      return NextResponse.json({ error: "orderItemId required" }, { status: 400 });
    }

    if (action === "cancel") {
      await connection.query(
        `UPDATE order_items SET status = 'ยกเลิก' WHERE order_item_id = ?`,
        [orderItemId]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "start") {
      await connection.query(
        `UPDATE order_items SET status = 'กำลังทำ' WHERE order_item_id = ?`,
        [orderItemId]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "complete") {
      await connection.query(
        `UPDATE order_items SET status = 'ทำเสร็จ' WHERE order_item_id = ?`,
        [orderItemId]
      );
      return NextResponse.json({ success: true });
    }

    if (action === "serve") {
      await connection.query(
        `UPDATE order_items SET status = 'เสิร์ฟแล้ว' WHERE order_item_id = ?`,
        [orderItemId]
      );
      return NextResponse.json({ success: true });
    }

    const newQty = Math.max(1, Number(qty ?? 1));
    const newNote = note ?? "";

    await connection.query(
      `UPDATE order_items SET qty = ?, note = ? WHERE order_item_id = ?`,
      [newQty, newNote, orderItemId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/orders-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const { order_id, menu_id, qty, note } = await request.json();
    if (!order_id || !menu_id || !qty) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    await connection.query(
      `INSERT INTO order_items (order_id, menu_id, qty, note, status)
       VALUES (?, ?, ?, ?, 'รอดำเนินการ')`,
      [order_id, menu_id, Math.max(1, Number(qty)), note ?? ""]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/orders-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(request) {
  const connection = await pool.getConnection();
  try {
    const { orderItemId } = await request.json();
    if (!orderItemId) {
      return NextResponse.json({ error: "orderItemId required" }, { status: 400 });
    }

    await connection.query(`DELETE FROM order_items WHERE order_item_id = ?`, [orderItemId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/orders-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}