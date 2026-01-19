import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const [history] = await pool.query(
            "SELECT * FROM employee_workingtime WHERE employee_id = ? ORDER BY work_date DESC, check_in DESC",
            [userId]
        );

        const [activeSession] = await pool.query(
            "SELECT * FROM employee_workingtime WHERE employee_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1",
            [userId]
        );

        const [empRows] = await pool.query(
            "SELECT name_th, nickname, position, id_card_number FROM employees WHERE employee_id = ?",
            [userId]
        );
        const employee = empRows[0] || null;

        return NextResponse.json({
            history,
            isCheckedIn: activeSession.length > 0,
            currentSession: activeSession[0] || null,
            employee
        });

    } catch (error) {
        console.error("Attendance GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const { userId, action, lat, lng, photo } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (action === "check_in") {
            const [existing] = await pool.query(
                "SELECT id FROM employee_workingtime WHERE employee_id = ? AND check_out IS NULL",
                [userId]
            );

            if (existing.length > 0) {
                return NextResponse.json({ error: "คุณได้เข้างานไปแล้ว กรุณาออกงานก่อน" }, { status: 400 });
            }

            await pool.query(
                "INSERT INTO employee_workingtime (employee_id, check_in, work_date, latitude, longitude, check_in_photo) VALUES (?, NOW(), CURDATE(), ?, ?, ?)",
                [userId, lat, lng, photo]
            );

            return NextResponse.json({ message: "เข้างานสำเร็จ" });

        } else if (action === "check_out") {

            const [result] = await pool.query(
                "UPDATE employee_workingtime SET check_out = NOW() WHERE employee_id = ? AND check_out IS NULL",
                [userId]
            );

            if (result.affectedRows === 0) {
                return NextResponse.json({ error: "ไม่พบรายการเข้างาน หรือคุณออกงานไปแล้ว" }, { status: 400 });
            }

            return NextResponse.json({ message: "ออกงานสำเร็จ" });
        }

    } catch (error) {
        console.error("Attendance POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}