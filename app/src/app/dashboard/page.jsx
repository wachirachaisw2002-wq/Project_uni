"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell, PieChart, Pie, ComposedChart, Line
} from "recharts";
import { 
  DollarSign, ShoppingBag, CreditCard, Users, ArrowUp, ArrowDown, 
  UtensilsCrossed, Flame, ChefHat, CalendarDays, LayoutDashboard, 
  Menu, User, TrendingUp, AlertTriangle, Star, Clock, Filter, AlertCircle
} from "lucide-react";

// --- MOCK DATA CENTER (รวมข้อมูลทั้งหมดไว้ที่นี่) ---

// 1. Overview KPIs
const keyMetrics = {
    totalSales: 28540.00, salesGrowth: 15.2, 
    totalOrders: 142, ordersGrowth: 8.5,
    avgBill: 201.00, avgBillGrowth: -2.1,
    activeTables: 12,
    voidAmount: 450.00, voidRate: 1.5,
};

// 2. Charts Data
const salesData = [
  { name: "10:00", total: 1500 }, { name: "11:00", total: 4500 },
  { name: "12:00", total: 9800 }, { name: "13:00", total: 7200 },
  { name: "14:00", total: 3000 }, { name: "15:00", total: 2500 },
  { name: "16:00", total: 3800 }, { name: "17:00", total: 6500 },
  { name: "18:00", total: 8900 }, { name: "19:00", total: 7500 },
  { name: "20:00", total: 4000 },
];

const categorySalesData = [
    { name: "ส้มตำ/ยำ", value: 12500, color: "#10b981" },
    { name: "ไก่ย่าง/ของทอด", value: 9800, color: "#f97316" },
    { name: "ลาบ/น้ำตก", value: 4500, color: "#ef4444" },
    { name: "ข้าวเหนียว", value: 1740, color: "#f59e0b" },
];

const paymentData = [
  { name: "เงินสด", value: 8500 }, { name: "สแกนจ่าย", value: 20040 },
];
const totalPayment = paymentData.reduce((sum, item) => sum + item.value, 0);
const PieCOLORS = ["#94a3b8", "#f97316"];

// 3. Menu Deep Dive Data
const detailedMenuData = [
    { id: 1, name: "ตำปูปลาร้า", category: "ส้มตำ", sales: 12500, qty: 250, profit: "High", trend: "up", status: "Star" },
    { id: 2, name: "ตำไทยไข่เค็ม", category: "ส้มตำ", sales: 8400, qty: 120, profit: "Medium", trend: "stable", status: "Cash Cow" },
    { id: 3, name: "ไก่ย่างวิเชียรฯ", category: "ของย่าง", sales: 9500, qty: 50, profit: "High", trend: "up", status: "Star" },
    { id: 4, name: "คอหมูย่าง", category: "ของย่าง", sales: 6200, qty: 80, profit: "Medium", trend: "down", status: "Warning" },
    { id: 5, name: "ลาบหมู", category: "ลาบ", sales: 3500, qty: 55, profit: "Low", trend: "stable", status: "Dog" },
];

// 4. Staff Data
const staffData = [
    { id: 1, name: "น้องบี", role: "เสิร์ฟ", sales: 45000, orders: 150, avgBill: 300, voids: 2, rating: 4.8 },
    { id: 2, name: "พี่เอก", role: "แคชเชียร์", sales: 120500, orders: 400, avgBill: 301, voids: 15, rating: 4.5 }, // High Void
    { id: 3, name: "น้องฟ้า", role: "เสิร์ฟ", sales: 28000, orders: 120, avgBill: 233, voids: 0, rating: 4.2 },
];

// 5. Weekly Trend
const weeklyTrend = [
    { day: "จ", sales: 12000 }, { day: "อ", sales: 11500 }, { day: "พ", sales: 13000 },
    { day: "พฤ", sales: 14500 }, { day: "ศ", sales: 28000 }, { day: "ส", sales: 32000 }, { day: "อา", sales: 25000 },
];

// --- COMPONENTS ---

const GrowthIndicator = ({ value, description }) => {
    const isPositive = value >= 0;
    const color = isPositive ? "text-emerald-600" : "text-red-600";
    const Icon = isPositive ? ArrowUp : ArrowDown;
    return (
        <p className={`text-xs ${color} flex items-center mt-1 font-medium`}>
            <Icon className="h-3 w-3 mr-1" />
            {Math.abs(value).toFixed(1)}% <span className="text-gray-400 ml-1 font-normal">{description}</span>
        </p>
    );
};

const MetricCard = ({ title, value, subValue, icon: Icon, alert }) => (
    <Card className={`border-none shadow-sm relative overflow-hidden ${alert ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-zinc-900'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${alert ? 'text-red-600' : 'text-gray-500'}`}>{title}</CardTitle>
            <div className={`p-2 rounded-full ${alert ? 'bg-red-100' : 'bg-orange-50 dark:bg-zinc-800'}`}>
                <Icon className={`h-4 w-4 ${alert ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
            {subValue && <div className="mt-1">{subValue}</div>}
        </CardContent>
    </Card>
);

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, menu, staff, insights
  const [timeRange, setTimeRange] = useState("today");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#FFF8F0] dark:bg-black min-h-screen flex flex-col"> 
        
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white/80 backdrop-blur px-6 shadow-sm dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-1.5 rounded-lg dark:bg-orange-900/30">
                    <Flame className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                    <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-100 leading-none">
                        แดชบอร์ดร้านส้มตำ
                    </h1>
                    <span className="text-[10px] text-gray-500">Overview & Analytics</span>
                </div>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-white border-orange-200 dark:bg-zinc-900">
              <SelectValue placeholder="เลือกช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="week">สัปดาห์นี้</SelectItem>
              <SelectItem value="month">เดือนนี้</SelectItem>
            </SelectContent>
          </Select>
        </header>

        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
            
            {/* --- Navigation Tabs --- */}
            <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl border border-orange-100 w-fit gap-1 dark:bg-zinc-900/50 dark:border-zinc-800">
                {[
                    { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
                    { id: "menu", label: "วิเคราะห์เมนู", icon: Menu },
                    { id: "staff", label: "พนักงาน", icon: User },
                    { id: "insights", label: "เชิงลึก", icon: TrendingUp },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id 
                            ? "bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none" 
                            : "text-gray-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ================= TAB 1: OVERVIEW (ภาพรวม) ================= */}
            {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard 
                            title="ยอดขายรวม" value={`฿${keyMetrics.totalSales.toLocaleString()}`} 
                            subValue={<GrowthIndicator value={keyMetrics.salesGrowth} description="เทียบเมื่อวาน" />}
                            icon={DollarSign} 
                        />
                        <MetricCard 
                            title="จำนวนบิล" value={keyMetrics.totalOrders} 
                            subValue={<GrowthIndicator value={keyMetrics.ordersGrowth} description="บิล" />}
                            icon={ShoppingBag} 
                        />
                        <MetricCard 
                            title="ลูกค้าในร้าน" value={`${keyMetrics.activeTables} โต๊ะ`}
                            subValue={<span className="text-xs text-purple-500 animate-pulse">● กำลังทานอาหาร</span>}
                            icon={Users} 
                        />
                        <MetricCard 
                            title="ยอด Void (ยกเลิก)" value={`฿${keyMetrics.voidAmount}`} 
                            subValue={<span className="text-xs text-red-500 font-bold">{keyMetrics.voidRate}% ของยอดขาย</span>}
                            icon={AlertCircle} alert={keyMetrics.voidRate > 1}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sales Chart */}
                        <Card className="col-span-1 lg:col-span-2 border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle>ช่วงเวลาขายดี (Hourly Sales)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesData}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val)=>`฿${val/1000}k`} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="total" stroke="#f97316" fillOpacity={1} fill="url(#colorTotal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Payment Pie */}
                        <Card className="col-span-1 border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader><CardTitle>การชำระเงิน</CardTitle></CardHeader>
                            <CardContent className="h-[300px] flex flex-col items-center justify-center">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={PieCOLORS[index % 2]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 text-center">
                                    <div className="text-2xl font-bold">฿{totalPayment.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">ยอดรวมวันนี้</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= TAB 2: MENU ANALYSIS (เมนู) ================= */}
            {activeTab === "menu" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="col-span-1 border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader><CardTitle>สัดส่วนยอดขายตามหมวด</CardTitle></CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={categorySalesData}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize:12}} axisLine={false} tickLine={false}/>
                                        <Bar dataKey="value" radius={[0,4,4,0]} barSize={30}>
                                            {categorySalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Bar>
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        
                        <Card className="col-span-1 md:col-span-2 border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                                    ตารางเจาะลึกเมนู (Menu Engineering)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader className="bg-orange-50/50 dark:bg-zinc-800/50">
                                        <TableRow>
                                            <TableHead>เมนู</TableHead>
                                            <TableHead>หมวด</TableHead>
                                            <TableHead className="text-right">ยอดขาย</TableHead>
                                            <TableHead className="text-center">จำนวน</TableHead>
                                            <TableHead className="text-center">สถานะ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailedMenuData.map((menu) => (
                                            <TableRow key={menu.id}>
                                                <TableCell className="font-medium">{menu.name}</TableCell>
                                                <TableCell className="text-xs text-gray-500">{menu.category}</TableCell>
                                                <TableCell className="text-right font-bold">฿{menu.sales.toLocaleString()}</TableCell>
                                                <TableCell className="text-center">{menu.qty}</TableCell>
                                                <TableCell className="text-center">
                                                    {menu.status === 'Star' && <Badge className="bg-orange-500">Star ⭐</Badge>}
                                                    {menu.status === 'Cash Cow' && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Cash Cow 🐮</Badge>}
                                                    {menu.status === 'Warning' && <Badge variant="destructive">Warning ⚠️</Badge>}
                                                    {menu.status === 'Dog' && <Badge variant="outline">Dog 📉</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= TAB 3: STAFF (พนักงาน) ================= */}
            {activeTab === "staff" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader><CardTitle>ประสิทธิภาพพนักงาน (รายคน)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader className="bg-orange-50/50 dark:bg-zinc-800/50">
                                        <TableRow>
                                            <TableHead>พนักงาน</TableHead>
                                            <TableHead className="text-right">ยอดขาย</TableHead>
                                            <TableHead className="text-center">Avg/Bill</TableHead>
                                            <TableHead className="text-center text-red-500">Void</TableHead>
                                            <TableHead className="text-center">Rating</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {staffData.map((staff) => (
                                            <TableRow key={staff.id}>
                                                <TableCell className="flex items-center gap-2 font-medium">
                                                    <Avatar className="h-8 w-8"><AvatarFallback>{staff.name[0]}</AvatarFallback></Avatar>
                                                    {staff.name}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">฿{staff.sales.toLocaleString()}</TableCell>
                                                <TableCell className="text-center text-xs">
                                                    <span className={`px-2 py-1 rounded-full ${staff.avgBill > 250 ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                                        ฿{staff.avgBill}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-red-500">{staff.voids > 0 ? staff.voids : "-"}</TableCell>
                                                <TableCell className="text-center text-xs text-gray-500">{staff.rating} ★</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-500">
                                    <AlertTriangle className="w-5 h-5" /> Risk Monitor (เฝ้าระวัง)
                                </CardTitle>
                                <CardDescription>พนักงานที่มีอัตรา Void บิลสูงผิดปกติ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 p-4 border rounded-xl bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30">
                                    <Avatar className="h-12 w-12"><AvatarFallback className="bg-red-200 text-red-700">A</AvatarFallback></Avatar>
                                    <div>
                                        <div className="font-bold text-lg text-red-700 dark:text-red-400">พี่เอก (แคชเชียร์)</div>
                                        <div className="text-sm text-red-600/80">ยกเลิกบิล 15 ครั้ง (คิดเป็น ฿4,500)</div>
                                    </div>
                                    <div className="ml-auto">
                                        <Badge variant="destructive">High Risk</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= TAB 4: INSIGHTS (เชิงลึก) ================= */}
            {activeTab === "insights" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-blue-500" />
                                    แนวโน้มรายสัปดาห์ (Weekly Trend)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                                            {weeklyTrend.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.sales > 20000 ? "#f97316" : "#cbd5e1"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-4">
                            <Card className="bg-orange-50 border-orange-100 shadow-none dark:bg-orange-900/20 dark:border-orange-800">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-orange-600" />
                                        <h3 className="font-bold text-orange-700 dark:text-orange-400">Peak Hour</h3>
                                    </div>
                                    <p className="text-sm text-orange-800 dark:text-orange-300">
                                        ช่วงเวลาขายดีที่สุดคือ <strong>18:00 - 19:00</strong> เตรียมพนักงานให้พร้อมอย่างน้อย 4 คน
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-blue-50 border-blue-100 shadow-none dark:bg-blue-900/20 dark:border-blue-800">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CalendarDays className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-bold text-blue-700 dark:text-blue-400">Best Day</h3>
                                    </div>
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>วันเสาร์</strong> มียอดขายสูงสุด ควรสต็อกวัตถุดิบไก่ย่างเพิ่ม 20%
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}