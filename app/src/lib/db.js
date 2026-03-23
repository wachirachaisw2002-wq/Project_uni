import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",

  port: process.env.DB_PORT || 3307,

  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",

  database: process.env.DB_DATABASE || process.env.DB_NAME || "project",
  
  timezone: '+07:00',
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