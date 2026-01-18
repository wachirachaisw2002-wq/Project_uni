import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(request) {
    const conn = await pool.getConnection();
    try {
        const { table_number, menu_id, adjust_qty } = await request.json();

        if (!table_number || !menu_id || adjust_qty === 0) {
            return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        await conn.beginTransaction();

        // 1. หาข้อมูลโต๊ะ และ Group ID
        const [tableRows] = await conn.query(
            "SELECT number, group_id FROM tables WHERE table_id = ? OR number = ? LIMIT 1",
            [table_number, table_number]
        );

        if (tableRows.length === 0) throw new Error(`ไม่พบข้อมูลโต๊ะ: ${table_number}`);
        const { number: tableNum, group_id: groupId } = tableRows[0];

        // 2. ค้นหาออเดอร์ที่ยังไม่จ่าย (รองรับ Group)
        const whereClause = groupId ? "t.group_id = ?" : "o.table_number = ?";
        const searchParam = groupId || tableNum;

        // --- กรณีที่ 1: การลดจำนวน (adjust_qty < 0) ---
        if (adjust_qty < 0) {
            const [items] = await conn.query(`
                SELECT oi.order_item_id, oi.qty, oi.order_id, m.price
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN menus m ON oi.menu_id = m.menu_id
                JOIN tables t ON o.table_number = t.number
                WHERE ${whereClause} AND oi.menu_id = ? AND o.paid = 0
                ORDER BY oi.order_item_id DESC
            `, [searchParam, menu_id]);

            if (items.length === 0) throw new Error("ไม่พบรายการที่จะลดจำนวน");

            let remainToRemove = Math.abs(adjust_qty);
            const affectedOrderIds = new Set();

            for (const item of items) {
                if (remainToRemove <= 0) break;
                affectedOrderIds.add(item.order_id);

                if (item.qty > remainToRemove) {
                    await conn.query("UPDATE order_items SET qty = qty - ? WHERE order_item_id = ?", [remainToRemove, item.order_item_id]);
                    remainToRemove = 0;
                } else {
                    await conn.query("DELETE FROM order_items WHERE order_item_id = ?", [item.order_item_id]);
                    remainToRemove -= item.qty;
                }
            }

            // อัปเดตราคารวมของ Order ที่ได้รับผลกระทบ
            for (const oid of affectedOrderIds) {
                await updateOrderTotal(conn, oid);
            }
        }

        // --- กรณีที่ 2: การเพิ่มจำนวน (adjust_qty > 0) ---
        else {
            // หา Order ล่าสุดของโต๊ะนี้ที่ยังไม่จ่าย
            const [activeOrders] = await conn.query(
                "SELECT order_id FROM orders WHERE table_number = ? AND paid = 0 ORDER BY order_id DESC LIMIT 1",
                [tableNum]
            );

            if (activeOrders.length === 0) throw new Error("ไม่พบออเดอร์ที่กำลังใช้งานอยู่");
            const orderId = activeOrders[0].order_id;

            // ตรวจสอบว่ามีเมนูนี้ในออเดอร์เดิมไหม ถ้ามีให้บวกเพิ่ม ถ้าไม่มีให้ Insert ใหม่
            const [existingItem] = await conn.query(
                "SELECT order_item_id FROM order_items WHERE order_id = ? AND menu_id = ? LIMIT 1",
                [orderId, menu_id]
            );

            if (existingItem.length > 0) {
                await conn.query("UPDATE order_items SET qty = qty + ? WHERE order_item_id = ?", [adjust_qty, existingItem[0].order_item_id]);
            } else {
                await conn.query("INSERT INTO order_items (order_id, menu_id, qty, status) VALUES (?, ?, ?, 'เสิร์ฟแล้ว')", [orderId, menu_id, adjust_qty]);
            }

            await updateOrderTotal(conn, orderId);
        }

        await conn.commit();
        return NextResponse.json({ ok: true, message: "ปรับปรุงข้อมูลสำเร็จ" });

    } catch (error) {
        await conn.rollback();
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        conn.release();
    }
}

// ฟังก์ชันช่วยอัปเดตราคารวมของ Order ให้ถูกต้องแม่นยำ
async function updateOrderTotal(conn, orderId) {
    await conn.query(`
        UPDATE orders o
        SET o.total_price = (
            SELECT COALESCE(SUM(oi.qty * m.price), 0)
            FROM order_items oi
            JOIN menus m ON oi.menu_id = m.menu_id
            WHERE oi.order_id = ?
        )
        WHERE o.order_id = ?
    `, [orderId, orderId]);
}