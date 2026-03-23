"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock
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
  const ITEMS_PER_PAGE = 8;

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
      const query = new URLSearchParams({ employeeId: selectedEmp, month: monthStr });
      const res = await fetch(`/api/attendance/report?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        setCurrentPage(1);
      } else {
        setRecords([]);
      }
    } catch (error) {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmp, selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const groupedRecords = useMemo(() => {
    const group = {};

    records.forEach(row => {
      const dateObj = new Date(row.work_date || row.date);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      const key = `${row.employee_id}_${dateKey}`;

      if (!group[key]) {
        group[key] = {
          id: row.id, employee_id: row.employee_id, name_th: row.name_th, position: row.position, work_date: dateKey,
          hasWork: false, check_in: null, check_out: null, latitude: null, longitude: null, check_in_photo: null,
          hasLeave: false, leave_type: null, reason: null, leave_status: null,
          isAbsent: false,
          isDayOff: false 
        };
      }

      if (row.type === 'leave') {
        group[key].hasLeave = true;
        group[key].leave_type = row.leave_type;
        group[key].reason = row.reason;
        group[key].leave_status = row.leave_status;
      } else {
        group[key].hasWork = true;
        group[key].check_in = row.check_in;
        group[key].check_out = row.check_out;
        group[key].latitude = row.latitude;
        group[key].longitude = row.longitude;
        group[key].check_in_photo = row.check_in_photo;
      }
    });

    const today = new Date();
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

    const isCurrentMonth = selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth();
    const endOfMonth = isCurrentMonth ? today : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const empsToProcess = selectedEmp === "all" ? employees : employees.filter(e => String(e.employee_id) === selectedEmp);

    empsToProcess.forEach(emp => {
      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const key = `${emp.employee_id}_${dateStr}`;

        if (emp.start_date && new Date(emp.start_date) > d) continue;

        if (!group[key]) {
          const isMonday = d.getDay() === 1;

          group[key] = {
            id: isMonday ? `dayoff_${key}` : `absent_${key}`,
            employee_id: emp.employee_id,
            name_th: emp.name_th,
            position: emp.position,
            work_date: dateStr,
            hasWork: false,
            hasLeave: false,
            isAbsent: !isMonday, 
            isDayOff: isMonday 
          };
        }
      }
    });

    return Object.values(group).sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
  }, [records, employees, selectedEmp, selectedDate]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return "-";
    const diffMs = new Date(end) - new Date(start);
    if (diffMs < 0) return "0 ชม. 0 น.";
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
    if (!checkInTime) return { text: "-", style: "text-zinc-400" };
    const date = new Date(checkInTime);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours < 9 || (hours === 9 && minutes <= 30)) {
      return { text: "เข้างานตรงเวลา", style: "bg-emerald-50 text-emerald-500 border-emerald-200" };
    } else {
      return { text: "เข้างานสาย", style: "bg-rose-50 text-rose-500 border-rose-200" };
    }
  };

  const getCheckOutStatus = (checkOutTime) => {
    if (!checkOutTime) {
      return { text: "กำลังทำงาน...", style: "bg-orange-50 text-orange-500 border-orange-200 animate-pulse" };
    }
    const date = new Date(checkOutTime);
    const hours = date.getHours();
    if (hours < 18) {
      return { text: "เลิกงานก่อนเวลา", style: "bg-amber-50 text-amber-500 border-amber-200" };
    } else {
      return { text: "เลิกงานช้า", style: "bg-blue-50 text-blue-500 border-blue-200" };
    }
  };

  const indexOfLastRecord = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - ITEMS_PER_PAGE;
  const currentRecords = groupedRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(groupedRecords.length / ITEMS_PER_PAGE);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black h-screen flex flex-col overflow-hidden w-full">

        <header className="flex-none z-50 flex h-16 w-full items-center justify-between px-6 border-b bg-white dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              รายงานเวลาทำงาน
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-50/50 dark:bg-black w-full">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดรายงาน...</p>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">

              <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">เดือนและปี</label>
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`h-10 justify-start text-left font-normal text-[13px] w-full dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 ${!selectedDate && "text-muted-foreground"}`}>
                            <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400" />
                            {selectedDate ? format(selectedDate, "MMMM yyyy", { locale: th }) : <span>เลือกเดือน</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800" align="start">
                          <Calendar
                            mode="single" selected={selectedDate}
                            onSelect={(date) => { if (date) setSelectedDate(date); }}
                            defaultMonth={selectedDate} locale={th} className="p-3"
                            classNames={{
                              day_selected: "bg-emerald-500 text-white hover:bg-emerald-600",
                              day_today: "bg-zinc-100 dark:bg-zinc-800 font-bold border",
                            }}
                            captionLayout="dropdown" fromYear={2020} toYear={new Date().getFullYear() + 1}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">พนักงาน</label>
                      <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                        <SelectTrigger className="h-10 text-[13px] dark:bg-zinc-950 dark:border-zinc-800 w-full"><SelectValue placeholder="เลือกพนักงาน" /></SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.employee_id} value={String(emp.employee_id)}>{emp.name_th}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-transparent">
                        <TableRow className="dark:border-zinc-800 hover:bg-transparent">
                          <TableHead className="pl-6 h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[240px]">พนักงาน</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[120px]">วันที่</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[140px]">เวลาเข้างาน</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[140px]">เวลาออกงาน</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[160px]">รวมเวลา / สถานะ</TableHead>
                          <TableHead className="pr-6 h-14 text-[13px] font-semibold text-right text-zinc-600 dark:text-zinc-400 w-[200px]">หลักฐาน / เหตุผล</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-40 text-center text-zinc-400">
                              <div className="flex flex-col items-center gap-3">
                                <AlertCircle className="h-8 w-8 opacity-20" />
                                <span className="text-sm">ไม่พบข้อมูลในเดือนนี้</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentRecords.map((row) => (
                            <TableRow
                              key={`${row.employee_id}_${row.work_date}`}
                              className={`dark:border-zinc-800 transition-colors group h-16 
                                ${row.isAbsent ? "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50"
                                  : row.isDayOff ? "bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                                    : "dark:hover:bg-zinc-800/20"}`}
                            >

                              <TableCell className="pl-6 py-4 align-top">
                                <div className="flex items-center gap-4 mt-0.5">
                                  <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-700">
                                    <AvatarFallback className="bg-orange-50 text-orange-600 text-[11px] font-bold dark:bg-orange-900/20 dark:text-orange-400">
                                      {getInitials(row.name_th)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-[14px] text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">{row.name_th}</span>
                                    <span className="text-[12px] text-zinc-500 truncate max-w-[150px]">{row.position}</span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="py-4 align-top">
                                <div className="flex flex-col mt-2.5">
                                  <span className="text-[14px] font-medium text-zinc-800 dark:text-zinc-300">
                                    {formatDate(row.work_date)}
                                  </span>
                                </div>
                              </TableCell>

                              {row.isDayOff ? (
                                <>
                                  <TableCell className="py-4 align-top">
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[15px] font-bold text-zinc-500 leading-none">ร้านหยุด</span>
                                      <Badge variant="outline" className="h-5 text-[10px] px-2 mt-0.5 rounded-full font-medium bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                                        วันหยุดประจำสัปดาห์
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 align-top">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                  <TableCell className="py-4 align-top text-center">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                  <TableCell className="py-4 pr-6 align-top text-right">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                </>
                              ) : row.isAbsent ? (
                                <>
                                  <TableCell className="py-4 align-top">
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[15px] font-bold text-rose-500 leading-none">ขาดงาน</span>
                                      <Badge variant="outline" className="h-5 text-[10px] px-2 mt-0.5 rounded-full font-medium bg-rose-50 text-rose-500 border-rose-200">
                                        ไม่ได้ลงเวลา
                                      </Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 align-top">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                  <TableCell className="py-4 align-top text-center">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                  <TableCell className="py-4 pr-6 align-top text-right">
                                    <span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="py-4 align-top">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-start justify-between">
                                          <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none">
                                            {formatTime(row.check_in)}
                                          </span>
                                          <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-full font-medium ${getCheckInStatus(row.check_in).style}`}>
                                            {getCheckInStatus(row.check_in).text}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-top">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-start justify-between">
                                          {row.check_out ? (
                                            <>
                                              <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none">
                                                {formatTime(row.check_out)}
                                              </span>
                                              <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-full font-medium ${getCheckOutStatus(row.check_out).style}`}>
                                                {getCheckOutStatus(row.check_out).text}
                                              </Badge>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-zinc-300 dark:text-zinc-600 leading-none">-</span>
                                              <Badge variant="outline" className="h-5 text-[10px] px-2 rounded-full font-medium bg-amber-50 text-amber-500 border-amber-200 animate-pulse">ทำงานอยู่</Badge>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 align-top">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-start justify-start pt-0.5">
                                          <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                                            {calculateDuration(row.check_in, row.check_out)}
                                          </span>
                                        </div>
                                      )}
                                      {row.hasLeave && (
                                        <div className="h-[44px] flex flex-col items-start justify-start pt-0.5">
                                          {row.leave_status === 'approved' && (
                                            <Badge className="bg-[#00b368] hover:bg-[#009b5a] text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full"><CheckCircle className="w-3.5 h-3.5 mr-1" />อนุมัติแล้ว</Badge>
                                          )}
                                          {row.leave_status === 'rejected' && (
                                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full"><XCircle className="w-3.5 h-3.5 mr-1" />ไม่อนุมัติ</Badge>
                                          )}
                                          {(!row.leave_status || row.leave_status === 'pending') && (
                                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full animate-pulse"><Clock className="w-3.5 h-3.5 mr-1" />รออนุมัติ</Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-4 pr-6 align-top text-right">
                                    <div className="flex flex-col items-end gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex justify-end gap-3 items-start pt-0.5">
                                          {row.latitude && row.longitude && (
                                            <div className="text-blue-500 hover:text-blue-700 cursor-pointer transition-colors" onClick={() => openGoogleMaps(row.latitude, row.longitude)}>
                                              <MapPin className="h-5 w-5" strokeWidth={2.5} />
                                            </div>
                                          )}
                                          {row.check_in_photo ? (
                                            <div className="text-orange-500 hover:text-orange-700 cursor-pointer transition-colors" onClick={() => { setCurrentPhoto(row.check_in_photo); setPhotoModalOpen(true); }}>
                                              <ImageIcon className="h-5 w-5" strokeWidth={2.5} />
                                            </div>
                                          ) : (
                                            <span className="w-5 text-center text-zinc-300">-</span>
                                          )}
                                        </div>
                                      )}

                                      {row.hasLeave && (
                                        <div className="flex flex-col items-end text-right gap-1 mb-1">
                                          <span className="text-[15px] font-bold text-blue-600 dark:text-blue-400 leading-none">ลางาน</span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="h-5 text-[10px] px-2 rounded-full font-medium bg-blue-50 text-blue-500 border-blue-200">
                                              {row.leave_type === 'full' ? 'เต็มวัน' : row.leave_type === 'morning' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย'}
                                            </Badge>
                                            <span className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5 max-w-[160px] truncate" title={row.reason}>
                                              {row.reason || '-'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                </>
                              )}

                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>

                {groupedRecords.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30">
                    <div className="text-[13px] text-zinc-500 font-medium">
                      แสดง {indexOfFirstRecord + 1} - {Math.min(indexOfLastRecord, groupedRecords.length)} จาก {groupedRecords.length} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-9 text-[13px] px-3 dark:border-zinc-700 dark:bg-zinc-900 rounded-lg">
                        <ChevronLeft className="h-4 w-4 mr-1" />ก่อนหน้า
                      </Button>
                      <div className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 min-w-[3.5rem] text-center">
                        {currentPage} / {totalPages}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-9 text-[13px] px-3 dark:border-zinc-700 dark:bg-zinc-900 rounded-lg">
                        ถัดไป<ChevronRight className="h-4 w-4 ml-1" />
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
                {currentPhoto && <img src={currentPhoto} alt="Verification Proof" className="w-full h-full object-contain" />}
              </div>
              <div className="p-3 bg-zinc-950 flex justify-between items-center border-t border-zinc-900">
                <span className="text-xs font-medium text-white">รูปถ่ายยืนยัน</span>
                <Button variant="secondary" size="sm" onClick={() => setPhotoModalOpen(false)} className="h-8 text-xs dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100">ปิด</Button>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}