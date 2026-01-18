import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { email, password } = await req.json();

  try {
    // ✅ จุดที่แก้: เปลี่ยน name เป็น name_th as name
    const [rows] = await pool.query(
      "SELECT employee_id, name_th as name, password FROM employees WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "ไม่พบข้อมูลผู้ใช้" }, { status: 401 });
    }

    const user = rows[0];

    // (หมายเหตุ: ในอนาคตควรใช้ bcrypt.compare() แทนการเช็คสดแบบนี้นะครับ)
    if (password !== user.password) {
      return NextResponse.json({ message: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const res = NextResponse.json({ id: user.employee_id, email, name: user.name });
    const oneDay = 60 * 60 * 24;

    res.cookies.set({
      name: "employee_id",
      value: String(user.employee_id),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: oneDay,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Database error" }, { status: 500 });
  }
}