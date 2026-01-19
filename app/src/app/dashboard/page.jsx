"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { DollarSign, ShoppingBag, CreditCard, Users, ArrowUp, ArrowDown, Utensils, Users as UsersIcon } from "lucide-react";

// --- Mock Data (จำลองข้อมูลจากฐานข้อมูลเพื่อการวิเคราะห์ BI) ---

// 1. Key Metrics Data (Growth Rate)
const keyMetrics = {
    totalSales: 45231.89,
    salesGrowth: 12.5, // +12.5% เทียบกับช่วงก่อนหน้า
    totalOrders: 2350,
    ordersGrowth: -3.2, // -3.2% เทียบกับช่วงก่อนหน้า
    avgBill: 450.00,
    avgBillGrowth: 5.1, // +5.1% เทียบกับช่วงก่อนหน้า
    activeTables: 573,
    tableGrowth: 8.8, // +8.8% เทียบกับช่วงก่อนหน้า
};

// 2. Sales Trend (จากตาราง orders.created_at และ total_price)
const salesData = [
  { name: "10:00", total: 1200 },
  { name: "11:00", total: 3500 },
  { name: "12:00", total: 8000 },
  { name: "13:00", total: 6500 },
  { name: "14:00", total: 4000 },
  { name: "15:00", total: 3000 },
  { name: "16:00", total: 4500 },
  { name: "17:00", total: 7000 },
  { name: "18:00", total: 9500 },
  { name: "19:00", total: 5000 },
];

// 3. Sales by Category (จากตาราง menus.category, bill_items, bills)
const categorySalesData = [
    { name: "อาหารจานเดียว", value: 18000, color: "#10b981" },
    { name: "อาหารตามสั่ง/กับข้าว", value: 12000, color: "#f97316" },
    { name: "เครื่องดื่ม", value: 6500, color: "#3b82f6" },
    { name: "ของหวาน", value: 4500, color: "#8b5cf6" },
];

// 4. Employee Performance (จากตาราง employees และ orders/bills ที่เชื่อมโยง)
const employeeSalesData = [
    { name: "พนักงาน A (กะเช้า)", sales: 15500, orders: 45 },
    { name: "พนักงาน B (กะบ่าย)", sales: 12200, orders: 38 },
    { name: "พนักงาน C (กะเช้า)", sales: 9800, orders: 25 },
    { name: "พนักงาน D (พาร์ทไทม์)", sales: 7500, orders: 20 },
];

// 5. Payment Method (จากตาราง bills.payment_type)
const paymentData = [
  { name: "เงินสด", value: 4500 },
  { name: "โอนเงิน/QR", value: 12500 },
];
const totalPayment = paymentData.reduce((sum, item) => sum + item.value, 0);
const PieCOLORS = ["#10b981", "#3b82f6"]; // Emerald & Blue

// Helper component for Growth Indicator
const GrowthIndicator = ({ value, description }) => {
    const isPositive = value >= 0;
    const color = isPositive ? "text-emerald-600" : "text-red-600";
    const Icon = isPositive ? ArrowUp : ArrowDown;

    return (
        <p className={`text-xs ${color} flex items-center mt-1`}>
            <Icon className="h-3 w-3 mr-1" />
            **{Math.abs(value).toFixed(1)}%** <span className="text-gray-500 ml-1">{description}</span>
        </p>
    );
};

export default function Page() {
  const [timeRange, setTimeRange] = useState("today");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">สรุปยอดขายและ BI Dashboard</h1>
          </div>
          
          {/* Time Filter */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="เลือกช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="week">สัปดาห์นี้</SelectItem>
              <SelectItem value="month">เดือนนี้</SelectItem>
              <SelectItem value="year">ปีนี้</SelectItem>
            </SelectContent>
          </Select>
        </header>

        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] space-y-6">
          
          {/* 1. Key Metrics Cards (เน้นตัวชี้วัดที่ใช้พัฒนาธุรกิจ) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: ยอดขายรวม (Total Sales) */}
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">ยอดขายรวม</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">฿ {keyMetrics.totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                <GrowthIndicator value={keyMetrics.salesGrowth} description={`เทียบกับ ${timeRange === 'today' ? 'เมื่อวาน' : 'ช่วงก่อนหน้า'}`} />
              </CardContent>
            </Card>

            {/* Card 2: ยอดเฉลี่ยต่อบิล (Avg. Bill Value) - ตัวชี้วัดสำคัญสำหรับการ Up-selling */}
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">ยอดเฉลี่ยต่อบิล</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">฿ {keyMetrics.avgBill.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                <GrowthIndicator value={keyMetrics.avgBillGrowth} description={`เทียบกับ ${timeRange === 'today' ? 'เมื่อวาน' : 'ช่วงก่อนหน้า'}`} />
              </CardContent>
            </Card>
            
            {/* Card 3: หมวดหมู่ขายดีสุด (จากตาราง menus) */}
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">หมวดหมู่ขายดีสุด</CardTitle>
                <Utensils className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{categorySalesData[0].name}</div>
                <p className="text-xs text-gray-500 mt-1">
                  ยอดขาย ฿{categorySalesData[0].value.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: พนักงานทำยอดสูงสุด (จากตาราง employees) */}
            <Card className="shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">พนักงานยอดขายสูงสุด</CardTitle>
                <UsersIcon className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-800">{employeeSalesData[0].name.split(' ')[0]}</div>
                <p className="text-xs text-gray-500 mt-1">
                  ยอดขาย ฿{employeeSalesData[0].sales.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. Operational & Payment Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Trend (Area Chart) - การบริหารจัดการพนักงาน */}
            <Card className="col-span-1 lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>แนวโน้มยอดขาย (รายชั่วโมง) - บริหารจัดการพนักงาน</CardTitle>
                <CardDescription>แสดงยอดขายตามช่วงเวลา เพื่อปรับตารางพนักงานให้เหมาะสมกับช่วง Peak Time (ใช้ตาราง orders)</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${(value / 1000).toFixed(1)}K`} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <Tooltip formatter={(value) => [`฿${value.toLocaleString()}`, "ยอดขาย"]} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method (Pie Chart) - การบริหารเงินสด */}
            <Card className="col-span-1 border-none shadow-sm">
              <CardHeader>
                <CardTitle>สัดส่วนการชำระเงิน - บริหารเงินสด</CardTitle>
                <CardDescription>เปรียบเทียบ เงินสด vs เงินโอน (ใช้ตาราง bills)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PieCOLORS[index % 2]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => {
                          const paymentName = props.payload.name; 
                          return [`฿${value.toLocaleString()}`, paymentName];
                        }} 
                      />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-sm text-gray-500">รวมทั้งสิ้น</span>
                       <span className="text-xl font-bold">฿{totalPayment.toLocaleString()}</span>
                    </div>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 text-sm mt-4">
                      {paymentData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: PieCOLORS[index % 2] }}></div> 
                              {item.name} ({((item.value / totalPayment) * 100).toFixed(1)}%)
                          </div>
                      ))}
                  </div>
                  </div>
                </CardContent>
            </Card>
          </div>

          {/* 3. Strategic BI Analysis Section (Menu & Employee Performance) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Sales by Category (Bar Chart) - การจัดการเมนู/ต้นทุน */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>ยอดขายตามหมวดหมู่เมนู - Menu Engineering</CardTitle>
                <CardDescription>วิเคราะห์ว่าหมวดหมู่ใดสร้างรายได้สูงสุดเพื่อวางกลยุทธ์การตลาด (ใช้ตาราง menus, order_items)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categorySalesData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 12, fill: "#4b5563" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value) => [`฿${value.toLocaleString()}`, "ยอดขาย"]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25} name="ยอดขาย">
                        {categorySalesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Right: Employee Sales Performance (Bar Chart) - การฝึกอบรม/ให้รางวัล */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>ประสิทธิภาพยอดขายพนักงาน - การฝึกอบรม/ให้รางวัล</CardTitle>
                <CardDescription>เปรียบเทียบยอดขายรวมและจำนวนออเดอร์ของพนักงานแต่ละคน (ใช้ตาราง employees, orders)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={employeeSalesData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value, name) => [
                          name === 'orders' ? `${value.toLocaleString()} ออเดอร์` : `฿${value.toLocaleString()}`, 
                          name === 'orders' ? 'จำนวนออเดอร์' : 'ยอดขายรวม'
                        ]}
                      />
                      <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ยอดขายรวม" />
                      <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} name="ออเดอร์" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}