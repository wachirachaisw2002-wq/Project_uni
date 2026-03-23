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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Edit2, Trash2, Eye, EyeOff, Search, UserPlus, Phone, Mail, MapPin, Calendar as CalendarIcon, CreditCard, Briefcase, User, Loader2 } from "lucide-react";

const POSITIONS = ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานทั่วไป", "พนักงานในครัว"];
const STATUS = ["ทำงานอยู่", "ไม่ได้ทำงาน"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time"];

export default function Page() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ search: "", position: "ทั้งหมด", status: "ทั้งหมด" });

  const [viewDialog, setViewDialog] = useState({ open: false, data: null });
  const [formDialog, setFormDialog] = useState({ open: false, data: null });

  const [formState, setFormState] = useState({
    position: POSITIONS[2], status: STATUS[0], empType: EMPLOYMENT_TYPES[0], birthDate: undefined, startDate: new Date()
  });
  const [showPassword, setShowPassword] = useState(false);

  const normalizeEmployee = (raw, idx = 0) => ({
    id: raw?.employee_id ?? raw?.id ?? `temp_${idx}`,
    name_th: raw?.name_th ?? raw?.name ?? "",
    name_en: raw?.name_en ?? "",
    nickname: raw?.nickname ?? "",
    id_card_number: raw?.id_card_number ?? "",
    birth_date: raw?.birth_date?.split('T')[0] ?? "",
    address: raw?.address ?? "",
    phone: raw?.phone ?? "",
    line_id: raw?.line_id ?? "",
    email: raw?.email ?? "",
    position: raw?.position ?? "",
    employment_type: raw?.employment_type ?? "",
    start_date: raw?.start_date?.split('T')[0] ?? "",
    status: raw?.status ?? "",
    salary: Number(raw?.salary ?? 0),
  });

  const refreshEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEmployees((Array.isArray(data) ? data : []).map(normalizeEmployee));
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshEmployees(); }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = filters.search.toLowerCase().trim();
      const matchPos = filters.position === "ทั้งหมด" || emp.position === filters.position;
      const matchStatus = filters.status === "ทั้งหมด" || emp.status === filters.status;
      const matchSearch = !q || [emp.name_th, emp.nickname, emp.id_card_number].some(v => (v || "").toLowerCase().includes(q));

      return matchPos && matchStatus && matchSearch;
    });
  }, [employees, filters]);

  const openModal = (emp = null) => {
    setFormDialog({ open: true, data: emp });
    setFormState({
      position: emp?.position || POSITIONS[2],
      status: emp?.status || STATUS[0],
      empType: emp?.employment_type || EMPLOYMENT_TYPES[0],
      birthDate: emp?.birth_date ? new Date(emp.birth_date) : undefined,
      startDate: emp?.start_date ? new Date(emp.start_date) : new Date(),
    });
    setShowPassword(false);
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
    const fd = new FormData(e.currentTarget);
    const formatDate = (date) => date ? format(date, "yyyy-MM-dd") : null;

    const payload = {
      name_th: fd.get("name_th"),
      name_en: fd.get("name_en"),
      nickname: fd.get("nickname") || null,
      id_card_number: fd.get("id_card_number") || null,
      birth_date: formatDate(formState.birthDate),
      address: fd.get("address"),
      phone: fd.get("phone"),
      line_id: fd.get("line_id"),
      email: fd.get("email"),
      password: fd.get("password") || "",
      position: formState.position,
      status: formState.status,
      employment_type: formState.empType,
      start_date: formatDate(formState.startDate),
      salary: Number(fd.get("salary")),
    };

    try {
      const isEdit = !!formDialog.data;
      const url = isEdit ? `/api/employees/${formDialog.data.id}` : "/api/employees";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormDialog({ open: false, data: null });
        refreshEmployees();
      } else {
        const err = await res.json();
        alert(`ผิดพลาด: ${err.error}`);
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const getStatusBadge = (st) => {
    if (st === "ทำงานอยู่") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/20";
    if (st === "ไม่ได้ทำงาน") return "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400 dark:border-rose-500/20";
    return "bg-zinc-500/10 text-zinc-500 dark:bg-zinc-500/5 dark:text-zinc-400";
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b bg-white/90 backdrop-blur-md dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ข้อมูลพนักงาน</h1>
          </div>
          <Button onClick={() => openModal()} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/20">
            <UserPlus className="mr-2 h-4 w-4" /> เพิ่มพนักงานใหม่
          </Button>
        </header>

        <main className="p-6 min-h-[calc(100vh-4rem)] space-y-6 bg-zinc-50/30 dark:bg-black">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดรายชื่อพนักงาน...</p>
            </div>
          ) : (
            <>
              <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                      value={filters.search}
                      onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                      className="pl-9 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">ตำแหน่งงาน</Label>
                      <Select value={filters.position} onValueChange={(v) => setFilters(p => ({ ...p, position: v }))}>
                        <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          <SelectItem value="ทั้งหมด">แสดงทั้งหมด</SelectItem>
                          {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">สถานะการทำงาน</Label>
                      <Select value={filters.status} onValueChange={(v) => setFilters(p => ({ ...p, status: v }))}>
                        <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800"><SelectValue /></SelectTrigger>
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
                        filteredEmployees.map((emp) => (
                          <TableRow key={emp.id} className="dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                            <TableCell>
                              <div className="font-semibold text-zinc-800 dark:text-zinc-100">{emp.name_th}</div>
                              <div className="text-xs text-zinc-500 uppercase">{emp.name_en}</div>
                            </TableCell>
                            <TableCell className="dark:text-zinc-300">{emp.position}</TableCell>
                            <TableCell>
                              <div className="text-sm dark:text-zinc-300">{emp.phone}</div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-500">Line: {emp.line_id || "-"}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal dark:border-zinc-800 dark:text-zinc-400">{emp.employment_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                              {emp.start_date ? new Date(emp.start_date).toLocaleDateString('th-TH') : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusBadge(emp.status)} border shadow-none font-medium`}>{emp.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {Number(emp.salary).toLocaleString()} ฿
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setViewDialog({ open: true, data: emp })} className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:bg-zinc-800"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => openModal(emp)} className="h-8 w-8 text-blue-500 hover:text-blue-400 dark:hover:bg-blue-500/10"><Edit2 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(emp.id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={viewDialog.open} onOpenChange={(v) => setViewDialog({ open: v, data: viewDialog.data })}>
                <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0 dark:bg-zinc-950 dark:border-zinc-800 rounded-2xl">

                  <DialogTitle className="sr-only">รายละเอียดข้อมูลพนักงาน</DialogTitle>
                  <DialogDescription className="sr-only">แสดงข้อมูลส่วนตัวและการทำงานของพนักงาน</DialogDescription>

                  {viewDialog.data && (() => {
                    const emp = viewDialog.data;
                    return (
                      <>
                        <div className="bg-zinc-50 dark:bg-zinc-900 px-8 py-8 flex flex-col items-center border-b dark:border-zinc-800">
                          <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-3xl font-bold mb-4 shadow-sm">
                            {(emp.name_en || emp.name_th).charAt(0).toUpperCase()}
                          </div>
                          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{emp.name_th}</h2>
                          <p className="text-sm text-zinc-500 font-medium tracking-wide uppercase mt-1 mb-3">{emp.name_en}</p>
                          <Badge className={`${getStatusBadge(emp.status)} px-3 py-1`}>{emp.status}</Badge>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto px-8 py-6 space-y-8">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-4 h-4" /> ข้อมูลส่วนตัว</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">ชื่อเล่น</span><span className="text-sm font-medium">{emp.nickname || "-"}</span></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">วันเกิด</span><span className="text-sm font-medium">{emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}</span></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">เบอร์โทรศัพท์</span><div className="flex items-center gap-2"><Phone className="w-3 h-3 text-zinc-400" /><span className="text-sm font-medium">{emp.phone}</span></div></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">อีเมล</span><div className="flex items-center gap-2"><Mail className="w-3 h-3 text-zinc-400" /><span className="text-sm font-medium break-all">{emp.email}</span></div></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">Line ID</span><span className="text-sm font-medium text-emerald-600">{emp.line_id || "-"}</span></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">เลขบัตรประชาชน</span><div className="flex items-center gap-2"><CreditCard className="w-3 h-3 text-zinc-400" /><span className="text-sm font-medium">{emp.id_card_number || "-"}</span></div></div>
                              <div className="col-span-1 sm:col-span-2 flex flex-col gap-1"><span className="text-xs text-zinc-400">ที่อยู่</span><div className="flex items-start gap-2"><MapPin className="w-3 h-3 text-zinc-400 mt-1 shrink-0" /><span className="text-sm font-medium leading-relaxed">{emp.address || "-"}</span></div></div>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> ข้อมูลการทำงาน</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">ตำแหน่ง</span><span className="text-sm font-medium">{emp.position}</span></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">ประเภทการจ้าง</span><span className="text-sm font-medium">{emp.employment_type}</span></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">วันที่เริ่มงาน</span><div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3 text-zinc-400" /><span className="text-sm font-medium">{emp.start_date ? new Date(emp.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}</span></div></div>
                              <div className="flex flex-col gap-1"><span className="text-xs text-zinc-400">เงินเดือน/ค่าจ้าง</span><span className="text-sm font-bold text-zinc-900 dark:text-white">{emp.salary.toLocaleString()} บาท</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t dark:border-zinc-800 flex justify-end">
                          <Button variant="outline" onClick={() => setViewDialog({ open: false, data: null })} className="w-full sm:w-auto">ปิดหน้าต่าง</Button>
                        </div>
                      </>
                    );
                  })()}
                </DialogContent>
              </Dialog>

              <Dialog open={formDialog.open} onOpenChange={(v) => setFormDialog({ open: v, data: formDialog.data })}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-zinc-950 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-xl dark:text-zinc-100">{formDialog.data ? "แก้ไขทะเบียนพนักงาน" : "ลงทะเบียนพนักงานใหม่"}</DialogTitle>
                    <DialogDescription className="dark:text-zinc-500">กรุณากรอกข้อมูล</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-8 py-4">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-500/5 py-1 px-2 rounded w-fit">1. ข้อมูลส่วนตัว</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>ชื่อ-นามสกุล</Label><Input name="name_th" defaultValue={formDialog.data?.name_th} required className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="space-y-2"><Label>Full Name</Label><Input name="name_en" defaultValue={formDialog.data?.name_en} className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="space-y-2"><Label>ชื่อเล่น</Label><Input name="nickname" defaultValue={formDialog.data?.nickname} className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="space-y-2">
                          <Label>เลขบัตรประชาชน</Label>
                          <Input name="id_card_number" defaultValue={formDialog.data?.id_card_number} maxLength={13} inputMode="numeric" className="dark:bg-zinc-900 dark:border-zinc-800" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label>วัน/เดือน/ปีเกิด</Label>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={`h-9 justify-start font-normal text-xs w-full dark:bg-zinc-950 dark:border-zinc-800 ${!formState.birthDate && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                {formState.birthDate ? format(formState.birthDate, "dd/MM/yyyy", { locale: th }) : <span>เลือกวันเกิด</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                              <Calendar mode="single" selected={formState.birthDate} onSelect={(d) => d && setFormState(p => ({ ...p, birthDate: d }))} disabled={(d) => d > new Date() || d < new Date("1900-01-01")} defaultMonth={formState.birthDate || new Date()} locale={th} className="p-3" captionLayout="dropdown" fromYear={1900} toYear={new Date().getFullYear()} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2"><Label>เบอร์โทรศัพท์</Label><Input name="phone" defaultValue={formDialog.data?.phone} required className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="space-y-2"><Label>Line ID</Label><Input name="line_id" defaultValue={formDialog.data?.line_id} className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="col-span-1 md:col-span-2 space-y-2"><Label>ที่อยู่ปัจจุบัน</Label><Textarea name="address" defaultValue={formDialog.data?.address} rows={2} className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                      </div>
                    </div>

                    <Separator className="dark:bg-zinc-800" />

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/5 py-1 px-2 rounded w-fit">2. การจ้างงาน</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ตำแหน่ง</Label>
                          <Select value={formState.position} onValueChange={(v) => setFormState(p => ({ ...p, position: v }))}>
                            <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>ประเภทการจ้าง</Label>
                          <Select value={formState.empType} onValueChange={(v) => setFormState(p => ({ ...p, empType: v }))}>
                            <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label>วันที่เริ่มงาน</Label>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={`h-9 justify-start font-normal text-xs w-full dark:bg-zinc-950 dark:border-zinc-800 ${!formState.startDate && "text-muted-foreground"}`}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                {formState.startDate ? format(formState.startDate, "dd/MM/yyyy", { locale: th }) : <span>เลือกวันที่เริ่มงาน</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                              <Calendar mode="single" selected={formState.startDate} onSelect={(d) => d && setFormState(p => ({ ...p, startDate: d }))} defaultMonth={formState.startDate || new Date()} locale={th} className="p-3" captionLayout="dropdown" fromYear={1990} toYear={new Date().getFullYear() + 5} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>สถานะปัจจุบัน</Label>
                          <Select value={formState.status} onValueChange={(v) => setFormState(p => ({ ...p, status: v }))}>
                            <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>อัตราค่าจ้าง (บาท)</Label><Input type="number" name="salary" defaultValue={formDialog.data?.salary} required className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                      </div>
                    </div>

                    <Separator className="dark:bg-zinc-800" />

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-500/5 py-1 px-2 rounded w-fit">3. บัญชีผู้ใช้</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>อีเมล</Label><Input type="email" name="email" defaultValue={formDialog.data?.email} required className="dark:bg-zinc-900 dark:border-zinc-800" /></div>
                        <div className="space-y-2">
                          <Label>รหัสผ่าน</Label>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} name="password" className="pr-10 dark:bg-zinc-900 dark:border-zinc-800" />
                            <button type="button" className="absolute top-2.5 right-3 text-zinc-500 hover:text-zinc-300" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-4 border-t dark:border-zinc-800">
                      <Button type="button" variant="ghost" onClick={() => setFormDialog({ open: false, data: null })} className="dark:text-zinc-400">ยกเลิก</Button>
                      <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">บันทึกข้อมูล</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}