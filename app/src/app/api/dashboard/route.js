import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

// ฟังก์ชันคำนวณวันทำงานที่ควรจะเป็น (หักวันจันทร์ และไม่นับวันในอนาคต)
const getExpectedWorkDays = (range) => {
  const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  const now = new Date(todayStr);
  now.setHours(0, 0, 0, 0);

  let startDate = new Date(now.getTime());

  if (range === 'week') {
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // ให้วันจันทร์เป็นเริ่มสัปดาห์
    startDate.setDate(diff);
  } else if (range === 'month') {
    startDate.setDate(1);
  }

  let expected = 0;
  let curr = new Date(startDate.getTime());

  while (curr <= now) {
    if (curr.getDay() !== 1) { // 1 = วันจันทร์ (ถ้าไม่ใช่วันจันทร์ ให้นับเป็นวันทำงาน)
      expected++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return expected;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "today";

  let tCondBills = "DATE(created_at) = CURDATE()";
  let tCondOrders = "DATE(o.created_at) = CURDATE()";
  let tCondWork = "DATE(work_date) = CURDATE()";

  if (timeRange === "week") {
    tCondBills = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
    tCondOrders = "YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)";
    tCondWork = "YEARWEEK(work_date, 1) = YEARWEEK(CURDATE(), 1)";
  } else if (timeRange === "month") {
    tCondBills = "MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
    tCondOrders = "MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())";
    tCondWork = "MONTH(work_date) = MONTH(CURDATE()) AND YEAR(work_date) = YEAR(CURDATE())";
  }

  const expectedWorkDays = getExpectedWorkDays(timeRange); 

  const conn = await pool.getConnection();
  try {
    const [kpiRows] = await conn.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_price ELSE 0 END), 0) as totalSales,
        COUNT(CASE WHEN status = 'COMPLETED' THEN bill_id END) as totalOrders,
        COALESCE(SUM(CASE WHEN status = 'VOID' THEN total_price ELSE 0 END), 0) as voidAmount
      FROM bills WHERE ${tCondBills}
    `);
    const kpi = kpiRows[0];

    const [activeTablesRows] = await conn.query(`
      SELECT COUNT(*) as activeTables FROM tables WHERE status IN ('มีลูกค้า', 'รอชำระ')
    `);

    const [hourlyRows] = await conn.query(`
      SELECT DATE_FORMAT(created_at, '%H:00') as name, SUM(total_price) as total
      FROM bills WHERE ${tCondBills} AND status = 'COMPLETED' GROUP BY name ORDER BY name
    `);

    const [categoryRows] = await conn.query(`
      SELECT m.category as name, SUM(oi.qty * m.price) as value
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menus m ON oi.menu_id = m.menu_id
      WHERE ${tCondOrders} AND o.paid = 1 AND oi.status != 'ยกเลิก'
      GROUP BY m.category ORDER BY value DESC
    `);
    const colors = ["#10b981", "#f97316", "#ef4444", "#f59e0b", "#3b82f6"];
    const categorySalesData = categoryRows.map((r, i) => ({
      name: r.name || 'ไม่มีหมวด', value: Number(r.value), color: colors[i % colors.length]
    }));

    const [paymentRows] = await conn.query(`
      SELECT payment_type as name, SUM(total_price) as value
      FROM bills WHERE ${tCondBills} AND status = 'COMPLETED' GROUP BY payment_type
    `);
    const paymentData = paymentRows.map(r => ({ name: r.name || 'ไม่ระบุ', value: Number(r.value) }));

    // 5. Detailed Menu
    const [menuRows] = await conn.query(`
      SELECT m.menu_id as id, m.name, m.category, SUM(oi.qty) as qty, SUM(oi.qty * m.price) as sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menus m ON oi.menu_id = m.menu_id
      WHERE ${tCondOrders} AND o.paid = 1 AND oi.status != 'ยกเลิก'
      GROUP BY m.menu_id, m.name, m.category
      ORDER BY sales DESC 
    `);
    const detailedMenuData = menuRows.map((m, index) => {
      let status = "Dog 📉";
      if (index < 3) status = "Star ⭐"; else if (index < 7) status = "Cash Cow 🐮";
      return { id: m.id, name: m.name, category: m.category, sales: Number(m.sales), qty: Number(m.qty), status };
    });

    const [staffRows] = await conn.query(`
      SELECT 
        e.employee_id as id, e.name_th as name, e.position as role,
        
        (SELECT COALESCE(SUM(total_price), 0) FROM bills WHERE closed_by_id = e.employee_id AND status = 'COMPLETED' AND ${tCondBills}) as sales,
        (SELECT COUNT(bill_id) FROM bills WHERE closed_by_id = e.employee_id AND status = 'COMPLETED' AND ${tCondBills}) as orders,
        (SELECT COUNT(bill_id) FROM bills WHERE closed_by_id = e.employee_id AND status = 'VOID' AND ${tCondBills}) as voids,
        
        (SELECT MAX(check_in) FROM employee_workingtime WHERE employee_id = e.employee_id AND DATE(work_date) = CURDATE()) as check_in,
        (SELECT MAX(type) FROM employee_workingtime WHERE employee_id = e.employee_id AND DATE(work_date) = CURDATE()) as attendance_type,
        (SELECT MAX(leave_type) FROM employee_workingtime WHERE employee_id = e.employee_id AND DATE(work_date) = CURDATE()) as leave_type,
        
        (SELECT COUNT(DISTINCT DATE(work_date)) FROM employee_workingtime WHERE employee_id = e.employee_id AND ${tCondWork} AND check_in IS NOT NULL AND (leave_type IS NULL AND type NOT IN ('ลา', 'leave'))) as total_worked,
        (SELECT COUNT(DISTINCT DATE(work_date)) FROM employee_workingtime WHERE employee_id = e.employee_id AND ${tCondWork} AND (leave_type IS NOT NULL OR type IN ('ลา', 'leave'))) as total_leaves

      FROM employees e
      WHERE e.status = 'ทำงานอยู่'
      ORDER BY sales DESC, name ASC
    `);

    const staffData = staffRows.map(s => {
      const workedDays = Number(s.total_worked) || 0;
      const leaveDays = Number(s.total_leaves) || 0;
      let absentDays = expectedWorkDays - workedDays - leaveDays;
      if (absentDays < 0) absentDays = 0;

      let attendanceStatus = "ยังไม่เข้างาน/ขาด";
      let statusColor = "red";

      const todayStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
      const isTodayMonday = new Date(todayStr).getDay() === 1;

      if (timeRange === 'today' && isTodayMonday) {
        attendanceStatus = "ร้านหยุด (วันจันทร์)";
        statusColor = "yellow";
      } else if (s.attendance_type === 'leave' || s.attendance_type === 'ลา' || s.leave_type) {
        attendanceStatus = `ลา ${s.leave_type ? '(' + s.leave_type + ')' : ''}`;
        statusColor = "yellow";
      } else if (s.check_in) {
        const checkInDate = new Date(s.check_in);
        const timeStr = checkInDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
        attendanceStatus = `เข้างาน ${timeStr}`;
        statusColor = "green";
      }

      return {
        id: s.id, name: s.name, role: s.role,
        sales: Number(s.sales), orders: Number(s.orders), voids: Number(s.voids),
        avgBill: Number(s.orders) > 0 ? (Number(s.sales) / Number(s.orders)).toFixed(0) : 0,
        attendanceStatus,
        statusColor,
        totalWorked: workedDays, 
        totalLeaves: leaveDays,
        totalAbsences: absentDays
      };
    });

    const [weeklyRows] = await conn.query(`
      SELECT DAYNAME(created_at) as dayStr, SUM(total_price) as sales
      FROM bills WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status = 'COMPLETED'
      GROUP BY DAYOFWEEK(created_at), DAYNAME(created_at) ORDER BY DAYOFWEEK(created_at)
    `);
    const dayMap = { 'Monday': 'จ', 'Tuesday': 'อ', 'Wednesday': 'พ', 'Thursday': 'พฤ', 'Friday': 'ศ', 'Saturday': 'ส', 'Sunday': 'อา' };
    const weeklyTrend = weeklyRows.map(r => ({ day: dayMap[r.dayStr] || r.dayStr, sales: Number(r.sales) }));

    return NextResponse.json({
      keyMetrics: {
        totalSales: Number(kpi.totalSales), salesGrowth: 0, totalOrders: Number(kpi.totalOrders), ordersGrowth: 0,
        avgBill: Number(kpi.totalOrders) > 0 ? (Number(kpi.totalSales) / Number(kpi.totalOrders)).toFixed(0) : 0,
        avgBillGrowth: 0, activeTables: activeTablesRows[0].activeTables,
        voidAmount: Number(kpi.voidAmount),
        voidRate: Number(kpi.totalSales) > 0 ? ((Number(kpi.voidAmount) / Number(kpi.totalSales)) * 100).toFixed(1) : 0
      },
      salesData: hourlyRows.length > 0 ? hourlyRows.map(r => ({ name: r.name, total: Number(r.total) })) : [{ name: "00:00", total: 0 }],
      categorySalesData: categorySalesData.length > 0 ? categorySalesData : [{ name: "ไม่มีข้อมูล", value: 0, color: "#ccc" }],
      paymentData: paymentData.length > 0 ? paymentData : [{ name: "ไม่มีข้อมูล", value: 0 }],
      weeklyTrend: weeklyTrend.length > 0 ? weeklyTrend : [{ day: "จ", sales: 0 }],
      detailedMenuData,
      staffData
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: "Server Error", error: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}