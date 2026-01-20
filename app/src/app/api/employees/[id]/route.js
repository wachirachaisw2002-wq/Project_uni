import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE employee_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 });
    }

    const employee = rows[0];

    delete employee.password; 

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" }, { status: 500 });
  }
}


export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    const body = await request.json();

    const {
      name_th, name_en, nickname, birth_date, address, phone, line_id,
      email, password, position, employment_type, start_date, 
      shift_availability, status, salary, id_card_number 
    } = body;

    let sql = `
      UPDATE employees SET 
      name_th=?, name_en=?, nickname=?, birth_date=?, address=?, phone=?, line_id=?,
      email=?, position=?, employment_type=?, start_date=?, shift_availability=?, 
      status=?, salary=?, id_card_number=?
    `;

    let values = [
      name_th, name_en, nickname, birth_date, address, phone, line_id,
      email, position, employment_type, start_date, shift_availability, 
      status, salary, id_card_number
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
    console.error("Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await pool.query("DELETE FROM employees WHERE employee_id = ?", [id]);
    return NextResponse.json({ message: "ลบพนักงานสำเร็จ" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}