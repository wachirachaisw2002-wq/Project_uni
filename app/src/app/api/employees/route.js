import { NextResponse } from "next/server";
import pool from "@/lib/db";
// import bcrypt from "bcrypt"; // แนะนำให้ใช้สำหรับการ hash password

export async function GET() {
    try {
        const [rows] = await pool.query("SELECT * FROM employees ORDER BY created_at DESC");
        return NextResponse.json(rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            name_th, name_en, nickname, birth_date, address, phone, line_id,
            email, password, position, employment_type, start_date, shift_availability, status, salary
        }
            = body;

        // TODO: ควร Hash Password ตรงนี้ก่อนบันทึก (เช่นใช้ bcrypt)
        // const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
      INSERT INTO employees (
        name_th, name_en, nickname, birth_date, address, phone, line_id,
        email, password, position, employment_type, start_date, shift_availability, status, salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            name_th, name_en || null, nickname, birth_date || null, address || null, phone, line_id || null,
            email, password, position, employment_type, start_date || null, shift_availability || null, status, salary
        ];

        const [result] = await pool.query(sql, values);

        return NextResponse.json({ id: result.insertId, message: "เพิ่มพนักงานสำเร็จ" }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}