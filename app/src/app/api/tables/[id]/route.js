import { NextResponse } from "next/server";
import pool from "@/lib/db";

async function getTableData(conn, identifier) {
  // พยายามหาจาก table_id, id หรือ number
  const queries = [
    "SELECT * FROM tables WHERE table_id = ?",
    "SELECT * FROM tables WHERE id = ?",
    "SELECT * FROM tables WHERE number = ?"
  ];
  for (const sql of queries) {
    const [rows] = await conn.query(sql, [identifier]);
    if (rows.length > 0) return rows[0];
  }
  return null;
}

async function updateTableFlexible(conn, setSql, identifier, params = []) {
  const queries = [
    `UPDATE tables SET ${setSql} WHERE table_id = ?`,
    `UPDATE tables SET ${setSql} WHERE id = ?`,
    `UPDATE tables SET ${setSql} WHERE number = ?`
  ];
  for (const sql of queries) {
    const [res] = await conn.query(sql, [...params, identifier]);
    if (res.affectedRows > 0) return true;
  }
  return false;
}

export async function GET(request, context) {
  const { id: rawId } = await context.params;
  const conn = await pool.getConnection();
  try {
    const tableData = await getTableData(conn, rawId);
    if (!tableData) return NextResponse.json({ message: "Table not found" }, { status: 404 });
    return NextResponse.json(tableData);
  } catch (error) {
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  } finally { conn.release(); }
}

export async function PUT(request, context) {
  const { id: rawId } = await context.params;
  const tableId = Number(rawId);
  const { action, status, targetTableId, session_token } = await request.json();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (action === "resetAll") {
      await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0, group_id = NULL, session_token = NULL");
      await conn.query("UPDATE orders SET paid = 1 WHERE paid = 0");
      await conn.commit();
      return NextResponse.json({ ok: true });
    }

    if (!tableId && tableId !== 0) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    if (action === "mergeTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะหลัก");
      const masterTable = await getTableData(conn, targetTableId);
      if (!masterTable) throw new Error("ไม่พบโต๊ะหลัก");

      let groupId = masterTable.group_id || `GRP-${Date.now()}`;
      if (!masterTable.group_id) {
        await updateTableFlexible(conn, "group_id = ?, status = 'มีลูกค้า'", targetTableId, [groupId]);
      }
      await updateTableFlexible(conn, "status = 'มีลูกค้า', group_id = ?", tableId, [groupId]);
    }

    else if (action === "moveTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะปลายทาง");
      const sourceTable = await getTableData(conn, tableId);
      const targetTable = await getTableData(conn, targetTableId);
      if (!sourceTable || !targetTable) throw new Error("ไม่พบข้อมูลโต๊ะ");

      // ย้ายออเดอร์: ใช้ CAST เพื่อป้องกัน Error incorrect DOUBLE value
      await conn.query(
        "UPDATE orders SET table_number = ? WHERE CAST(table_number AS CHAR) = CAST(? AS CHAR) AND paid = 0",
        [targetTable.number, sourceTable.number]
      );

      await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL, session_token = NULL", tableId);
      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = ?, group_id = ?, session_token = ?",
        targetTableId, [sourceTable.order_count || 0, sourceTable.group_id, sourceTable.session_token]);
    }

    else if (action === "unmergeTable") {
      await updateTableFlexible(conn, "group_id = NULL", tableId);
    }

    else if (action === "startOrder") {
      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = 1, group_id = NULL", tableId);
    }

    else if (action === "changeStatus") {
      if (status === "ว่าง") {
        const tData = await getTableData(conn, tableId);
        const ok = await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL, session_token = NULL", tableId);
        if (ok && tData) {
          await conn.query("UPDATE orders SET paid = 1 WHERE CAST(table_number AS CHAR) = CAST(? AS CHAR) AND paid = 0", [tData.number]);
        }
      } else {
        const sql = session_token !== undefined ? "status = ?, session_token = ?" : "status = ?";
        const params = session_token !== undefined ? [status, session_token] : [status];
        await updateTableFlexible(conn, sql, tableId, params);
      }
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    console.error("PUT Table Error:", error);
    return NextResponse.json({ message: error.message || "Server Error" }, { status: 500 });
  } finally { conn.release(); }
}