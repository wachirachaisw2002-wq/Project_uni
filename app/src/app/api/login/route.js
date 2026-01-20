import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { email, password } = await req.json();

  try {
    // 1. ดึงข้อมูลพนักงาน รวมถึง status และ position
    const [rows] = await pool.query(
      "SELECT employee_id, name_th as name, password, position, status FROM employees WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "ไม่พบข้อมูลผู้ใช้" }, { status: 401 });
    }

    const user = rows[0];

    // 2. เช็คสถานะการทำงาน (ต้องเป็น 'ทำงานอยู่' เท่านั้น)
    if (user.status !== 'ทำงานอยู่') {
      return NextResponse.json({ message: "บัญชีของคุณถูกระงับหรือไม่ได้ทำงานแล้ว" }, { status: 403 });
    }

    // 3. เช็ครหัสผ่าน
    if (password !== user.password) {
      return NextResponse.json({ message: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // 4. เตรียมข้อมูลส่งกลับ (เพิ่ม position ไปด้วย)
    const res = NextResponse.json({ 
      id: user.employee_id, 
      email, 
      name: user.name,
      position: user.position 
    });
    
    // ตั้งค่า Cookie (เพื่อให้ Session จำได้ 1 วัน)
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