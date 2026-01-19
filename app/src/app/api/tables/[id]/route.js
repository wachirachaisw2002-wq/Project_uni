import { NextResponse } from "next/server";
import pool from "@/lib/db";

async function getTableData(conn, identifier) {
  let [rows] = await conn.query("SELECT * FROM tables WHERE table_id = ?", [identifier]);
  if (rows.length > 0) return rows[0];

  [rows] = await conn.query("SELECT * FROM tables WHERE id = ?", [identifier]);
  if (rows.length > 0) return rows[0];

  [rows] = await conn.query("SELECT * FROM tables WHERE number = ?", [identifier]);
  if (rows.length > 0) return rows[0];

  return null;
}

async function updateTableFlexible(conn, setSql, identifier, params = []) {
  let [res] = await conn.query(`UPDATE tables SET ${setSql} WHERE table_id = ?`, [...params, identifier]);
  if (res.affectedRows > 0) return true;

  [res] = await conn.query(`UPDATE tables SET ${setSql} WHERE id = ?`, [...params, identifier]);
  if (res.affectedRows > 0) return true;

  [res] = await conn.query(`UPDATE tables SET ${setSql} WHERE number = ?`, [...params, identifier]);
  if (res.affectedRows > 0) return true;

  return false;
}

export async function GET(request, context) {
  const { id: rawId } = await context.params;
  const conn = await pool.getConnection();

  try {
    const tableData = await getTableData(conn, rawId);

    if (!tableData) {
      return NextResponse.json({ message: "Table not found" }, { status: 404 });
    }

    return NextResponse.json(tableData);
  } catch (error) {
    console.error("GET Table Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function PUT(request, context) {
  const { id: rawId } = await context.params;
  const tableId = Number(rawId);
  const { action, status, targetTableId } = await request.json();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (action === "resetAll" || (tableId === 0 && action === "resetAll")) {
      await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0, group_id = NULL");
      await conn.query("UPDATE orders SET paid = 1 WHERE paid = 0 AND order_type = 'DINE_IN'");
      
      await conn.commit();
      return NextResponse.json({ ok: true });
    }

    if (!tableId) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    if (action === "mergeTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะหลัก");

      const masterTable = await getTableData(conn, targetTableId);
      if (!masterTable) throw new Error("ไม่พบโต๊ะหลัก");

      let groupId = masterTable.group_id;
      if (!groupId) {
        groupId = `GRP-${Date.now()}`;
        await updateTableFlexible(conn, "group_id = ?, status = 'มีลูกค้า'", targetTableId, [groupId]);
      }
      await updateTableFlexible(conn, "status = 'มีลูกค้า', group_id = ?", tableId, [groupId]);
    }

    else if (action === "moveTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะปลายทาง");

      const sourceTable = await getTableData(conn, tableId);
      const targetTable = await getTableData(conn, targetTableId);

      if (!sourceTable || !targetTable) throw new Error("ไม่พบข้อมูลโต๊ะ");

      await conn.query("UPDATE orders SET table_number = ? WHERE table_number = ? AND paid = 0", [targetTable.number, sourceTable.number]);

      await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL", tableId);

      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = ?, group_id = ?", targetTableId, [sourceTable.order_count || 0, sourceTable.group_id]);
    }

    else if (action === "unmergeTable") {
      await updateTableFlexible(conn, "group_id = NULL", tableId);
    }

    else if (action === "startOrder") {
      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = 1, group_id = NULL", tableId);
    }

    else if (action === "addOrder") {
      await updateTableFlexible(conn, "order_count = order_count + 1", tableId);
    }

    else if (action === "changeStatus") {
      if (status === "ว่าง") {
        const ok = await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL", tableId);
        if (ok) {
          const tData = await getTableData(conn, tableId);
          if (tData) await conn.query("UPDATE orders SET paid = 1 WHERE table_number = ? AND paid = 0", [tData.number]);
        }
      } else {
        await updateTableFlexible(conn, "status = ?", tableId, [status]);
      }
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  } finally {
    conn.release();
  }
}