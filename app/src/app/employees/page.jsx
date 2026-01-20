"use client";

import { useState, useEffect, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Edit2, Trash2, Eye, EyeOff, Search, UserPlus, FileText, X, Phone, Mail, MapPin, Calendar, CreditCard, Briefcase, User } from "lucide-react";

export default function Page() {
  const POSITIONS = ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานทั่วไป", "พนักงานในครัว"];
  const STATUS = ["ทำงานอยู่", "ไม่ได้ทำงาน"];
  const EMPLOYMENT_TYPES = ["Full-time", "Part-time"];

  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePosition, setActivePosition] = useState("ทั้งหมด");
  const [activeStatus, setActiveStatus] = useState("ทั้งหมด");

  // State สำหรับ Dialog แก้ไข/เพิ่ม
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // State สำหรับ Dialog ดูข้อมูล (View Only)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  // Form States
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");
  const [empType, setEmpType] = useState("");

  const normalizeEmployee = (raw, idx = 0) => {
    const id = raw?.employee_id ?? raw?.id ?? null;
    const fallbackId = `temp_${idx}`;
    return {
      id: id ?? fallbackId,
      name_th: raw?.name_th ?? raw?.name ?? "",
      name_en: raw?.name_en ?? "",
      nickname: raw?.nickname ?? "",
      id_card_number: raw?.id_card_number ?? "",
      birth_date: raw?.birth_date ? raw.birth_date.split('T')[0] : "",
      address: raw?.address ?? "",
      phone: raw?.phone ?? "",
      line_id: raw?.line_id ?? "",
      email: raw?.email ?? "",
      position: raw?.position ?? "",
      employment_type: raw?.employment_type ?? "",
      start_date: raw?.start_date ? raw.start_date.split('T')[0] : "",
      status: raw?.status ?? "",
      salary: Number(raw?.salary ?? 0),
    };
  };

  const refreshEmployees = async () => {
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setEmployees(list.map((e, i) => normalizeEmployee(e, i)));
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  useEffect(() => {
    refreshEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    const q = (searchQuery || "").toLowerCase().trim();
    if (activePosition !== "ทั้งหมด") list = list.filter(emp => emp.position === activePosition);
    if (activeStatus !== "ทั้งหมด") list = list.filter(emp => emp.status === activeStatus);
    if (q) {
      list = list.filter((emp) =>
        (emp.name_th || "").toLowerCase().includes(q) ||
        (emp.nickname || "").toLowerCase().includes(q) ||
        (emp.id_card_number || "").includes(q)
      );
    }
    return list;
  }, [employees, searchQuery, activePosition, activeStatus]);

  const handleAddClick = () => {
    setEditingEmployee(null);
    setPosition(POSITIONS[2]);
    setStatus(STATUS[0]);
    setEmpType(EMPLOYMENT_TYPES[0]);
    setShowPassword(false);
    setOpen(true);
  };

  const handleEditClick = (emp) => {
    setEditingEmployee(emp);
    setPosition(emp.position || POSITIONS[2]);
    setStatus(emp.status || STATUS[0]);
    setEmpType(emp.employment_type || EMPLOYMENT_TYPES[0]);
    setShowPassword(false);
    setOpen(true);
  };

  const handleViewClick = (emp) => {
    setViewingEmployee(emp);
    setViewOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (!id || !confirm("คุณต้องการลบพนักงานนี้หรือไม่?")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) refreshEmployees();
      else alert("ลบไม่สำเร็จ");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name_th: formData.get("name_th"),
      name_en: formData.get("name_en"),
      nickname: formData.get("nickname") || null,
      id_card_number: formData.get("id_card_number") || null,
      birth_date: formData.get("birth_date") || null,
      address: formData.get("address"),
      phone: formData.get("phone"),
      line_id: formData.get("line_id"),
      email: formData.get("email"),
      password: formData.get("password") || "",
      position: position,
      status: status,
      employment_type: empType,
      start_date: formData.get("start_date") || null,
      salary: Number(formData.get("salary")),
    };

    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : "/api/employees";
      const res = await fetch(url, {
        method: editingEmployee ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        refreshEmployees();
      } else {
        const errorData = await res.json();
        alert(`ผิดพลาด: ${errorData.error}`);
      }
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const getStatusBadge = (st) => {
    if (st === "ทำงานอยู่") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/20";
    if (st === "ไม่ได้ทำงาน") return "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/20";
    return "bg-zinc-500/10 text-zinc-500 dark:bg-zinc-500/5 dark:text-zinc-400";
  }

  // Helper สำหรับดึงตัวอักษรย่อชื่อ
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black">

        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b 
          bg-white/90 backdrop-blur-md dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ข้อมูลพนักงาน</h1>
          </div>
          <Button onClick={handleAddClick} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/20">
            <UserPlus className="mr-2 h-4 w-4" /> เพิ่มพนักงานใหม่
          </Button>
        </header>

        <main className="p-6 min-h-[calc(100vh-4rem)] space-y-6 bg-zinc-50/30 dark:bg-black">

          <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="ค้นหาชื่อ, ชื่อเล่น หรือ เลขบัตร ปชช...."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">ตำแหน่งงาน</Label>
                  <Select value={activePosition} onValueChange={setActivePosition}>
                    <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      <SelectItem value="ทั้งหมด">แสดงทั้งหมด</SelectItem>
                      {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">สถานะการทำงาน</Label>
                  <Select value={activeStatus} onValueChange={setActiveStatus}>
                    <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      <SelectItem value="ทั้งหมด">แสดงทั้งหมด</SelectItem>
                      {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                  <TableRow className="dark:border-zinc-800">
                    <TableHead className="dark:text-zinc-400">ชื่อ-นามสกุล</TableHead>
                    <TableHead className="dark:text-zinc-400">ตำแหน่ง</TableHead>
                    <TableHead className="dark:text-zinc-400">เบอร์โทร / Line</TableHead>
                    <TableHead className="dark:text-zinc-400">ประเภทการจ้าง</TableHead>
                    <TableHead className="dark:text-zinc-400">วันที่เริ่มงาน</TableHead>
                    <TableHead className="dark:text-zinc-400">สถานะ</TableHead>
                    <TableHead className="text-right dark:text-zinc-400">ค่าจ้าง</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-zinc-500">ไม่พบข้อมูลพนักงาน</TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp, idx) => (
                      <TableRow key={emp.id || idx} className="dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                        <TableCell>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-100">{emp.name_th}</div>
                          <div className="text-xs text-zinc-500 uppercase">{emp.name_en}</div>
                          {/* ✅ 1. เอา ID ออกจากตรงนี้เรียบร้อย */}
                        </TableCell>
                        <TableCell className="dark:text-zinc-300">{emp.position}</TableCell>
                        <TableCell>
                          <div className="text-sm dark:text-zinc-300">{emp.phone}</div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-500">Line: {emp.line_id || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal dark:border-zinc-800 dark:text-zinc-400">
                            {emp.employment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                          {emp.start_date ? new Date(emp.start_date).toLocaleDateString('th-TH') : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadge(emp.status)} border shadow-none font-medium`}>
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {Number(emp.salary).toLocaleString()} ฿
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(emp)} className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:bg-zinc-800">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(emp)} className="h-8 w-8 text-blue-500 hover:text-blue-400 dark:hover:bg-blue-500/10">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(emp.id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 dark:hover:bg-rose-500/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ✅ 3. ปรับดีไซน์ Dialog ดูข้อมูลให้สะอาดตา */}
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl">
              
              {viewingEmployee && (
                <>
                  {/* Header Area */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 px-8 py-8 flex flex-col items-center border-b dark:border-zinc-800">
                    <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
                      {getInitials(viewingEmployee.name_en || viewingEmployee.name_th)}
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{viewingEmployee.name_th}</h2>
                    <p className="text-sm text-zinc-500 font-medium tracking-wide uppercase mt-1 mb-3">{viewingEmployee.name_en}</p>
                    <Badge className={`${getStatusBadge(viewingEmployee.status)} px-3 py-1`}>{viewingEmployee.status}</Badge>
                  </div>

                  {/* Scrollable Content */}
                  <div className="max-h-[60vh] overflow-y-auto px-8 py-6 space-y-8">
                    
                    {/* Section: ข้อมูลส่วนตัว */}
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" /> ข้อมูลส่วนตัว
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">ชื่อเล่น</span>
                            <span className="text-sm font-medium">{viewingEmployee.nickname || "-"}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">วันเกิด</span>
                            <span className="text-sm font-medium">{viewingEmployee.birth_date ? new Date(viewingEmployee.birth_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">เบอร์โทรศัพท์</span>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span className="text-sm font-medium">{viewingEmployee.phone}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">อีเมล</span>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-zinc-400" />
                              <span className="text-sm font-medium break-all">{viewingEmployee.email}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">Line ID</span>
                            <span className="text-sm font-medium text-emerald-600">{viewingEmployee.line_id || "-"}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">เลขบัตรประชาชน</span>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3 h-3 text-zinc-400" />
                              <span className="text-sm font-medium">{viewingEmployee.id_card_number || "-"}</span>
                            </div>
                         </div>
                         <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">ที่อยู่</span>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3 h-3 text-zinc-400 mt-1 shrink-0" />
                              <span className="text-sm font-medium leading-relaxed">{viewingEmployee.address || "-"}</span>
                            </div>
                         </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: การทำงาน */}
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> ข้อมูลการทำงาน
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">ตำแหน่ง</span>
                            <span className="text-sm font-medium">{viewingEmployee.position}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">ประเภทการจ้าง</span>
                            <span className="text-sm font-medium">{viewingEmployee.employment_type}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">วันที่เริ่มงาน</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span className="text-sm font-medium">{viewingEmployee.start_date ? new Date(viewingEmployee.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-400">เงินเดือน/ค่าจ้าง</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{viewingEmployee.salary.toLocaleString()} บาท</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t dark:border-zinc-800 flex justify-end">
                    <Button variant="outline" onClick={() => setViewOpen(false)} className="w-full sm:w-auto">ปิดหน้าต่าง</Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog Form สำหรับ Add/Edit */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-zinc-950 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-xl dark:text-zinc-100">{editingEmployee ? "แก้ไขทะเบียนพนักงาน" : "ลงทะเบียนพนักงานใหม่"}</DialogTitle>
                <DialogDescription className="dark:text-zinc-500">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อประสิทธิภาพของระบบ</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-8 py-4">

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-500/5 py-1 px-2 rounded w-fit">
                    1. ข้อมูลส่วนตัว
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">ชื่อ-นามสกุล (ไทย)</Label>
                      <Input name="name_th" defaultValue={editingEmployee?.name_th} placeholder="วชิรชัย สุวรรณ์" required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">Full Name (English)</Label>
                      <Input name="name_en" defaultValue={editingEmployee?.name_en} placeholder="Wachirachai Suwan" className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">ชื่อเล่น</Label>
                      <Input name="nickname" defaultValue={editingEmployee?.nickname} placeholder="ชื่อเล่น" className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">เลขบัตรประชาชน (13 หลัก)</Label>
                      <Input
                        name="id_card_number"
                        defaultValue={editingEmployee?.id_card_number}
                        placeholder="เลข 13 หลัก"
                        maxLength={13}
                        inputMode="numeric"
                        className="dark:bg-zinc-900 dark:border-zinc-800"
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/[^0-9]/g, '');
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">วัน/เดือน/ปีเกิด</Label>
                      <Input type="date" name="birth_date" defaultValue={editingEmployee?.birth_date} required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">เบอร์โทรศัพท์</Label>
                      <Input name="phone" defaultValue={editingEmployee?.phone} placeholder="08x-xxx-xxxx" required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">Line ID</Label>
                      <Input name="line_id" defaultValue={editingEmployee?.line_id} placeholder="ID สำหรับติดต่อ" className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="dark:text-zinc-400">ที่อยู่ปัจจุบัน</Label>
                      <Textarea name="address" defaultValue={editingEmployee?.address} placeholder="บ้านเลขที่, แขวง, เขต..." rows={2} className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                  </div>
                </div>

                <Separator className="dark:bg-zinc-800" />

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/5 py-1 px-2 rounded w-fit">
                    2. การจ้างงาน
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">ตำแหน่ง</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">ประเภทการจ้าง</Label>
                      <Select value={empType} onValueChange={setEmpType}>
                        <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">วันที่เริ่มงาน</Label>
                      <Input type="date" name="start_date" defaultValue={editingEmployee?.start_date} required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">สถานะปัจจุบัน</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">อัตราค่าจ้าง (บาท)</Label>
                      <Input type="number" name="salary" defaultValue={editingEmployee?.salary} required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    {/* ✅ 2. เอา Shift Availability ออกจากฟอร์มแล้ว */}
                  </div>
                </div>

                <Separator className="dark:bg-zinc-800" />

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-500/5 py-1 px-2 rounded w-fit">
                    3. บัญชีผู้ใช้
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">อีเมล (Username)</Label>
                      <Input type="email" name="email" defaultValue={editingEmployee?.email} required className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">รหัสผ่าน</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder={editingEmployee ? "เว้นว่างถ้าไม่เปลี่ยน" : "ตั้งรหัสผ่าน"}
                          className="pr-10 dark:bg-zinc-900 dark:border-zinc-800"
                        />
                        <button
                          type="button"
                          className="absolute top-2.5 right-3 text-zinc-500 hover:text-zinc-300"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-4 border-t dark:border-zinc-800">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="dark:text-zinc-400">ยกเลิก</Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">บันทึกข้อมูล</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}