import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const conn = await pool.getConnection();
  try {
    // 1. ดึงข้อมูลโต๊ะทั้งหมด
    const [tables] = await conn.query("SELECT * FROM tables ORDER BY number ASC");

    // 2. ดึงข้อมูลสั่งกลับบ้าน (แก้ปัญหา Collation ไม่ตรงกันด้วย COLLATE utf8mb4_general_ci)
    const [takeaways] = await conn.query(`
      SELECT 
        t.order_id, 
        t.customer_name, 
        t.customer_phone, 
        t.session_token, 
        t.created_at,
        COALESCE(o.total_price, 0) AS total_price
      FROM takeaways t
      LEFT JOIN orders o 
        ON t.customer_name COLLATE utf8mb4_general_ci = o.customer_name COLLATE utf8mb4_general_ci 
        AND o.order_type IN ('takeout', 'TAKEAWAY') 
        AND o.paid = 0
      WHERE t.status = 'ACTIVE'
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({
      tables,
      takeaways
    });

  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { message: "Failed to fetch data", error: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}