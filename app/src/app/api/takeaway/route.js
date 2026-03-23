import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request) {
    try {
        const body = await request.json();
        const { customerName, customerPhone } = body;

        if (!customerName) {
            return NextResponse.json({ error: "กรุณาระบุชื่อลูกค้า" }, { status: 400 });
        }

        const [result] = await pool.query(
            `INSERT INTO orders (table_number, order_type, customer_name, customer_phone, total_price, paid, created_at) 
       VALUES ('-', 'TAKEAWAY', ?, ?, 0, 0, NOW())`,
            [customerName, customerPhone || null]
        );
        return NextResponse.json({ ok: true, orderId: result.insertId });
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

        await pool.query(
            `DELETE FROM orders WHERE order_id = ? AND (order_type = 'TAKEAWAY' OR order_type = 'takeout')`,
            [orderId]
        );

        return NextResponse.json({ ok: true, message: "ยกเลิกบิลสำเร็จ" });
    } catch (error) {
        console.error("Takeaway Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}