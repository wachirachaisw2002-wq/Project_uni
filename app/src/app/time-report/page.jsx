"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input"; // ไม่ได้ใช้แล้ว
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Loader2, CalendarIcon, MapPin, // เปลี่ยนจาก Calendar เป็น CalendarIcon เพื่อความชัดเจน
  Image as ImageIcon, AlertCircle
} from "lucide-react";

// ✅ Import Component ที่จำเป็นสำหรับปฏิทินใหม่
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function TimeReportPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [selectedEmp, setSelectedEmp] = useState("all");
  
  // ✅ เปลี่ยนจาก string มาเก็บเป็น Date object เพื่อใช้กับ Calendar Component
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);

  // 1. Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          const empList = Array.isArray(data) ? data : (data.employees || []);
          setEmployees(empList);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  // 2. Fetch Report
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ แปลง Date object เป็น string "YYYY-MM" สำหรับส่ง API
      const monthStr = format(selectedDate, "yyyy-MM");

      const query = new URLSearchParams({
        employeeId: selectedEmp,
        month: monthStr
      });

      const res = await fetch(`/api/attendance/report?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEmp, selectedDate]); // Trigger เมื่อ selectedDate หรือ selectedEmp เปลี่ยน

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // --- Helper Functions ---
  const calculateDuration = (start, end) => {
    if (!start || !end) return "-";
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    if (diffMs < 0) return "0 ชม. 0 นาที";
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours} ชม. ${minutes} น.`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : "US";

  const openGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const getStatusBadge = (checkoutTime) => {
    if (checkoutTime) {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/20";
    }
    return "bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400 dark:border-orange-500/20 animate-pulse";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black h-screen flex flex-col overflow-hidden w-full">

        <header className="flex-none z-50 flex h-16 w-full items-center justify-between px-4 border-b 
          bg-white dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              รายงานเวลาทำงาน
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 sm:p-4 bg-zinc-50/30 dark:bg-black w-full">

          <div className="max-w-3xl mx-auto space-y-4">

            {/* Filter Card */}
            <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
              <CardContent className="p-3 space-y-3">
                {/* ✅ ปรับ Grid เป็น 2 คอลัมน์ เพราะลบปุ่มรีเฟรชออก */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-1">เดือน</label>
                    
                    {/* ✅ ใช้ Popover + Calendar แทน Input type="month" */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={`h-9 justify-start text-left font-normal text-xs w-full dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 ${!selectedDate && "text-muted-foreground"}`}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                          {selectedDate ? format(selectedDate, "MMMM yyyy", { locale: th }) : <span>เลือกเดือน</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                                setSelectedDate(date);
                                // ปฏิทินจะปิดอัตโนมัติหรือไม่ขึ้นอยู่กับ UX ที่ต้องการ 
                                // ถ้าอยากให้ปิดเลยเมื่อเลือกวันเพื่อเอาเดือน ให้หาวิธีปิด Popover state
                            }
                          }}
                          defaultMonth={selectedDate} // ให้ปฏิทินเปิดมาที่เดือนปัจจุบันที่เลือก
                          locale={th}
                          className="p-3"
                          classNames={{
                            day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white shadow-lg shadow-emerald-500/30 scale-100",
                            day_today: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-1">พนักงาน</label>
                    <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                      <SelectTrigger className="h-9 text-xs dark:bg-zinc-950 dark:border-zinc-800 w-full">
                        <SelectValue placeholder="เลือกพนักงาน" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                        <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.employee_id} value={String(emp.employee_id)}>
                            {emp.name_th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ❌ ลบปุ่ม Refresh ออกแล้ว */}

                </div>
              </CardContent>
            </Card>

            {/* Data Table Card */}
            <Card className="border-none shadow-sm overflow-hidden dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                      <TableRow className="dark:border-zinc-800">
                        <TableHead className="pl-4 h-10 text-xs dark:text-zinc-400">พนักงาน</TableHead>
                        <TableHead className="h-10 text-xs dark:text-zinc-400">วันที่</TableHead>
                        <TableHead className="h-10 text-xs dark:text-zinc-400">เวลา</TableHead>
                        <TableHead className="h-10 text-xs dark:text-zinc-400 text-center">รวม</TableHead>
                        <TableHead className="h-10 text-xs dark:text-zinc-400 text-center">สถานะ</TableHead>
                        <TableHead className="pr-4 h-10 text-xs text-right dark:text-zinc-400">หลักฐาน</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col justify-center items-center gap-2 text-zinc-500">
                              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                              <span className="text-[10px]">กำลังโหลด...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-zinc-400">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="h-6 w-6 opacity-20" />
                              <span className="text-xs">ไม่พบข้อมูล</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((row) => (
                          <TableRow key={row.id} className="dark:border-zinc-800 dark:hover:bg-zinc-800/40 transition-colors group">
                            <TableCell className="pl-4 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7 border border-zinc-100 dark:border-zinc-700">
                                  <AvatarFallback className="bg-orange-50 text-orange-600 text-[9px] dark:bg-orange-900/20 dark:text-orange-400">
                                    {getInitials(row.name_th)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[80px] sm:max-w-[120px]">{row.name_th}</span>
                                  <span className="text-[9px] text-zinc-500">{row.position}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-zinc-600 dark:text-zinc-400">
                              {formatDate(row.work_date)}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary" className="w-fit h-5 px-1.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                  เข้า {formatTime(row.check_in)}
                                </Badge>
                                {row.check_out && (
                                  <Badge variant="secondary" className="w-fit h-5 px-1.5 text-[10px] bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                    ออก {formatTime(row.check_out)}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                {calculateDuration(row.check_in, row.check_out)}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge className={`h-5 text-[9px] px-1.5 ${getStatusBadge(row.check_out)} border shadow-none font-medium`}>
                                {row.check_out ? "ครบ" : "ทำงาน"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 pr-4 text-right">
                              <div className="flex justify-end gap-1">
                                {row.latitude && row.longitude && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 dark:hover:bg-blue-500/10"
                                    onClick={() => openGoogleMaps(row.latitude, row.longitude)}
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {row.check_in_photo ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-orange-500 hover:text-orange-600 dark:hover:bg-orange-500/10"
                                    onClick={() => {
                                      setCurrentPhoto(row.check_in_photo);
                                      setPhotoModalOpen(true);
                                    }}
                                  >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <span className="w-7 flex justify-center text-zinc-300">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Photo Modal */}
          <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-zinc-800">
              <div className="relative w-full aspect-[3/4] md:aspect-square flex items-center justify-center bg-black">
                {currentPhoto && (
                  <img
                    src={currentPhoto}
                    alt="Verification Proof"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="p-3 bg-zinc-950 flex justify-between items-center border-t border-zinc-900">
                <span className="text-xs font-medium text-white">รูปถ่ายยืนยัน</span>
                <Button variant="secondary" size="sm" onClick={() => setPhotoModalOpen(false)} className="h-8 text-xs dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100">
                  ปิด
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}