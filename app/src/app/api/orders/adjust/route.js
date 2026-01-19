import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(request) {
    const conn = await pool.getConnection();
    try {
        const { table_number, menu_id, adjust_qty, order_id } = await request.json();

        if ((!table_number && !order_id) || !menu_id || adjust_qty === 0) {
            return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        await conn.beginTransaction();

        let targetOrderIds = [];

        if (order_id) {
            targetOrderIds.push(order_id);
            const [check] = await conn.query("SELECT order_id FROM orders WHERE order_id = ?", [order_id]);
            if (check.length === 0) throw new Error(`ไม่พบออเดอร์ ID: ${order_id}`);
        } else {
            const [tableRows] = await conn.query(
                "SELECT number, group_id FROM tables WHERE table_id = ? OR number = ? LIMIT 1",
                [table_number, table_number]
            );

            if (tableRows.length === 0) throw new Error(`ไม่พบข้อมูลโต๊ะ: ${table_number}`);
            const { number: tableNum, group_id: groupId } = tableRows[0];

            const whereClause = groupId ? "t.group_id = ?" : "o.table_number = ?";
            const searchParam = groupId || tableNum;

            const [orders] = await conn.query(`
                SELECT o.order_id 
                FROM orders o
                LEFT JOIN tables t ON o.table_number = t.number
                WHERE ${whereClause} AND o.paid = 0
            `, [searchParam]);

            if (orders.length === 0) throw new Error("ไม่พบออเดอร์ที่กำลังใช้งานอยู่");
            targetOrderIds = orders.map(row => row.order_id);
        }

        if (adjust_qty < 0) {
            const [items] = await conn.query(`
                SELECT order_item_id, qty, order_id 
                FROM order_items 
                WHERE order_id IN (?) AND menu_id = ? AND (status != 'ยกเลิก' OR status IS NULL)
                ORDER BY order_item_id DESC
            `, [targetOrderIds, menu_id]);

            if (items.length === 0) throw new Error("ไม่พบรายการที่จะลดจำนวน");

            let remainToRemove = Math.abs(adjust_qty);

            for (const item of items) {
                if (remainToRemove <= 0) break;

                if (item.qty > remainToRemove) {
                    await conn.query("UPDATE order_items SET qty = qty - ? WHERE order_item_id = ?", [remainToRemove, item.order_item_id]);
                    remainToRemove = 0;
                } else {

                    await conn.query("UPDATE order_items SET status = 'ยกเลิก' WHERE order_item_id = ?", [item.order_item_id]);
                    remainToRemove -= item.qty;
                }
            }
        } else {
            const targetId = targetOrderIds[targetOrderIds.length - 1];

            const [existingItem] = await conn.query(
                "SELECT order_item_id FROM order_items WHERE order_id = ? AND menu_id = ? AND (status != 'ยกเลิก' OR status IS NULL) LIMIT 1",
                [targetId, menu_id]
            );

            if (existingItem.length > 0) {
                await conn.query("UPDATE order_items SET qty = qty + ? WHERE order_item_id = ?", [adjust_qty, existingItem[0].order_item_id]);
            } else {
                await conn.query("INSERT INTO order_items (order_id, menu_id, qty, status) VALUES (?, ?, ?, 'เสิร์ฟแล้ว')", [targetId, menu_id, adjust_qty]);
            }
        }

        for (const oid of targetOrderIds) {
            await updateOrderTotal(conn, oid);
        }

        await conn.commit();
        return NextResponse.json({ ok: true, message: "ปรับปรุงข้อมูลสำเร็จ" });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        conn.release();
    }
}

async function updateOrderTotal(conn, orderId) {
    await conn.query(`
        UPDATE orders o
        SET o.total_price = (
            SELECT COALESCE(SUM(oi.qty * m.price), 0)
            FROM order_items oi
            JOIN menus m ON oi.menu_id = m.menu_id
            WHERE oi.order_id = ? 
            AND (oi.status != 'ยกเลิก' OR oi.status IS NULL) -- เพิ่มเงื่อนไขนี้
        )
        WHERE o.order_id = ?
    `, [orderId, orderId]);
}