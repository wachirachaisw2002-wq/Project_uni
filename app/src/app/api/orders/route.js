import { NextResponse } from "next/server";
import pool from "@/lib/db";

// --- Helper Function (คงเดิม) ---
async function updateTableAfterOrder(conn, tableNum, mode /* 'start' | 'add' */) {
  const setSql =
    mode === "start"
      ? "status = 'มีลูกค้า', order_count = 1"
      : "order_count = order_count + 1";

  let [res] = await conn.query(
    `UPDATE tables SET ${setSql} WHERE table_id = ?`,
    [tableNum]
  );
  if (res.affectedRows > 0) return;

  [res] = await conn.query(
    `UPDATE tables SET ${setSql} WHERE id = ?`,
    [tableNum]
  );
  if (res.affectedRows > 0) return;

  [res] = await conn.query(
    `UPDATE tables SET ${setSql} WHERE number = ?`,
    [tableNum]
  );
  if (res.affectedRows > 0) return;

  throw new Error(
    "ไม่สามารถอัปเดตตาราง 'tables' ได้: ไม่พบคอลัมน์ table_id/id/number ที่แม็ปกับค่าโต๊ะนี้"
  );
}

// --- 🔴 GET Function (แก้ไขใหม่ เพื่อรองรับ Group Bill) ---
export const dynamic = "force-dynamic"; // บังคับไม่ให้ Cache ข้อมูล

export async function GET(request) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const tableParam = searchParams.get("table");

    if (!tableParam) {
      return NextResponse.json({ message: "ระบุเลขโต๊ะ" }, { status: 400 });
    }

    // 1. ค้นหาข้อมูลโต๊ะก่อน เพื่อดูว่ามี group_id หรือไม่
    // (รองรับทั้งการส่งมาเป็น table_id หรือ table_number)
    const [tables] = await conn.query(
      "SELECT table_id, number, group_id FROM tables WHERE table_id = ? OR number = ?",
      [tableParam, tableParam]
    );

    if (tables.length === 0) {
      return NextResponse.json([]); // ไม่พบโต๊ะ ส่งอาเรย์ว่างกลับไป
    }

    const currentTable = tables[0];
    let query = "";
    let params = [];

    // 2. สร้าง Query ตามเงื่อนไข Group
    // Query พื้นฐาน (Join ตารางเพื่อเอาข้อมูลอาหาร)
    const baseSelect = `
      SELECT 
        o.order_id, o.table_number, o.total_price, o.created_at,
        oi.order_item_id, oi.menu_id, oi.qty, oi.note, oi.status,
        m.name, m.price, m.image
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menus m ON oi.menu_id = m.menu_id
    `;

    if (currentTable.group_id) {
      // ✅ กรณีมี Group ID: ดึงออเดอร์ของ "ทุกโต๊ะ" ที่มี group_id เดียวกัน
      // ต้อง Join กับ tables เพื่อเช็ค group_id
      query = `
        ${baseSelect}
        JOIN tables t ON o.table_number = t.number
        WHERE t.group_id = ? AND o.paid = 0
        ORDER BY o.created_at ASC, oi.order_item_id ASC
      `;
      params = [currentTable.group_id];
    } else {
      // ✅ กรณีไม่มี Group: ดึงแค่โต๊ะตัวเองตามปกติ
      query = `
        ${baseSelect}
        WHERE o.table_number = ? AND o.paid = 0
        ORDER BY o.created_at ASC, oi.order_item_id ASC
      `;
      params = [currentTable.number];
    }

    // 3. รัน Query
    const [rows] = await conn.query(query, params);

    // 4. จัดรูปแบบข้อมูล (Group ตาม Order ID)
    const ordersMap = {};
    for (const row of rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          id: row.order_id,
          table_number: row.table_number, // Frontend จะใช้ค่านี้แสดงว่ารายการนี้มาจากโต๊ะไหน
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
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ message: "เกิดข้อผิดพลาด", error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

// --- POST Function (คงเดิม) ---
export async function POST(request) {
  let conn;
  try {
    const { table_number, items } = await request.json();

    const tableNum = Number(table_number);
    if (!table_number || Number.isNaN(tableNum) || tableNum <= 0) {
      return NextResponse.json(
        { message: "กรุณาระบุเลขโต๊ะให้ถูกต้อง" },
        { status: 400 }
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "ตะกร้าว่าง" }, { status: 400 });
    }

    const safeItems = items.map((it, idx) => {
      const menuId = it.menu_id ?? it.id;
      const qty = Number(it.qty);
      const price = Number(it.price);
      if (!menuId || Number.isNaN(qty) || qty <= 0 || Number.isNaN(price) || price < 0) {
        throw new Error(`รายการที่ ${idx + 1} ไม่ถูกต้อง`);
      }
      return {
        menu_id: menuId,
        qty,
        price,
        note: it.note ?? null,
      };
    });

    const total_price = safeItems.reduce((sum, it) => sum + it.price * it.qty, 0);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      "INSERT INTO orders (table_number, total_price, paid) VALUES (?, ?, 0)",
      [tableNum, total_price]
    );
    const orderId = orderResult.insertId;

    const orderItemsData = safeItems.map((it) => [orderId, it.menu_id, it.qty, it.note]);
    await conn.query(
      "INSERT INTO order_items (order_id, menu_id, qty, note) VALUES ?",
      [orderItemsData]
    );

    await updateTableAfterOrder(conn, tableNum, "start");

    await conn.commit();
    return NextResponse.json(
      { message: "บันทึกคำสั่งซื้อเรียบร้อย", order_id: orderId },
      { status: 201 }
    );
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("POST /api/orders error:", error);
    const msg = error?.message?.includes("ไม่ถูกต้อง")
      ? error.message
      : "เกิดข้อผิดพลาด";
    return NextResponse.json({ message: msg }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

// --- PATCH Function (คงเดิม) ---
export async function PATCH(request) {
  let conn;
  try {
    const { table_number, items } = await request.json();

    const tableNum = Number(table_number);
    if (!table_number || Number.isNaN(tableNum) || tableNum <= 0) {
      return NextResponse.json(
        { message: "กรุณาระบุเลขโต๊ะให้ถูกต้อง" },
        { status: 400 }
      );
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "ไม่มีรายการอาหาร" }, { status: 400 });
    }

    const safeItems = items.map((it, idx) => {
      const menuId = it.menu_id ?? it.id;
      const qty = Number(it.qty);
      const price = Number(it.price);
      if (!menuId || Number.isNaN(qty) || qty <= 0 || Number.isNaN(price) || price < 0) {
        throw new Error(`รายการที่ ${idx + 1} ไม่ถูกต้อง`);
      }
      return {
        menu_id: menuId,
        qty,
        price,
        note: it.note ?? null,
      };
    });

    const total_price = safeItems.reduce((sum, it) => sum + it.price * it.qty, 0);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      "INSERT INTO orders (table_number, total_price, paid) VALUES (?, ?, 0)",
      [tableNum, total_price]
    );
    const orderId = orderResult.insertId;

    const orderItemsData = safeItems.map((it) => [orderId, it.menu_id, it.qty, it.note]);
    await conn.query(
      "INSERT INTO order_items (order_id, menu_id, qty, note) VALUES ?",
      [orderItemsData]
    );

    await updateTableAfterOrder(conn, tableNum, "add");

    await conn.commit();
    return NextResponse.json(
      { message: "เพิ่มคำสั่งซื้อในโต๊ะเดิมเรียบร้อย", order_id: orderId },
      { status: 201 }
    );
  } catch (error) {
    if (conn) await conn.rollback();
    console.error("PATCH /api/orders error:", error);
    const msg = error?.message?.includes("ไม่ถูกต้อง")
      ? error.message
      : "เกิดข้อผิดพลาด";
    return NextResponse.json({ message: msg }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}