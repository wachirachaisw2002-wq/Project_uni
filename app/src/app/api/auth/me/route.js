import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employee_id")?.value;

    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ จุดที่แก้: 
    // 1. เปลี่ยน name เป็น name_th as name
    // 2. เพิ่ม nickname และ position (มีประโยชน์มากสำหรับการเช็คสิทธิ์แอดมิน)
    const [rows] = await pool.query(
      `SELECT 
        employee_id, 
        name_th as name, 
        nickname,
        email, 
        position 
       FROM employees WHERE employee_id = ?`,
      [employeeId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const me = rows[0];

    return NextResponse.json({
      employee_id: me.employee_id,
      name: me.name,         // คือ name_th
      nickname: me.nickname, // ส่งชื่อเล่นไปด้วย
      email: me.email,
      position: me.position, // ส่งตำแหน่งไปด้วย (สำคัญ)
    });

  } catch (err) {
    console.error("❌ /auth/me error:", err);
    return NextResponse.json(
      { error: "ไม่สามารถตรวจสอบสิทธิ์ได้", detail: err.message },
      { status: 500 }
    );
  }
}