"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import {
  DollarSign, ShoppingBag, Users, ArrowUp, ArrowDown,
  UtensilsCrossed, Flame, CalendarDays, LayoutDashboard,
  Menu, User, TrendingUp, AlertTriangle, Clock, AlertCircle, Loader2
} from "lucide-react";

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

const PieCOLORS = ["#94a3b8", "#f97316"];

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/dashboard?timeRange=${timeRange}`);
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (isLoading && !data) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gray-50/50 dark:bg-black min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-zinc-500 font-medium">กำลังประมวลผลข้อมูลแดชบอร์ด...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const totalPayment = data?.paymentData?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-gray-50/50 dark:bg-black min-h-screen flex flex-col">

        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white/80 backdrop-blur px-6 shadow-sm dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">

              <div>
                <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-100 leading-none">
                  รายงานยอดขาย
                </h1>
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

          <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl border border-orange-100 w-fit gap-1 dark:bg-zinc-900/50 dark:border-zinc-800 overflow-x-auto">
            {[
              { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
              { id: "menu", label: "ข้อมูลรายการอาหาร", icon: Menu },
              { id: "staff", label: "พนักงาน", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none"
                  : "text-gray-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && data && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="ยอดขายรวม" value={`฿${data.keyMetrics.totalSales.toLocaleString()}`}
                  subValue={<GrowthIndicator value={data.keyMetrics.salesGrowth} description="เทียบช่วงก่อนหน้า" />}
                  icon={DollarSign}
                />
                <MetricCard
                  title="จำนวนบิล" value={data.keyMetrics.totalOrders}
                  subValue={<GrowthIndicator value={data.keyMetrics.ordersGrowth} description="บิล" />}
                  icon={ShoppingBag}
                />
                <MetricCard
                  title="ลูกค้าในร้าน (ยังไม่ชำระ)" value={`${data.keyMetrics.activeTables} โต๊ะ`}
                  subValue={<span className="text-xs text-purple-500 animate-pulse">● กำลังดำเนินการ</span>}
                  icon={Users}
                />
                <MetricCard
                  title="ยอด Void (ยกเลิก)" value={`฿${data.keyMetrics.voidAmount.toLocaleString()}`}
                  subValue={<span className="text-xs text-red-500 font-bold">{data.keyMetrics.voidRate}% ของยอดขาย</span>}
                  icon={AlertCircle} alert={data.keyMetrics.voidRate > 5}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2 border-none shadow-sm dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle>ช่วงเวลาขายดี (Hourly Sales)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.salesData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val / 1000}k`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                        <Area type="monotone" dataKey="total" stroke="#f97316" fillOpacity={1} fill="url(#colorTotal)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="col-span-1 border-none shadow-sm dark:bg-zinc-900">
                  <CardHeader><CardTitle>การชำระเงิน</CardTitle></CardHeader>
                  <CardContent className="h-[300px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data.paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {data.paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={PieCOLORS[index % 2]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-center">
                      <div className="text-2xl font-bold">฿{totalPayment.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">ยอดรวม</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "menu" && data && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-1 border-none shadow-sm dark:bg-zinc-900">
                  <CardHeader><CardTitle>สัดส่วนยอดขายตามหมวด</CardTitle></CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={data.categorySalesData}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                          {data.categorySalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                        <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => `฿${value.toLocaleString()}`} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 border-none shadow-sm dark:bg-zinc-900 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                        ตารางเจาะลึกเมนู (Menu Analysis)
                      </div>
                    </CardTitle>
                    <div className="flex gap-2 pt-3 overflow-x-auto pb-2 scrollbar-hide">
                      {["ทั้งหมด", ...data.categorySalesData.map(c => c.name)].map(cat => (
                        <Badge
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          className={`cursor-pointer whitespace-nowrap px-3 py-1 text-sm ${selectedCategory === cat
                            ? 'bg-orange-500 hover:bg-orange-600 text-white border-transparent'
                            : 'text-zinc-500 hover:text-orange-600 hover:bg-orange-50 border-zinc-200 dark:border-zinc-800'
                            }`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto flex-1">
                    <Table className="min-w-[500px]">
                      <TableHeader className="bg-orange-50/50 dark:bg-zinc-800/50 sticky top-0">
                        <TableRow>
                          <TableHead className="pl-4">เมนู</TableHead>
                          <TableHead>หมวด</TableHead>
                          <TableHead className="text-right">ยอดขาย</TableHead>
                          <TableHead className="text-center pr-4">จำนวน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.detailedMenuData
                          .filter(menu => selectedCategory === "ทั้งหมด" || menu.category === selectedCategory)
                          .map((menu) => (
                            <TableRow key={menu.id}>
                              <TableCell className="font-medium pl-4">{menu.name}</TableCell>
                              <TableCell className="text-xs text-gray-500">{menu.category}</TableCell>
                              <TableCell className="text-right font-bold text-orange-600 dark:text-orange-400">฿{menu.sales.toLocaleString()}</TableCell>
                              <TableCell className="text-center pr-4">{menu.qty}</TableCell>
                            </TableRow>
                          ))}

                        {data.detailedMenuData.filter(menu => selectedCategory === "ทั้งหมด" || menu.category === selectedCategory).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                              ไม่มีข้อมูลเมนูขายดีในหมวด "{selectedCategory}" ช่วงเวลานี้
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === "staff" && data && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-6">
                <Card className="border-none shadow-sm dark:bg-zinc-900 overflow-hidden">
                  <CardHeader><CardTitle>ประสิทธิภาพและการเข้างานของพนักงาน</CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-orange-50/50 dark:bg-zinc-800/50">
                        <TableRow>
                          <TableHead className="pl-4">พนักงาน</TableHead>
                          <TableHead className="text-center">
                            {timeRange === 'today' ? 'สถานะวันนี้' : 'สถิติการมาทำงาน'}
                          </TableHead>
                          <TableHead className="text-right">ยอดขายที่ปิดได้</TableHead>
                          <TableHead className="text-center">จำนวนบิล</TableHead>
                          <TableHead className="text-center">ยอด/บิล (Avg)</TableHead>
                          <TableHead className="text-center text-red-500">Void</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.staffData.map((staff) => (
                          <TableRow key={staff.id}>
                            <TableCell className="flex items-center gap-2 font-medium pl-4">
                              <Avatar className="h-8 w-8"><AvatarFallback className="bg-orange-100 text-orange-700">{staff.name[0]}</AvatarFallback></Avatar>
                              <div>
                                <div>{staff.name}</div>
                                <div className="text-[10px] text-gray-400">{staff.role}</div>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {timeRange === 'today' ? (
                                <>
                                  {staff.statusColor === 'green' && <Badge className="bg-emerald-100 text-emerald-700 border-none">{staff.attendanceStatus}</Badge>}
                                  {staff.statusColor === 'yellow' && <Badge className="bg-amber-100 text-amber-700 border-none">{staff.attendanceStatus}</Badge>}
                                  {staff.statusColor === 'red' && <Badge className="bg-red-50 text-red-600 border border-red-200">{staff.attendanceStatus}</Badge>}
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-xs">
                                  <span className="text-emerald-700 font-medium bg-emerald-100 px-2 py-0.5 rounded-full w-24">
                                    มาทำงาน: {staff.totalWorked} วัน
                                  </span>

                                  {staff.totalLeaves > 0 && (
                                    <span className="text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-full w-24">
                                      ลางาน: {staff.totalLeaves} วัน
                                    </span>
                                  )}

                                  {staff.totalAbsences > 0 && (
                                    <span className="text-red-700 font-medium bg-red-100 px-2 py-0.5 rounded-full w-24">
                                      ขาดงาน: {staff.totalAbsences} วัน
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-bold">฿{staff.sales.toLocaleString()}</TableCell>
                            <TableCell className="text-center">{staff.orders}</TableCell>
                            <TableCell className="text-center text-xs">
                              <span className={`px-2 py-1 rounded-full ${staff.avgBill > 250 ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                                ฿{staff.avgBill.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-bold text-red-500">{staff.voids > 0 ? staff.voids : "-"}</TableCell>
                          </TableRow>
                        ))}
                        {data.staffData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">ไม่มีข้อมูลพนักงานที่ลงทะเบียนในระบบ</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}