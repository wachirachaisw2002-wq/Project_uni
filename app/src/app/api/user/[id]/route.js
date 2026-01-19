import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

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