"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Loader2, LogIn, LogOut, CalendarDays,
  History, Timer, MapPin, Camera, Clock, Settings, Save, Map, UserCog
} from "lucide-react";
import { getDistance } from 'geolib';

const Meter = 50; 

export default function AttendancePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [photo, setPhoto] = useState(null);

  const [userRole, setUserRole] = useState("");

  const [shopConfig, setShopConfig] = useState({
    lat: 16.4633962,
    lng: 102.8276568,
    workStartTime: "09:00",
    workEndTime: "18:00"
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const isManagerOrOwner = userRole === "เจ้าของร้าน" || userRole === "ผู้จัดการร้าน";

  useEffect(() => {
    setCurrentTime(new Date());
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
      setIsCheckedIn(data.isCheckedIn);
      setCurrentSession(data.currentSession);

      if (data.employee && data.employee.position) {
        setUserRole(data.employee.position);
      } else {
        setUserRole("พนักงานทั่วไป");
      }

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

  useEffect(() => {
    fetchAttendance();
  }, [router]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
      };
    });
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedImage = await compressImage(file);
        setPhoto(resizedImage);
      } catch (error) {
        console.error("Error compressing image:", error);
        alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
      }
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("เบราว์เซอร์นี้ไม่รองรับ GPS"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "-";
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours} ชม. ${minutes} นาที`;
  };

  const formatDateTime = (dateStr, type = 'time') => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const options = { timeZone: 'Asia/Bangkok' };
    if (type === 'time') {
      return date.toLocaleTimeString('th-TH', { ...options, hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return date.toLocaleDateString('th-TH', { ...options, day: 'numeric', month: 'short', year: '2-digit' });
  };

  const handleUpdateShopLocation = async () => {
    try {
      const pos = await getCurrentLocation();
      setShopConfig(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }));
      alert("ดึงพิกัดปัจจุบันสำเร็จ กรุณากดบันทึกการตั้งค่าเพื่อยืนยัน");
    } catch (error) {
      alert("ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง");
    }
  };

  const handleSaveShopConfig = async () => {
    const userId = localStorage.getItem("userId");
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "update_location",
          updatedBy: userId,
          lat: shopConfig.lat,
          lng: shopConfig.lng,
          workStartTime: shopConfig.workStartTime,
          workEndTime: shopConfig.workEndTime
        })
      });

      if (res.ok) {
        alert("บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว");
        setIsEditingConfig(false);
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    }
  };

  const handleToggleAttendance = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    if (!isCheckedIn) {
      const todayDateString = new Date().toLocaleDateString('en-CA');
      const hasCheckedInToday = history.some(record => {
        if (!record.check_in) return false;
        const recordDate = new Date(record.check_in).toLocaleDateString('en-CA');
        return recordDate === todayDateString && record.check_out !== null;
      });

      if (hasCheckedInToday) {
        alert("คุณได้ทำการลงเวลาเข้าและออกงานสำหรับวันนี้ไปแล้ว (จำกัด 1 ครั้งต่อวัน)");
        return;
      }
    }

    setIsProcessing(true);
    let locationData = { lat: null, lng: null };

    if (!isCheckedIn) {
      if (!photo) {
        alert("กรุณาถ่ายรูปยืนยันตัวตนก่อนเข้างาน");
        setIsProcessing(false);
        return;
      }

      try {
        const pos = await getCurrentLocation();
        locationData = pos;

        const distance = getDistance(
          { latitude: pos.lat, longitude: pos.lng },
          { latitude: shopConfig.lat, longitude: shopConfig.lng }
        );

        if (distance > Meter) {
          alert(`คุณอยู่นอกพื้นที่ร้าน! (ห่าง ${distance.toFixed(0)} เมตร)\nต้องอยู่ในรัศมี ${Meter} เมตร จากพิกัดที่ตั้งไว้`);
          setIsProcessing(false);
          return;
        }
      } catch (error) {
        console.error(error);
        alert("ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS");
        setIsProcessing(false);
        return;
      }
    }

    const action = isCheckedIn ? "check_out" : "check_in";

    const clientTimestamp = new Date().toISOString();

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action,
          lat: locationData.lat,
          lng: locationData.lng,
          photo: isCheckedIn ? null : photo,
          timestamp: clientTimestamp
        }),
      });

      if (res.ok) {
        await fetchAttendance();
        if (!isCheckedIn) {
          alert("เข้างานสำเร็จ");
          setPhoto(null);
        }
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black h-screen flex flex-col overflow-hidden w-full">

        <header className="flex-none z-50 flex h-16 w-full items-center justify-between px-4 border-b bg-white dark:bg-zinc-950 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden md:block"></div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">บันทึกเวลาเข้า-ออกงาน</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1.5 py-1 px-3">
              <UserCog className="w-3.5 h-3.5" />
              {userRole || "กำลังโหลด..."}
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 sm:p-4 bg-zinc-50/30 dark:bg-black w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">

              {isManagerOrOwner && (
                <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 shadow-sm">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-orange-100 dark:border-orange-900/30">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800 dark:text-orange-400">
                      <Settings className="w-4 h-4" /> ตั้งค่าข้อมูลร้าน
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingConfig(!isEditingConfig)}
                      className="h-8 text-xs text-orange-600 hover:bg-orange-100"
                    >
                      {isEditingConfig ? "ปิดการตั้งค่า" : "แก้ไขข้อมูลร้าน"}
                    </Button>
                  </CardHeader>

                  {isEditingConfig && (
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" /> พิกัดร้าน (ละติจูด, ลองจิจูด)
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={shopConfig.lat}
                              onChange={(e) => setShopConfig({ ...shopConfig, lat: e.target.value })}
                              placeholder="Latitude"
                              className="text-xs h-8"
                            />
                            <Input
                              type="text"
                              value={shopConfig.lng}
                              onChange={(e) => setShopConfig({ ...shopConfig, lng: e.target.value })}
                              placeholder="Longitude"
                              className="text-xs h-8"
                            />
                          </div>
                          <Button onClick={handleUpdateShopLocation} variant="outline" size="sm" className="w-full h-8 text-xs">
                            <Map className="w-3 h-3 mr-2" /> ดึงพิกัดร้านจากตำแหน่งปัจจุบัน
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" /> เวลาทำการมาตรฐาน
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={shopConfig.workStartTime}
                              onChange={(e) => setShopConfig({ ...shopConfig, workStartTime: e.target.value })}
                              className="text-xs h-8"
                            />
                            <span className="text-xs text-zinc-500">ถึง</span>
                            <Input
                              type="time"
                              value={shopConfig.workEndTime}
                              onChange={(e) => setShopConfig({ ...shopConfig, workEndTime: e.target.value })}
                              className="text-xs h-8"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500">ใช้สำหรับแจ้งเตือนพนักงาน หรือคำนวณการมาสาย</p>
                        </div>
                      </div>

                      <Button onClick={handleSaveShopConfig} className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-xs">
                        <Save className="w-3.5 h-3.5 mr-2" /> บันทึกการตั้งค่าร้านค้า
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10 min-h-[200px]">
                    <div>
                      <p className="text-zinc-400 font-medium mb-1 flex items-center gap-2 text-xs">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-mono mt-2">
                        {currentTime.toLocaleTimeString('th-TH', { hour12: false })}
                      </h2>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span>ตรวจสอบพิกัด & รูปถ่าย</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800 flex flex-col justify-center items-center p-6 text-center">

                  {!isCheckedIn && (
                    <div className="mb-4 w-full flex flex-col items-center">
                      <div className="relative w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center mb-2">
                        {photo ? (
                          <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-zinc-400 flex flex-col items-center">
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-[10px]">รูปยืนยัน</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          id="camera-input"
                          className="hidden"
                          onChange={handlePhotoCapture}
                        />
                      </div>
                      <label htmlFor="camera-input" className="cursor-pointer text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors">
                        {photo ? "ถ่ายใหม่" : "กดเพื่อถ่ายรูป"}
                      </label>
                    </div>
                  )}

                  <div className="mb-4 w-full">
                    {!isCheckedIn && photo ? null : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${isCheckedIn ? 'bg-emerald-100 text-emerald-600' : 'hidden'}`}>
                        {isCheckedIn && <Clock className="w-8 h-8" />}
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {isCheckedIn ? "คุณกำลังปฏิบัติงาน" : (photo ? "พร้อมเข้างาน" : "กรุณาถ่ายรูปเพื่อเข้างาน")}
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1 mb-3">
                      {isCheckedIn
                        ? `เริ่มงานเมื่อ ${formatDateTime(currentSession?.check_in)}`
                        : "ระบบจะตรวจสอบ GPS และรูปถ่ายก่อนบันทึก"}
                    </p>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleToggleAttendance}
                    disabled={isProcessing || (!isCheckedIn && !photo)}
                    className={`w-full max-w-xs h-12 text-base font-bold rounded-xl shadow-lg transition-all active:scale-95 ${isCheckedIn
                      ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                      : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                      }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      isCheckedIn ? <><LogOut className="mr-2 h-5 w-5" /> ลงเวลาออกงาน</> : <><LogIn className="mr-2 h-5 w-5" /> ลงเวลาเข้างาน</>
                    )}
                  </Button>
                </Card>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <History className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">ประวัติการเข้า-ออกงาน</h3>
                </div>

                <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                        <TableRow className="dark:border-zinc-800">
                          <TableHead className="w-[120px] text-xs h-10">วันที่</TableHead>
                          <TableHead className="text-xs h-10">เวลาเข้า</TableHead>
                          <TableHead className="text-xs h-10">เวลาออก</TableHead>
                          <TableHead className="text-xs h-10">รวมเวลา</TableHead>
                          <TableHead className="text-right text-xs h-10">สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-xs text-zinc-500">
                              ยังไม่มีประวัติการเข้างาน
                            </TableCell>
                          </TableRow>
                        ) : (
                          history.map((record) => (
                            <TableRow key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 dark:border-zinc-800">
                              <TableCell className="font-medium text-zinc-700 dark:text-zinc-300 text-xs py-2">
                                {formatDateTime(record.work_date, 'date')}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  {formatDateTime(record.check_in)}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                {record.check_out ? (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                    {formatDateTime(record.check_out)}
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 italic text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-xs">
                                  <Timer className="w-3.5 h-3.5" />
                                  {record.check_out
                                    ? calculateDuration(record.check_in, record.check_out)
                                    : <span className="text-emerald-600 font-medium animate-pulse">กำลังทำงาน...</span>
                                  }
                                </div>
                              </TableCell>
                              <TableCell className="text-right py-2">
                                {record.check_out ? (
                                  <Badge variant="outline" className="text-zinc-500 border-zinc-200 bg-zinc-50 text-[10px] h-5 px-1.5">
                                    เสร็จสิ้น
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-5 px-1.5">
                                    ทำงานอยู่
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}