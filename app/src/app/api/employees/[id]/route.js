// ไฟล์: src/app/api/employees/[id]/route.js

import { NextResponse } from "next/server";
import pool from "@/lib/db";

// แก้ไขข้อมูลพนักงาน (PUT)
export async function PUT(request, { params }) {
  try {
    // ---------------------------------------------------------
    // ❌ ของเดิม: const { id } = params;
    // ✅ ต้องแก้เป็น: ใส่ await
    const { id } = await params;
    // ---------------------------------------------------------

    const body = await request.json();

    const {
      name_th, name_en, nickname, birth_date, address, phone, line_id,
      email, password, position, employment_type, start_date, shift_availability, status, salary
    } = body;

    let sql = `
      UPDATE employees SET 
      name_th=?, name_en=?, nickname=?, birth_date=?, address=?, phone=?, line_id=?,
      email=?, position=?, employment_type=?, start_date=?, shift_availability=?, status=?, salary=?
    `;

    let values = [
      name_th, name_en, nickname, birth_date, address, phone, line_id,
      email, position, employment_type, start_date, shift_availability, status, salary
    ];

    if (password && password.trim() !== "") {
      sql += `, password=?`;
      values.push(password);
    }

    sql += ` WHERE employee_id = ?`;
    values.push(id);

    await pool.query(sql, values);

    return NextResponse.json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ลบพนักงาน (DELETE)
export async function DELETE(request, { params }) {
  try {
    // ---------------------------------------------------------
    // ✅ ต้องแก้เป็น: ใส่ await เช่นกัน
    const { id } = await params;
    // ---------------------------------------------------------

    await pool.query("DELETE FROM employees WHERE employee_id = ?", [id]);
    return NextResponse.json({ message: "ลบพนักงานสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}