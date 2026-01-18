import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing bill id" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT
        bi.bill_item_id AS id,
        bi.menu_id,             
        /* ใช้ COALESCE ป้องกันกรณีเมนูถูกลบจากระบบแต่บิลยังอยู่ */
        COALESCE(m.name, 'ไม่พบชื่อเมนู') AS menu_name, 
        bi.qty AS quantity,      /* แปลงจาก DB (qty) ให้ตรงกับ Frontend (quantity) */
        bi.price,
        (bi.qty * bi.price) AS total
      FROM bill_items bi
      LEFT JOIN menus m ON bi.menu_id = m.menu_id
      WHERE bi.bill_id = ?
      ORDER BY bi.bill_item_id ASC
      `,
      [id]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching bill items:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}