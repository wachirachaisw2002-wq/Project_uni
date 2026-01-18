import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request, { params }) {
  try {
    // 1. ใส่ await params (แก้ Error Next.js 15)
    const { id } = await params;

    // 2. แก้ SQL: ดึง name_th แต่ตั้งชื่อเล่นว่า name (as name) 
    // เพื่อให้ Sidebar เอาไปแสดงผลได้เลยโดยไม่ต้องแก้โค้ด Sidebar
    const [rows] = await pool.query(
      `SELECT 
        employee_id, 
        name_th as name, 
        email, 
        phone, 
        position, 
        status, 
        salary
       FROM employees
       WHERE employee_id = ?`, 
       [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}