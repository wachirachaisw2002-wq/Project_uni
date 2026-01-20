// app/api/menu/route.js

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // ✅ เพิ่ม available ในการ Select
    const [rows] = await pool.query(
      "SELECT menu_id, name, price, category, image, type, available FROM menus ORDER BY category ASC, name ASC"
    );

    // ✅ (Optional) แปลงค่า 1/0 จาก Database ให้เป็น true/false เพื่อให้ Frontend ใช้ง่าย
    const menus = rows.map(menu => ({
      ...menu,
      available: menu.available === 1 || menu.available === true
    }));

    return NextResponse.json(menus);
  } catch (error) {
    console.error("GET /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    // ✅ รับค่า available จาก body
    const { name, price, category, image, type, available } = body;

    if (!name || price === undefined || price === null || !category) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ (ชื่อ, ราคา, หมวดหมู่)" },
        { status: 400 }
      );
    }

    const menuType = type || 'cooked';
    // ✅ กำหนด Default เป็น true ถ้าไม่ได้ส่งมา
    const isAvailable = available !== false;

    // ✅ เพิ่ม available ลงในคำสั่ง INSERT
    const [result] = await pool.query(
      "INSERT INTO menus (name, price, category, image, type, available) VALUES (?, ?, ?, ?, ?, ?)",
      [name, price, category, image || "", menuType, isAvailable]
    );

    return NextResponse.json(
      {
        menu_id: result.insertId,
        name,
        price,
        category,
        image: image || "",
        type: menuType,
        available: isAvailable, // ✅ ส่งค่ากลับไป
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const menu_id = body.menu_id ?? body.id;
    // ✅ รับค่า available จาก body
    const { name, price, category, image, type, available } = body;

    if (!menu_id || !name || price === undefined || price === null || !category) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (ต้องมี menu_id, ชื่อ, ราคา, หมวดหมู่)" },
        { status: 400 }
      );
    }

    const menuType = type || 'cooked';

    // ✅ เพิ่ม available ลงในคำสั่ง UPDATE
    const [result] = await pool.query(
      "UPDATE menus SET name=?, price=?, category=?, image=?, type=?, available=? WHERE menu_id=?",
      [name, price, category, image || "", menuType, available, menu_id]
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
      available, // ✅ ส่งค่ากลับไป
      message: "แก้ไขสำเร็จ"
    });
  } catch (error) {
    console.error("PUT /menu error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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