import { NextResponse } from "next/server";
import pool from "@/lib/db";

// 1. เพิ่ม GET method เพื่อให้ Frontend เรียกมาตรวจสอบ Token ได้
export async function GET() {
    try {
        // ดึงเฉพาะรายการที่สถานะยังเป็น ACTIVE
        const [rows] = await pool.query(
            `SELECT * FROM takeaways WHERE status = 'ACTIVE'`
        );
        return NextResponse.json({ takeaways: rows });
    } catch (error) {
        console.error("Takeaway Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { customerName, customerPhone } = body;

        if (!customerName) {
            return NextResponse.json({ error: "กรุณาระบุชื่อลูกค้า" }, { status: 400 });
        }

        // สร้าง session_token แบบสุ่ม (ตัวเลขผสมตัวอักษร เหมือนในรูปภาพ เช่น mn3t6vbudtaew5)
        const generateToken = () => Math.random().toString(36).substring(2, 15);
        const sessionToken = generateToken();

        // เปลี่ยนไป Insert ลงตาราง takeaways
        const [result] = await pool.query(
            `INSERT INTO takeaways (customer_name, customer_phone, status, session_token, created_at) 
             VALUES (?, ?, 'ACTIVE', ?, NOW())`,
            [customerName, customerPhone || null, sessionToken]
        );

        // ส่งคืน orderId และ sessionToken กลับไปให้ฝั่ง POS ใช้สร้าง QR Code
        return NextResponse.json({ 
            ok: true, 
            orderId: result.insertId,
            sessionToken: sessionToken 
        });
    } catch (error) {
        console.error("Takeaway Create Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ error: "ไม่พบรหัสบิล" }, { status: 400 });
        }

        // เปลี่ยนเป้าหมายการลบเป็นตาราง takeaways
        await pool.query(
            `DELETE FROM takeaways WHERE order_id = ?`,
            [orderId]
        );

        // หมายเหตุ: หรือถ้าไม่อยากลบข้อมูลทิ้ง แต่แค่ยกเลิก 
        // สามารถเปลี่ยนเป็น UPDATE takeaways SET status = 'CANCELLED' WHERE order_id = ? ก็ได้ครับ

        return NextResponse.json({ ok: true, message: "ยกเลิกออเดอร์กลับบ้านสำเร็จ" });
    } catch (error) {
        console.error("Takeaway Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}