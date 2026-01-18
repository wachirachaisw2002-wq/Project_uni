import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic"; // บังคับไม่ให้ cache (สำคัญมากสำหรับ Realtime)

export async function GET() {
  const conn = await pool.getConnection();
  try {
    // ✅ ต้องมั่นใจว่า SELECT * หรือระบุ group_id มาด้วย
    const [rows] = await conn.query("SELECT * FROM tables ORDER BY number ASC");

    // ส่งข้อมูลกลับไปเป็น Array ตรงๆ หรือ Object ก็ได้ (Frontend คุณเขียนดักไว้รองรับทั้งคู่แล้ว)
    return NextResponse.json(rows);

  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { message: "Failed to fetch tables", error: error.message },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}