import { NextResponse } from "next/server";
import pool from "@/lib/db";

const getThaiDateTime = (dateObj) => {
    const thaiTime = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
    return thaiTime.toISOString().slice(0, 19).replace('T', ' ');
};

const getThaiDateOnly = (dateObj) => {
    const thaiTime = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
    return thaiTime.toISOString().slice(0, 10);
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const [empRows] = await pool.query(
            "SELECT name_th, nickname, position, id_card_number FROM employees WHERE employee_id = ?",
            [userId]
        );
        const employee = empRows[0] || null;

        const [shopRows] = await pool.query("SELECT * FROM location_shop LIMIT 1");
        const shopConfig = shopRows[0] || null;

        const [history] = await pool.query(
            "SELECT * FROM employee_workingtime WHERE employee_id = ? ORDER BY work_date DESC, check_in DESC",
            [userId]
        );
        const [activeSession] = await pool.query(
            "SELECT * FROM employee_workingtime WHERE employee_id = ? AND check_out IS NULL AND type = 'work' ORDER BY check_in DESC LIMIT 1",
            [userId]
        );

        let pendingLeaves = [];
        const isManagerOrOwner = employee && (employee.position === "เจ้าของร้าน" || employee.position === "ผู้จัดการร้าน");

        if (isManagerOrOwner) {
            const [leaves] = await pool.query(`
                SELECT t.*, e.name_th as employee_name 
                FROM employee_workingtime t
                JOIN employees e ON t.employee_id = e.employee_id
                WHERE t.type = 'leave' AND (t.leave_status = 'pending' OR t.leave_status IS NULL)
                ORDER BY t.work_date ASC
            `);
            pendingLeaves = leaves;
        }

        return NextResponse.json({
            history,
            pendingLeaves, 
            isCheckedIn: activeSession.length > 0,
            currentSession: activeSession[0] || null,
            employee,
            shopConfig
        });

    } catch (error) {
        console.error("Attendance GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            userId, action, lat, lng, photo, timestamp,
            workStartTime, workEndTime, updatedBy,
            date, leaveType, reason, recordId, status
        } = body;

        if (!action) {
            return NextResponse.json({ error: "Missing action field" }, { status: 400 });
        }

        const dateObj = timestamp ? new Date(timestamp) : new Date();
        const recordTime = getThaiDateTime(dateObj);
        const recordDate = getThaiDateOnly(dateObj);

        if (action === "check_in") {
            if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

            const [activeSession] = await pool.query(
                "SELECT id FROM employee_workingtime WHERE employee_id = ? AND check_out IS NULL AND type = 'work'",
                [userId]
            );

            if (activeSession.length > 0) {
                return NextResponse.json({ error: "คุณมีรายการค้างที่ยังไม่ออกงาน กรุณาออกงานก่อน" }, { status: 400 });
            }

            const [todayRecord] = await pool.query(
                "SELECT id FROM employee_workingtime WHERE employee_id = ? AND work_date = ? AND type = 'work'",
                [userId, recordDate]
            );

            if (todayRecord.length > 0) {
                return NextResponse.json({ error: "คุณได้ลงเวลาเข้างานสำหรับวันนี้ไปแล้ว" }, { status: 400 });
            }

            await pool.query(
                "INSERT INTO employee_workingtime (employee_id, check_in, work_date, latitude, longitude, check_in_photo, type) VALUES (?, ?, ?, ?, ?, ?, 'work')",
                [userId, recordTime, recordDate, lat, lng, photo]
            );

            return NextResponse.json({ message: "เข้างานสำเร็จ" });
        }

        else if (action === "check_out") {
            if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

            const [result] = await pool.query(
                "UPDATE employee_workingtime SET check_out = ? WHERE employee_id = ? AND check_out IS NULL AND type = 'work'",
                [recordTime, userId]
            );

            if (result.affectedRows === 0) {
                return NextResponse.json({ error: "ไม่พบรายการเข้างาน หรือคุณออกงานไปแล้ว" }, { status: 400 });
            }

            return NextResponse.json({ message: "ออกงานสำเร็จ" });
        }

        else if (action === "update_location") {
            if (!lat || !lng) {
                return NextResponse.json({ error: "Missing latitude or longitude" }, { status: 400 });
            }

            await pool.query(
                "UPDATE location_shop SET latitude = ?, longitude = ?, work_start_time = ?, work_end_time = ?, updated_by = ? WHERE id = 1",
                [lat, lng, workStartTime, workEndTime, updatedBy]
            );

            return NextResponse.json({ message: "อัปเดตการตั้งค่าพิกัดร้านสำเร็จ" });
        }

        else if (action === "leave_request") {
            if (!userId || !date || !leaveType) {
                return NextResponse.json({ error: "ข้อมูลการลาไม่ครบถ้วน" }, { status: 400 });
            }

            const [existingLeave] = await pool.query(
                "SELECT id FROM employee_workingtime WHERE employee_id = ? AND work_date = ? AND type = 'leave'",
                [userId, date]
            );

            if (existingLeave.length > 0) {
                return NextResponse.json({ error: "คุณได้ส่งคำขอลาในวันที่ระบุไปแล้ว" }, { status: 400 });
            }

            await pool.query(
                "INSERT INTO employee_workingtime (employee_id, work_date, type, leave_type, reason, leave_status) VALUES (?, ?, 'leave', ?, ?, 'pending')",
                [userId, date, leaveType, reason]
            );

            return NextResponse.json({ message: "ส่งคำขอลาสำเร็จ" });
        }

        else if (action === "update_leave_status") {
            if (!recordId || !status) {
                return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (recordId หรือ status ขาดหาย)" }, { status: 400 });
            }

            const [result] = await pool.query(
                "UPDATE employee_workingtime SET leave_status = ? WHERE id = ?",
                [status, recordId]
            );

            if (result.affectedRows === 0) {
                return NextResponse.json({ error: "ไม่พบคำขอลานี้ในระบบ" }, { status: 404 });
            }

            return NextResponse.json({ message: "อัปเดตสถานะการลาสำเร็จ" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Attendance POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}