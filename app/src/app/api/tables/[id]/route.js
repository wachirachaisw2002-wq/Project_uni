import { NextResponse } from "next/server";
import pool from "@/lib/db";

// --- Helper Functions ---
async function getTableData(conn, identifier) {
  // ลองหาด้วย table_id
  let [rows] = await conn.query("SELECT * FROM tables WHERE table_id = ?", [identifier]);
  if (rows.length > 0) return rows[0];

  // ลองหาด้วย id
  [rows] = await conn.query("SELECT * FROM tables WHERE id = ?", [identifier]);
  if (rows.length > 0) return rows[0];

  // ลองหาด้วย number
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

// --- ✅ ส่วนที่ 1: GET Method (เพิ่มใหม่) ---
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

// --- ✅ ส่วนที่ 2: PUT Method (Logic เดิม + ปรับปรุง) ---
export async function PUT(request, context) {
  const { id: rawId } = await context.params;
  const tableId = Number(rawId);
  const { action, status, targetTableId } = await request.json();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Reset All
    if (action === "resetAll" || (tableId === 0 && action === "resetAll")) {
      await conn.query("UPDATE tables SET status = 'ว่าง', order_count = 0, group_id = NULL");
      await conn.query("UPDATE orders SET paid = 1 WHERE paid = 0");
      await conn.commit();
      return NextResponse.json({ ok: true });
    }

    if (!tableId) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    // --- Merge Table (รวมโต๊ะ) ---
    if (action === "mergeTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะหลัก");

      // 1. ดึงข้อมูลโต๊ะหลัก (Master)
      const masterTable = await getTableData(conn, targetTableId);
      if (!masterTable) throw new Error("ไม่พบโต๊ะหลัก");

      // 2. จัดการ Group ID
      let groupId = masterTable.group_id;
      if (!groupId) {
        groupId = `GRP-${Date.now()}`;
        // อัปเดตโต๊ะหลักให้มี Group ID และสถานะ 'มีลูกค้า' (เผื่อเป็นโต๊ะว่าง)
        await updateTableFlexible(conn, "group_id = ?, status = 'มีลูกค้า'", targetTableId, [groupId]);
      }

      // 3. เอาโต๊ะที่ถูกเลือก (Source) ไปใส่ Group ID เดียวกัน + เปลี่ยนสถานะ
      await updateTableFlexible(conn, "status = 'มีลูกค้า', group_id = ?", tableId, [groupId]);
    }

    // --- Move Table (ย้ายโต๊ะ) ---
    else if (action === "moveTable") {
      if (!targetTableId) throw new Error("ระบุโต๊ะปลายทาง");

      const sourceTable = await getTableData(conn, tableId);
      const targetTable = await getTableData(conn, targetTableId);

      if (!sourceTable || !targetTable) throw new Error("ไม่พบข้อมูลโต๊ะ");

      // ย้ายออเดอร์
      await conn.query("UPDATE orders SET table_number = ? WHERE table_number = ? AND paid = 0", [targetTable.number, sourceTable.number]);

      // เคลียร์โต๊ะเก่า
      await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL", tableId);

      // เปิดโต๊ะใหม่ (ย้าย Group ID ไปด้วย ถ้ามี)
      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = ?, group_id = ?", targetTableId, [sourceTable.order_count || 0, sourceTable.group_id]);
    }

    // --- Unmerge (แยกโต๊ะ) ---
    else if (action === "unmergeTable") {
      await updateTableFlexible(conn, "group_id = NULL", tableId);
    }

    // --- Start Order ---
    else if (action === "startOrder") {
      await updateTableFlexible(conn, "status = 'มีลูกค้า', order_count = 1, group_id = NULL", tableId);
    }

    // --- Add Order ---
    else if (action === "addOrder") {
      await updateTableFlexible(conn, "order_count = order_count + 1", tableId);
    }

    // --- Change Status (Manual / Clear) ---
    else if (action === "changeStatus") {
      if (status === "ว่าง") {
        const ok = await updateTableFlexible(conn, "status = 'ว่าง', order_count = 0, group_id = NULL", tableId);
        // Fallback: ถ้าเคลียร์โต๊ะ ให้ตัดจบออเดอร์ด้วย (เผื่อกรณีไม่ได้ผ่านหน้า Billing)
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