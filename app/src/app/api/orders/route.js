import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

async function updateTableAfterOrder(conn, tableNum, mode) {
  const setSql =
    mode === "start"
      ? "status = 'มีลูกค้า', order_count = 1"
      : "order_count = order_count + 1";

  let [res] = await conn.query(`UPDATE tables SET ${setSql} WHERE table_id = ?`, [tableNum]);
  if (res.affectedRows > 0) return;

  [res] = await conn.query(`UPDATE tables SET ${setSql} WHERE number = ?`, [tableNum]);
}

async function recalculateOrderTotal(conn, orderId) {
  await conn.query(`
    UPDATE orders o
    SET o.total_price = (
      SELECT COALESCE(SUM(oi.qty * m.price), 0)
      FROM order_items oi
      JOIN menus m ON oi.menu_id = m.menu_id
      WHERE oi.order_id = ?
    )
    WHERE o.order_id = ?
  `, [orderId, orderId]);
}

export async function GET(request) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get("table");
    const typeParam = searchParams.get("type");
    const customerName = searchParams.get("customerName");

    if (!tableParam && typeParam !== 'takeout') {
      return NextResponse.json({ message: "ระบุข้อมูลไม่ครบถ้วน" }, { status: 400 });
    }

    let query = "";
    let params = [];

    const baseSelect = `
      SELECT 
        o.order_id, o.table_number, o.order_type, o.customer_name, o.customer_phone, o.total_price, o.created_at,
        oi.order_item_id, oi.menu_id, oi.qty, oi.note, oi.status,
        m.name, m.price, m.image
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menus m ON oi.menu_id = m.menu_id
    `;

    if (typeParam === 'takeout' && customerName) {
      query = `
        ${baseSelect}
        WHERE o.customer_name = ? AND o.order_type = 'TAKEAWAY' AND o.paid = 0
        ORDER BY o.created_at ASC, oi.order_item_id ASC
      `;
      params = [customerName];

    } else {
      const [tables] = await conn.query(
        "SELECT table_id, number, group_id FROM tables WHERE table_id = ? OR number = ?",
        [tableParam, tableParam]
      );

      if (tables.length > 0) {
        const currentTable = tables[0];
        if (currentTable.group_id) {
          query = `
            ${baseSelect}
            JOIN tables t ON o.table_number = t.number
            WHERE t.group_id = ? AND o.paid = 0
            ORDER BY o.created_at ASC, oi.order_item_id ASC
          `;
          params = [currentTable.group_id];
        } else {
          query = `
            ${baseSelect}
            WHERE o.table_number = ? AND o.paid = 0
            ORDER BY o.created_at ASC, oi.order_item_id ASC
          `;
          params = [currentTable.number];
        }
      } else {
        return NextResponse.json([]);
      }
    }

    const [rows] = await conn.query(query, params);

    const ordersMap = {};
    for (const row of rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          table_number: row.table_number,
          order_type: row.order_type,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          total_price: row.total_price,
          created_at: row.created_at,
          items: [],
        };
      }
      ordersMap[row.order_id].items.push({
        id: row.order_item_id,
        menu_id: row.menu_id,
        name: row.name,
        price: row.price,
        image: row.image,
        qty: row.qty,
        note: row.note,
        status: row.status,
      });
    }

    return NextResponse.json(Object.values(ordersMap), { status: 200 });

  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ message: "Error", error: error.message }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function POST(request) {
  let conn;
  try {
    const { table_number, items, type = 'dine_in', customerName = null, customerPhone = null } = await request.json();

    let tableNum = null;
    let dbOrderType = 'DINE_IN';

    if (type === 'takeout') {
      dbOrderType = 'TAKEAWAY';
      if (!customerName || customerName.trim() === "") {
        return NextResponse.json({ message: "กรุณาระบุชื่อลูกค้า" }, { status: 400 });
      }
      tableNum = 0;
    } else {
      dbOrderType = 'DINE_IN';
      tableNum = Number(table_number);
      if (!table_number || Number.isNaN(tableNum)) {
        return NextResponse.json({ message: "กรุณาระบุเลขโต๊ะ" }, { status: 400 });
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "ตะกร้าว่าง" }, { status: 400 });
    }

    const safeItems = items.map((it) => ({
      menu_id: it.menu_id ?? it.id,
      qty: Number(it.qty),
      note: it.note ?? null,
    }));

    conn = await pool.getConnection();

    const menuIds = safeItems.map((i) => i.menu_id);
    if (menuIds.length > 0) {
      const [unavailableItems] = await conn.query(
        "SELECT name FROM menus WHERE menu_id IN (?) AND (available = 0 OR available IS FALSE)",
        [menuIds]
      );

      if (unavailableItems.length > 0) {
        const names = unavailableItems.map((i) => i.name).join(", ");
        conn.release(); // คืน Connection ทันที
        return NextResponse.json(
          { message: `ขออภัย รายการต่อไปนี้สินค้าหมด: ${names}` },
          { status: 400 }
        );
      }
    }

    await conn.beginTransaction();

    let existingOrderId = null;

    if (dbOrderType === 'TAKEAWAY') {
      const [existing] = await conn.query(
        "SELECT order_id FROM orders WHERE customer_name = ? AND order_type = 'TAKEAWAY' AND paid = 0 LIMIT 1",
        [customerName]
      );
      if (existing.length > 0) existingOrderId = existing[0].order_id;
    } else {
      const [existing] = await conn.query(
        "SELECT order_id FROM orders WHERE table_number = ? AND order_type = 'DINE_IN' AND paid = 0 LIMIT 1",
        [tableNum]
      );
      if (existing.length > 0) existingOrderId = existing[0].order_id;
    }

    let orderIdToUse = existingOrderId;

    if (!existingOrderId) {
      const [res] = await conn.query(
        `INSERT INTO orders 
         (table_number, order_type, customer_name, customer_phone, total_price, paid, created_at) 
         VALUES (?, ?, ?, ?, 0, 0, NOW())`,
        [tableNum, dbOrderType, customerName, customerPhone]
      );
      orderIdToUse = res.insertId;
      if (dbOrderType === 'DINE_IN') {
        await updateTableAfterOrder(conn, tableNum, "start");
      }
    } else {
      if (dbOrderType === 'DINE_IN') {
        await updateTableAfterOrder(conn, tableNum, "add");
      }
    }
    const orderItemsData = safeItems.map((it) => [orderIdToUse, it.menu_id, it.qty, it.note]);
    await conn.query(
      "INSERT INTO order_items (order_id, menu_id, qty, note) VALUES ?",
      [orderItemsData]
    );
    await recalculateOrderTotal(conn, orderIdToUse);

    await conn.commit();

    return NextResponse.json({
      message: existingOrderId ? "เพิ่มรายการในบิลเดิมสำเร็จ" : "เปิดบิลใหม่สำเร็จ",
      order_id: orderIdToUse,
      type: dbOrderType
    }, { status: 201 });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error("POST Order Error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาด", error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function PATCH(request) {
  let conn;
  try {
    const { table_number, items } = await request.json();
    const tableNum = Number(table_number);

    if (!tableNum) return NextResponse.json({ message: "ระบุเลขโต๊ะ" }, { status: 400 });
    if (!items?.length) return NextResponse.json({ message: "ไม่มีรายการ" }, { status: 400 });

    const safeItems = items.map((it) => ({
      menu_id: it.menu_id ?? it.id,
      qty: Number(it.qty),
      note: it.note ?? null,
    }));

    conn = await pool.getConnection();

    const menuIds = safeItems.map((i) => i.menu_id);
    if (menuIds.length > 0) {
      const [unavailableItems] = await conn.query(
        "SELECT name FROM menus WHERE menu_id IN (?) AND (available = 0 OR available IS FALSE)",
        [menuIds]
      );

      if (unavailableItems.length > 0) {
        const names = unavailableItems.map((i) => i.name).join(", ");
        conn.release(); // คืน Connection ทันที
        return NextResponse.json(
          { message: `ขออภัย รายการต่อไปนี้สินค้าหมด: ${names}` },
          { status: 400 }
        );
      }
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT order_id FROM orders WHERE table_number = ? AND paid = 0 ORDER BY order_id DESC LIMIT 1",
      [tableNum]
    );

    if (existing.length === 0) {
      throw new Error("ไม่พบออเดอร์ของโต๊ะนี้");
    }
    const orderId = existing[0].order_id;

    const orderItemsData = safeItems.map((it) => [orderId, it.menu_id, it.qty, it.note]);
    await conn.query("INSERT INTO order_items (order_id, menu_id, qty, note) VALUES ?", [orderItemsData]);

    await recalculateOrderTotal(conn, orderId);
    await updateTableAfterOrder(conn, tableNum, "add");

    await conn.commit();
    return NextResponse.json({ message: "เพิ่มรายการเรียบร้อย", order_id: orderId }, { status: 201 });

  } catch (error) {
    if (conn) await conn.rollback();
    return NextResponse.json({ message: "Error", error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}