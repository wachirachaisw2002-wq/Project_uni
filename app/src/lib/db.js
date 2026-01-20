import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",

  // ✅ จุดที่ 1: ต้องเพิ่มบรรทัดนี้ เพื่อให้ connect เข้า Docker ได้
  port: process.env.DB_PORT || 3307,

  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",

  // ✅ จุดที่ 2: ตรวจสอบว่าในไฟล์ .env คุณใช้ชื่อ DB_DATABASE หรือ DB_NAME
  // ถ้าใน .env ใช้ DB_NAME ให้แก้ตรงนี้เป็น process.env.DB_NAME
  database: process.env.DB_DATABASE || process.env.DB_NAME || "project",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * @param {string} sql 
 * @param {array} values 
 */
export async function query(sql, values) {
  try {
    const [results] = await pool.execute(sql, values);
    return results;
  } catch (error) {
    console.error("SQL Error:", error);
    throw error;
  }
}

export default pool;