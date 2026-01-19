import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const conn = await pool.getConnection();
  try {
    const [tables] = await conn.query("SELECT * FROM tables ORDER BY number ASC");

    const [takeaways] = await conn.query(`
      SELECT order_id, customer_name, customer_phone, total_price, created_at 
      FROM orders 
      WHERE order_type = 'TAKEAWAY' AND paid = 0 
      ORDER BY created_at DESC
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
    conn.release();
  }
}