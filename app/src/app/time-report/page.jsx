"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, CalendarIcon, MapPin,
  Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function TimeReportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6; 

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

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = format(selectedDate, "yyyy-MM");

      const query = new URLSearchParams({
        employeeId: selectedEmp,
        month: monthStr
      });

      const res = await fetch(`/api/attendance/report?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        setCurrentPage(1); 
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmp, selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const getCheckInStatus = (checkInTime) => {
    if (!checkInTime) return { text: "-", style: "text-gray-400" };

    const date = new Date(checkInTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours < 9 || (hours === 9 && minutes <= 30)) {
      return {
        text: "เข้างานตรงเวลา",
        style: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      };
    } else {
      return {
        text: "เข้างานสาย",
        style: "bg-red-500/10 text-red-500 border-red-500/20"
      };
    }
  };

  const getCheckOutStatus = (checkOutTime) => {
    if (!checkOutTime) {
      return {
        text: "กำลังทำงาน...",
        style: "bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse"
      };
    }

    const date = new Date(checkOutTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours < 9 || (hours === 9 && minutes < 35)) {
      return {
        text: "เลิกงานก่อนเวลา",
        style: "bg-amber-500/10 text-amber-500 border-amber-500/20"
      };
    } else {
      return {
        text: "เลิกงานช้า",
        style: "bg-blue-500/10 text-blue-500 border-blue-500/20"
      };
    }
  };

  const indexOfLastRecord = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - ITEMS_PER_PAGE;
  const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);

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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดรายงาน...</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">

              <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider ml-1">เดือน</label>
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
                              }
                            }}
                            defaultMonth={selectedDate}
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

                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800 flex flex-col">
                <CardContent className="p-0 flex-1">
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                        <TableRow className="dark:border-zinc-800">
                          <TableHead className="pl-4 h-10 text-xs dark:text-zinc-400">พนักงาน</TableHead>
                          <TableHead className="h-10 text-xs dark:text-zinc-400">วันที่</TableHead>
                          <TableHead className="h-10 text-xs dark:text-zinc-400">เวลาเข้างาน</TableHead>
                          <TableHead className="h-10 text-xs dark:text-zinc-400">เวลาออกงาน</TableHead>
                          <TableHead className="h-10 text-xs dark:text-zinc-400 text-center">รวมเวลา</TableHead>
                          <TableHead className="pr-4 h-10 text-xs text-right dark:text-zinc-400">หลักฐาน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-zinc-400">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="h-6 w-6 opacity-20" />
                                <span className="text-xs">ไม่พบข้อมูล</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentRecords.map((row) => (
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
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatTime(row.check_in)}
                                  </span>
                                  <Badge className={`h-5 text-[9px] px-1.5 ${getCheckInStatus(row.check_in).style} border shadow-none font-medium`}>
                                    {getCheckInStatus(row.check_in).text}
                                  </Badge>
                                </div>
                              </TableCell>

                              <TableCell className="py-2">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                    {row.check_out ? formatTime(row.check_out) : "-"}
                                  </span>
                                  <Badge className={`h-5 text-[9px] px-1.5 ${getCheckOutStatus(row.check_out).style} border shadow-none font-medium`}>
                                    {getCheckOutStatus(row.check_out).text}
                                  </Badge>
                                </div>
                              </TableCell>

                              <TableCell className="py-2 text-center">
                                <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                  {calculateDuration(row.check_in, row.check_out)}
                                </div>
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

                {records.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                    <div className="text-[10px] text-zinc-500">
                      แสดงรายการที่ {indexOfFirstRecord + 1} ถึง {Math.min(indexOfLastRecord, records.length)} จากทั้งหมด {records.length} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="h-8 text-xs px-2 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        ก่อนหน้า
                      </Button>
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-w-[3rem] text-center">
                        {currentPage} / {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="h-8 text-xs px-2 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        ถัดไป
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

            </div>
          )}

          <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-zinc-800">
              <DialogTitle className="sr-only">รูปถ่ายยืนยัน</DialogTitle>

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