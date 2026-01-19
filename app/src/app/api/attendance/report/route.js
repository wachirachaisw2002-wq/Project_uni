import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month"); 
    const year = searchParams.get("year");

    let sql = `
      SELECT 
        w.id,
        w.work_date,
        w.check_in,
        w.check_out,
        w.latitude,
        w.longitude,
        w.check_in_photo,
        e.name_th,
        e.nickname,
        e.position,
        e.employee_id
      FROM employee_workingtime w
      JOIN employees e ON w.employee_id = e.employee_id
      WHERE 1=1
    `;

    const params = [];

    if (employeeId && employeeId !== "all") {
      sql += " AND w.employee_id = ?";
      params.push(employeeId);
    }

    if (month) {
      sql += " AND DATE_FORMAT(w.work_date, '%Y-%m') = ?";
      params.push(month);
    }

    sql += " ORDER BY w.work_date DESC, w.check_in DESC";

    const [rows] = await pool.query(sql, params);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}