import { NextResponse } from "next/server";
import pool from "@/lib/db"; // ตรวจสอบ path ของ db connection ให้ถูกต้อง

// GET: ดึงข้อมูลเมนูทั้งหมด
export async function GET() {
  try {
    // [UPDATE] เพิ่ม type ใน SELECT
    const [rows] = await pool.query(
      "SELECT menu_id, name, price, category, image, type FROM menus ORDER BY category ASC, name ASC"
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: เพิ่มเมนูใหม่
export async function POST(request) {
  try {
    const body = await request.json();
    // [UPDATE] รับค่า type มาจาก frontend
    const { name, price, category, image, type } = body;

    if (!name || price === undefined || price === null || !category) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ (ชื่อ, ราคา, หมวดหมู่)" },
        { status: 400 }
      );
    }

    // กำหนดค่า Default เป็น 'cooked' ถ้าไม่ได้ส่งมา
    const menuType = type || 'cooked';

    // [UPDATE] เพิ่ม type ลงใน SQL INSERT
    const [result] = await pool.query(
      "INSERT INTO menus (name, price, category, image, type) VALUES (?, ?, ?, ?, ?)",
      [name, price, category, image || "", menuType]
    );

    return NextResponse.json(
      {
        menu_id: result.insertId,
        name,
        price,
        category,
        image: image || "",
        type: menuType,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: แก้ไขเมนูเดิม
export async function PUT(request) {
  try {
    const body = await request.json();
    const menu_id = body.menu_id ?? body.id;
    // [UPDATE] รับค่า type
    const { name, price, category, image, type } = body;

    if (!menu_id || !name || price === undefined || price === null || !category) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (ต้องมี menu_id, ชื่อ, ราคา, หมวดหมู่)" },
        { status: 400 }
      );
    }

    // กำหนดค่า Default เป็น 'cooked' ป้องกันค่า null
    const menuType = type || 'cooked';

    // [UPDATE] เพิ่ม type ลงใน SQL UPDATE
    const [result] = await pool.query(
      "UPDATE menus SET name=?, price=?, category=?, image=?, type=? WHERE menu_id=?",
      [name, price, category, image || "", menuType, menu_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "ไม่พบเมนูที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({
      menu_id,
      name,
      price,
      category,
      image: image || "",
      type: menuType,
      message: "แก้ไขสำเร็จ"
    });
  } catch (error) {
    console.error("PUT /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: ลบเมนู (ส่วนนี้เหมือนเดิม ไม่ต้องแก้ SQL)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const menu_id = searchParams.get("menu_id");

    if (!menu_id) {
      return NextResponse.json(
        { error: "กรุณาระบุ menu_id ที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const [result] = await pool.query("DELETE FROM menus WHERE menu_id = ?", [
      menu_id,
    ]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "ไม่พบเมนูนี้ หรือถูกลบไปแล้ว" }, { status: 404 });
    }

    return NextResponse.json({ message: "ลบเมนูเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("DELETE /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}