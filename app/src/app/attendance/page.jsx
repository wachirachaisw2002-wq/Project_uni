"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, LogIn, LogOut, CalendarDays,
  History, MapPin, Camera, Clock, Settings, Save, Map, UserCog, CalendarPlus,
  CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Image as ImageIcon
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getDistance } from 'geolib';

const Meter = 50;

export default function AttendancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const [history, setHistory] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [userRole, setUserRole] = useState("");

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [leaveForm, setLeaveForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "full",
    reason: ""
  });

  const [shopConfig, setShopConfig] = useState({
    lat: 16.4633962,
    lng: 102.8276568,
    workStartTime: "09:00",
    workEndTime: "18:00"
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const isManagerOrOwner = userRole === "เจ้าของร้าน" || userRole === "ผู้จัดการร้าน";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) { router.push("/"); return; }

    try {
      const res = await fetch(`/api/attendance?userId=${userId}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setHistory(data.history || []);
      setPendingLeaves(data.pendingLeaves || []);
      setIsCheckedIn(data.isCheckedIn);
      setCurrentSession(data.currentSession);
      setUserRole(data.employee?.position || "พนักงานทั่วไป");

      if (data.shopConfig) {
        setShopConfig({
          lat: parseFloat(data.shopConfig.latitude),
          lng: parseFloat(data.shopConfig.longitude),
          workStartTime: data.shopConfig.work_start_time.substring(0, 5),
          workEndTime: data.shopConfig.work_end_time.substring(0, 5)
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [router]);

  const groupedHistory = useMemo(() => {
    const group = {};

    history.forEach(record => {
      const dateObj = new Date(record.work_date || record.date);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      if (!group[dateKey]) {
        group[dateKey] = {
          id: record.id, work_date: dateKey,
          hasWork: false, check_in: null, check_out: null, latitude: null, longitude: null, check_in_photo: null,
          hasLeave: false, leave_type: null, reason: null, leave_status: null,
          isAbsent: false,
          isDayOff: false 
        };
      }

      if (record.type === 'leave') {
        group[dateKey].hasLeave = true;
        group[dateKey].leave_type = record.leave_type;
        group[dateKey].reason = record.reason;
        group[dateKey].leave_status = record.leave_status;
      } else {
        group[dateKey].hasWork = true;
        group[dateKey].check_in = record.check_in;
        group[dateKey].check_out = record.check_out;
        group[dateKey].latitude = record.latitude;
        group[dateKey].longitude = record.longitude;
        group[dateKey].check_in_photo = record.check_in_photo;
      }
    });

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;

      if (!group[dateKey]) {
        const isMonday = d.getDay() === 1;

        group[dateKey] = {
          id: isMonday ? `dayoff_${dateKey}` : `absent_${dateKey}`,
          work_date: dateKey,
          hasWork: false,
          hasLeave: false,
          isAbsent: !isMonday, 
          isDayOff: isMonday   
        };
      }
    }

    return Object.values(group).sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
  }, [history]);

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

  const formatDateTime = (dateStr, type = 'time') => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const options = { timeZone: 'Asia/Bangkok' };
    if (type === 'time') return date.toLocaleTimeString('th-TH', { ...options, hour: '2-digit', minute: '2-digit', hour12: false });
    return date.toLocaleDateString('th-TH', { ...options, day: 'numeric', month: 'short', year: '2-digit' });
  };

  const openGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const getCheckInStatus = (timeStr) => {
    if (!timeStr) return { text: "-", style: "text-zinc-400" };
    const date = new Date(timeStr);
    const [h, m] = shopConfig.workStartTime.split(':').map(Number);
    const target = new Date(date); target.setHours(h, m, 0, 0);
    return date <= target
      ? { text: "เข้างานตรงเวลา", style: "bg-emerald-50 text-emerald-500 border-emerald-200" }
      : { text: "เข้างานสาย", style: "bg-rose-50 text-rose-500 border-rose-200" };
  };

  const getCheckOutStatus = (timeStr) => {
    if (!timeStr) {
      return { text: "กำลังทำงาน...", style: "bg-amber-50 text-amber-500 border-amber-200 animate-pulse" };
    }
    const date = new Date(timeStr);
    const [h, m] = shopConfig.workEndTime.split(':').map(Number);
    const target = new Date(date); target.setHours(h, m, 0, 0);
    return date < target
      ? { text: "เลิกงานก่อนเวลา", style: "bg-orange-50 text-orange-500 border-orange-200" }
      : { text: "เลิกงานช้า", style: "bg-blue-50 text-blue-500 border-blue-200" };
  };

  const compressImage = (file) => new Promise(res => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = e => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d");
        c.width = 800; c.height = (img.height / img.width) * 800;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.7));
      };
    };
  });

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedImage = await compressImage(file);
        setPhoto(resizedImage);
      } catch (error) { alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ"); }
    }
  };

  const handleToggleAttendance = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    if (!isCheckedIn) {
      const today = new Date().toLocaleDateString('en-CA');
      const alreadyDone = history.some(r => r.type !== 'leave' && formatDateTime(r.work_date, 'date') === formatDateTime(today, 'date') && r.check_out);
      if (alreadyDone) { alert("คุณได้ลงเวลาสำหรับวันนี้เรียบร้อยแล้ว"); return; }
      if (!photo) { alert("กรุณาถ่ายรูปยืนยันตัวตนก่อนเข้างาน"); return; }
    }

    setIsProcessing(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }));
      const dist = getDistance({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, { latitude: shopConfig.lat, longitude: shopConfig.lng });

      if (!isCheckedIn && dist > Meter) { alert(`คุณอยู่นอกพื้นที่ร้าน! (ห่าง ${dist} เมตร)\nต้องอยู่ในรัศมี ${Meter} เมตร จากพิกัดที่ตั้งไว้`); setIsProcessing(false); return; }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, action: isCheckedIn ? "check_out" : "check_in",
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          photo: isCheckedIn ? null : photo,
          timestamp: new Date().toISOString()
        }),
      });
      if (res.ok) { await fetchAttendance(); setPhoto(null); }
    } catch (e) { alert("ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS"); } finally { setIsProcessing(false); }
  };

  const handleLeaveSubmit = async () => {
    if (!leaveForm.reason.trim()) { alert("กรุณาระบุเหตุผลการลา"); return; }
    setIsSubmittingLeave(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave_request", userId: localStorage.getItem("userId"), ...leaveForm }),
      });
      if (res.ok) { alert("ส่งคำขอลาสำเร็จ"); setLeaveForm({ ...leaveForm, reason: "" }); await fetchAttendance(); }
    } catch (e) { } finally { setIsSubmittingLeave(false); }
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    if (!confirm("ยืนยันการดำเนินการ?")) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_leave_status", recordId: id, status }),
      });
      if (res.ok) fetchAttendance();
    } catch (e) { }
  };

  const handleUpdateShopLocation = async () => {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }));
      setShopConfig(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
      alert("ดึงพิกัดปัจจุบันสำเร็จ กรุณากดบันทึกการตั้งค่าเพื่อยืนยัน");
    } catch (error) { alert("ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS"); }
  };

  const handleSaveShopConfig = async () => {
    const userId = localStorage.getItem("userId");
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "update_location", updatedBy: userId, ...shopConfig })
      });
      if (res.ok) { alert("บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว"); setIsEditingConfig(false); }
    } catch (error) { alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้"); }
  };

  const indexOfLastRecord = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - ITEMS_PER_PAGE;
  const currentRecords = groupedHistory.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(groupedHistory.length / ITEMS_PER_PAGE);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black h-screen flex flex-col overflow-hidden w-full">
        <header className="flex-none z-50 flex h-16 w-full items-center justify-between px-6 border-b bg-white dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="text-sm font-bold">บันทึกเวลาเข้า-ออกงาน</h1></div>
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 gap-1.5 py-1 px-3">
            <UserCog className="w-3.5 h-3.5" />{userRole || "กำลังโหลด..."}
          </Badge>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-50/50 dark:bg-black w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-4"><Loader2 className="animate-spin text-orange-600" /><p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลด...</p></div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">

              {isManagerOrOwner && (
                <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 shadow-sm">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-orange-100 dark:border-orange-900/30">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800"><Settings className="w-4 h-4" /> ตั้งค่าข้อมูลร้าน</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingConfig(!isEditingConfig)} className="h-8 text-xs text-orange-600">
                      {isEditingConfig ? "ปิด" : "แก้ไขข้อมูลร้าน"}
                    </Button>
                  </CardHeader>
                  {isEditingConfig && (
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold">พิกัดร้าน</label>
                          <div className="flex gap-2">
                            <Input value={shopConfig.lat} onChange={e => setShopConfig({ ...shopConfig, lat: e.target.value })} className="text-xs h-8" />
                            <Input value={shopConfig.lng} onChange={e => setShopConfig({ ...shopConfig, lng: e.target.value })} className="text-xs h-8" />
                          </div>
                          <Button onClick={handleUpdateShopLocation} variant="outline" size="sm" className="w-full h-8 text-xs">ดึงพิกัดปัจจุบัน</Button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold">เวลาทำการ</label>
                          <div className="flex items-center gap-2">
                            <Input type="time" value={shopConfig.workStartTime} onChange={e => setShopConfig({ ...shopConfig, workStartTime: e.target.value })} className="text-xs h-8" />
                            <span className="text-xs">ถึง</span>
                            <Input type="time" value={shopConfig.workEndTime} onChange={e => setShopConfig({ ...shopConfig, workEndTime: e.target.value })} className="text-xs h-8" />
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleSaveShopConfig} className="w-full bg-orange-600 text-white hover:bg-orange-700 h-9 text-xs">บันทึก</Button>
                    </CardContent>
                  )}
                </Card>
              )}

              {isManagerOrOwner && pendingLeaves.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm border-2">
                  <CardHeader className="py-3 px-4 border-b border-blue-100 dark:border-blue-900/50">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800 dark:text-blue-400">
                      <CalendarPlus className="w-4 h-4" />
                      คำขอลาหยุดงานที่รออนุมัติ ({pendingLeaves.length} รายการ)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader className="bg-blue-100/30 dark:bg-blue-900/20">
                          <TableRow className="dark:border-zinc-800">
                            <TableHead className="text-xs h-10 font-semibold text-blue-900 dark:text-blue-300">พนักงาน</TableHead>
                            <TableHead className="text-xs h-10 font-semibold text-blue-900 dark:text-blue-300">วันที่ลา</TableHead>
                            <TableHead className="text-xs h-10 font-semibold text-blue-900 dark:text-blue-300">ประเภท</TableHead>
                            <TableHead className="text-xs h-10 font-semibold text-blue-900 dark:text-blue-300">เหตุผล</TableHead>
                            <TableHead className="text-xs h-10 font-semibold text-center text-blue-900 dark:text-blue-300">จัดการ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingLeaves.map((leave) => (
                            <TableRow key={leave.id} className="dark:border-zinc-800 hover:bg-blue-50/50">
                              <TableCell className="py-3 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{leave.employee_name || "ไม่ระบุชื่อ"}</TableCell>
                              <TableCell className="py-3 text-[13px] text-zinc-600 dark:text-zinc-400">{formatDate(leave.work_date)}</TableCell>
                              <TableCell className="py-3">
                                <Badge variant="outline" className="bg-white text-[10px] px-2 py-0.5 font-medium rounded-full border-blue-200 text-blue-500">
                                  {leave.leave_type === 'full' ? 'ลาเต็มวัน' : leave.leave_type === 'morning' ? 'ลาครึ่งวันเช้า' : 'ลาครึ่งวันบ่าย'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 text-[13px] text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate" title={leave.reason}>{leave.reason}</TableCell>
                              <TableCell className="py-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')} className="h-8 text-[11px] px-3 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700"><CheckCircle className="w-3.5 h-3.5 mr-1" /> อนุมัติ</Button>
                                  <Button size="sm" variant="outline" onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')} className="h-8 text-[11px] px-3 bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700"><XCircle className="w-3.5 h-3.5 mr-1" /> ไม่อนุมัติ</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-3xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <CardContent className="p-8 flex flex-col justify-between h-full relative z-10 min-h-[220px]">
                    <div>
                      <p className="text-zinc-400 font-medium mb-1 flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4" />{currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-mono mt-3">{currentTime.toLocaleTimeString('th-TH', { hour12: false })}</h2>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center gap-2 text-[13px] text-zinc-300">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>ตรวจสอบพิกัด & รูปถ่าย</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl ring-1 ring-zinc-100 dark:ring-zinc-800 flex flex-col justify-center items-center p-8 text-center">
                  {!isCheckedIn && (
                    <div className="mb-6 w-full flex flex-col items-center">
                      <div className="relative w-28 h-28 bg-zinc-50 dark:bg-zinc-800 rounded-3xl overflow-hidden border-2 border-dashed flex items-center justify-center mb-3">
                        {photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-zinc-400 flex flex-col items-center"><Camera className="w-8 h-8 mb-2" /><span className="text-[11px] font-medium">รูปยืนยัน</span></div>}
                        <input type="file" accept="image/*" capture="user" className="hidden" id="cam-input" onChange={handlePhotoCapture} />
                      </div>
                      <label htmlFor="cam-input" className="cursor-pointer text-[13px] font-semibold text-orange-600 bg-orange-50 px-4 py-2 rounded-full hover:bg-orange-100">ถ่ายรูป</label>
                    </div>
                  )}

                  <div className="mb-6 w-full">
                    {!isCheckedIn && photo ? null : (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${isCheckedIn ? 'bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100' : 'hidden'}`}>
                        {isCheckedIn && <Clock className="w-8 h-8" />}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {isCheckedIn ? "คุณกำลังปฏิบัติงาน" : (photo ? "พร้อมเข้างาน" : "กรุณาถ่ายรูปเพื่อเข้างาน")}
                    </h3>
                    <p className="text-zinc-500 text-[13px] mt-1.5 mb-2">
                      {isCheckedIn ? `เริ่มงานเมื่อ ${formatTime(currentSession?.check_in)}` : "ระบบจะตรวจสอบ GPS และรูปถ่ายก่อนบันทึก"}
                    </p>
                  </div>

                  <Button
                    size="lg" onClick={handleToggleAttendance} disabled={isProcessing || (!isCheckedIn && !photo)}
                    className={`w-full max-w-xs h-14 text-base font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${isCheckedIn ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 text-white" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white"}`}
                  >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : isCheckedIn ? <><LogOut className="mr-2 h-5 w-5" /> ลงเวลาออกงาน</> : <><LogIn className="mr-2 h-5 w-5" /> ลงเวลาเข้างาน</>}
                  </Button>
                </Card>
              </div>

              <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 ring-1 ring-zinc-100 dark:ring-zinc-800">
                <div className="flex items-center gap-2 mb-5"><CalendarPlus className="w-5 h-5 text-blue-600" /><h3 className="text-base font-bold">ส่งคำขอลาหยุดงาน</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3 flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">วันที่ต้องการลา</label>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10 text-[13px] w-full justify-start font-normal dark:bg-zinc-950 dark:border-zinc-800">
                          <CalendarDays className="mr-2 h-4 w-4 text-zinc-400" />{format(new Date(leaveForm.date), "dd/MM/yyyy", { locale: th })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-xl dark:border-zinc-800">
                        <Calendar mode="single" selected={new Date(leaveForm.date)} onSelect={d => d && setLeaveForm({ ...leaveForm, date: format(d, "yyyy-MM-dd") })} locale={th} className="p-3" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="md:col-span-3 flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">ประเภทการลา</label>
                    <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} className="h-10 border rounded-md px-3 text-[13px] bg-transparent dark:border-zinc-800 dark:text-zinc-100">
                      <option value="full">เต็มวัน (Full Day)</option><option value="morning">ครึ่งวันเช้า (Morning)</option><option value="afternoon">ครึ่งวันบ่าย (Afternoon)</option>
                    </select>
                  </div>
                  <div className="md:col-span-4 flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">เหตุผลการลา</label>
                    <Input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="ระบุเหตุผล..." className="h-10 text-[13px] dark:bg-zinc-950 dark:border-zinc-800" />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleLeaveSubmit} disabled={isSubmittingLeave} className="w-full bg-blue-600 text-white h-10 text-[13px] rounded-lg shadow-md shadow-blue-600/20 hover:bg-blue-700">
                      {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{isSubmittingLeave ? "กำลังส่ง..." : "ส่งคำขอลา"}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1"><History className="w-4 h-4 text-zinc-500" /><h3 className="text-sm font-bold">ประวัติการเข้า-ออกงาน / การลา</h3></div>

                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl ring-1 ring-zinc-100 overflow-hidden dark:ring-zinc-800">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                      <TableHeader className="bg-transparent">
                        <TableRow className="hover:bg-transparent dark:border-zinc-800">
                          <TableHead className="pl-6 h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 w-[120px]">วันที่</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">เวลาเข้างาน</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">เวลาออกงาน</TableHead>
                          <TableHead className="h-14 text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 text-center">รวมเวลา / สถานะ</TableHead>
                          <TableHead className="pr-6 h-14 text-[13px] font-semibold text-right text-zinc-600 dark:text-zinc-400 w-[160px]">หลักฐาน / เหตุผล</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-16 text-[13px] text-zinc-500">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="h-6 w-6 opacity-20" />
                                <span>ไม่พบประวัติการลงเวลา</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentRecords.map((row) => (
                            <TableRow
                              key={row.work_date}
                              className={`dark:border-zinc-800 transition-colors group h-16 
                                ${row.isAbsent ? "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50"
                                  : row.isDayOff ? "bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                                    : "dark:hover:bg-zinc-800/20"}`}
                            >

                              <TableCell className="pl-6 py-5 align-top">
                                <div className="flex flex-col mt-2.5">
                                  <span className="text-[14px] font-medium text-zinc-800 dark:text-zinc-300">
                                    {formatDate(row.work_date)}
                                  </span>
                                </div>
                              </TableCell>

                              {row.isDayOff ? (
                                <>
                                  <TableCell className="py-5 align-top">
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[15px] font-bold text-zinc-500 leading-none">ร้านหยุด</span>
                                      <Badge variant="outline" className="h-5 text-[10px] px-2 mt-0.5 rounded-full font-medium bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">วันหยุดประจำสัปดาห์</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-5 align-top"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                  <TableCell className="py-5 align-top text-center"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                  <TableCell className="py-5 pr-6 align-top text-right"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                </>
                              ) : row.isAbsent ? (
                                <>
                                  <TableCell className="py-5 align-top">
                                    <div className="flex flex-col items-start gap-1 mt-1">
                                      <span className="text-[15px] font-bold text-rose-500 leading-none">ขาดงาน</span>
                                      <Badge variant="outline" className="h-5 text-[10px] px-2 mt-0.5 rounded-full font-medium bg-rose-50 text-rose-500 border-rose-200">ไม่ได้ลงเวลา</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-5 align-top"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                  <TableCell className="py-5 align-top text-center"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                  <TableCell className="py-5 pr-6 align-top text-right"><span className="text-zinc-300 dark:text-zinc-600 mt-2 block">-</span></TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="py-5 align-top">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-start justify-between">
                                          <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none">{formatTime(row.check_in)}</span>
                                          <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-full font-medium ${getCheckInStatus(row.check_in).style}`}>{getCheckInStatus(row.check_in).text}</Badge>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-5 align-top">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-start justify-between">
                                          {row.check_out ? (
                                            <>
                                              <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-none">{formatTime(row.check_out)}</span>
                                              <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-full font-medium ${getCheckOutStatus(row.check_out).style}`}>{getCheckOutStatus(row.check_out).text}</Badge>
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

                                  <TableCell className="py-5 align-top text-center">
                                    <div className="flex flex-col gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex flex-col items-center justify-start pt-0.5">
                                          <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{calculateDuration(row.check_in, row.check_out)}</span>
                                        </div>
                                      )}
                                      {row.hasLeave && (
                                        <div className="h-[44px] flex flex-col items-center justify-start pt-0.5">
                                          {row.leave_status === 'approved' && <Badge className="bg-[#00b368] hover:bg-[#009b5a] text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full"><CheckCircle className="w-3.5 h-3.5 mr-1" />อนุมัติแล้ว</Badge>}
                                          {row.leave_status === 'rejected' && <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full"><XCircle className="w-3.5 h-3.5 mr-1" />ไม่อนุมัติ</Badge>}
                                          {(!row.leave_status || row.leave_status === 'pending') && <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent text-[11px] px-3 py-0.5 shadow-sm font-medium rounded-full animate-pulse"><Clock className="w-3.5 h-3.5 mr-1" />รออนุมัติ</Badge>}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-5 pr-6 align-top text-right">
                                    <div className="flex flex-col items-end gap-4 mt-1">
                                      {row.hasWork && (
                                        <div className="h-[44px] flex justify-end gap-3 items-start pt-0.5">
                                          {row.latitude && row.longitude && (
                                            <div className="text-blue-500 hover:text-blue-700 cursor-pointer transition-colors" onClick={() => openGoogleMaps(row.latitude, row.longitude)}><MapPin className="h-5 w-5" strokeWidth={2.5} /></div>
                                          )}
                                          {row.check_in_photo ? (
                                            <div className="text-orange-500 hover:text-orange-700 cursor-pointer transition-colors" onClick={() => { setCurrentPhoto(row.check_in_photo); setPhotoModalOpen(true); }}><ImageIcon className="h-5 w-5" strokeWidth={2.5} /></div>
                                          ) : <span className="w-5 text-center text-zinc-300">-</span>}
                                        </div>
                                      )}

                                      {row.hasLeave && (
                                        <div className="flex flex-col items-end text-right gap-1 mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[15px] font-bold text-blue-600 dark:text-blue-400 leading-none">ลางาน</span>
                                            <Badge variant="outline" className="h-5 text-[10px] px-2 rounded-full font-medium bg-blue-50 text-blue-500 border-blue-200">
                                              {row.leave_type === 'full' ? 'เต็มวัน' : row.leave_type === 'morning' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย'}
                                            </Badge>
                                          </div>
                                          <span className="text-[12px] text-zinc-600 dark:text-zinc-400 mt-0.5 max-w-[160px] truncate" title={row.reason}>{row.reason || '-'}</span>
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
                </Card>

                {groupedHistory.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="text-[12px] text-zinc-500 font-medium">
                      แสดง {indexOfFirstRecord + 1} - {Math.min(indexOfLastRecord, groupedHistory.length)} จาก {groupedHistory.length} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8 text-xs px-2 rounded-md">
                        <ChevronLeft className="h-4 w-4 mr-1" />ก่อนหน้า
                      </Button>
                      <div className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400 min-w-[3rem] text-center">
                        {currentPage} / {totalPages}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 text-xs px-2 rounded-md">
                        ถัดไป<ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

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