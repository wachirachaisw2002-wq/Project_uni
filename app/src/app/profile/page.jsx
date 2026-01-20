"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
// ✅ Import Loader2 เพิ่ม
import {
   Loader2, Save, MapPin, Phone, Briefcase,
   CreditCard, Clock, Eye, EyeOff, Calendar as CalendarIcon,
   Mail, Shield, CheckCircle2, Building2
} from "lucide-react";

// --- Imports สำหรับปฏิทิน ---
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
   const router = useRouter();
   const [isLoading, setIsLoading] = useState(true); // ✅ Loading State
   const [isSaving, setIsSaving] = useState(false);
   const [showPassword, setShowPassword] = useState(false);

   const [formData, setFormData] = useState({
      name_th: "", name_en: "", nickname: "", birth_date: "",
      id_card_number: "", address: "", email: "", phone: "", line_id: "",
      position: "", employment_type: "", start_date: "", status: "",
      salary: 0, shift_availability: "", password: "",
   });

   const [displayData, setDisplayData] = useState({
      name_th: "", name_en: "", nickname: "", position: "",
      employment_type: "", status: "", salary: 0, start_date: "", email: ""
   });

   useEffect(() => {
      const fetchProfile = async () => {
         const userId = localStorage.getItem("userId");
         if (!userId) { router.push("/"); return; }

         try {
            const res = await fetch(`/api/employees/${userId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            const cleanData = {
               name_th: data.name_th || "",
               name_en: data.name_en || "",
               nickname: data.nickname || "",
               birth_date: data.birth_date ? data.birth_date.split('T')[0] : "",
               id_card_number: data.id_card_number || "",
               address: data.address || "",
               email: data.email || "",
               phone: data.phone || "",
               line_id: data.line_id || "",
               position: data.position || "",
               employment_type: data.employment_type || "",
               start_date: data.start_date ? data.start_date.split('T')[0] : "",
               status: data.status || "",
               salary: Number(data.salary) || 0,
               shift_availability: data.shift_availability || "",
               password: "",
            };

            setFormData(cleanData);
            setDisplayData(cleanData);

         } catch (error) {
            console.error(error);
         } finally {
            setIsLoading(false); // ✅ โหลดเสร็จ
         }
      };
      fetchProfile();
   }, [router]);

   const handleChange = (e) => {
      const { name, value } = e.target;
      if (name === "id_card_number") {
         setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
         return;
      }
      setFormData(prev => ({ ...prev, [name]: value }));
   };

   const handleDateSelect = (date) => {
      if (!date) return;
      const formattedDate = format(date, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, birth_date: formattedDate }));
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSaving(true);
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      try {
         const res = await fetch(`/api/employees/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (res.ok) {
            setDisplayData(formData);
            setTimeout(() => {
               alert("บันทึกข้อมูลเรียบร้อยแล้ว");
            }, 800);
         } else {
            const err = await res.json();
            alert(`ผิดพลาด: ${err.error}`);
         }
      } catch (error) {
         alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
         setIsSaving(false);
      }
   };

   // ✅ ส่วน Loading Screen
   if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center h-screen gap-4 bg-zinc-50 dark:bg-black">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
            <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูลส่วนตัว...</p>
         </div>
      );
   }

   const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : "US";

   return (
      <SidebarProvider>
         <AppSidebar />
         <SidebarInset className="bg-zinc-50/50 dark:bg-black">

            <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm dark:bg-black dark:border-zinc-800">
               <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden md:block"></div>
                  <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ข้อมูลส่วนตัว</h1>
               </div>
               <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="rounded-full bg-orange-600 hover:bg-orange-700 text-white px-6 shadow-md shadow-orange-500/20"
               >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  บันทึก
               </Button>
            </header>

            <main className="p-6 md:p-8 max-w-6xl mx-auto min-h-[calc(100vh-4rem)]">

               {/* --- Profile Header (ใช้ displayData) --- */}
               <div className="relative mb-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">

                  {/* Cover Image */}
                  <div className="h-32 w-full bg-gradient-to-r from-orange-100 via-rose-100 to-amber-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900"></div>

                  <div className="px-6 py-6 md:px-8">
                     <div className="flex flex-col gap-2">
                        {/* Name & Nickname (ใช้ displayData) */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                           <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                              {displayData.name_th || "กำลังโหลด..."}
                           </h1>
                           {displayData.nickname && (
                              <Badge variant="secondary" className="w-fit bg-orange-50 text-orange-700 border-orange-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                 ชื่อเล่น: {displayData.nickname}
                              </Badge>
                           )}
                        </div>

                        {/* English Name & Position (ใช้ displayData) */}
                        <div className="flex flex-col md:flex-row md:items-center text-zinc-500 font-medium gap-1 md:gap-3 text-sm md:text-base">
                           <span className="text-zinc-400">{displayData.name_en || "-"}</span>
                           <span className="hidden md:inline text-zinc-300">•</span>
                           <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                              <Briefcase className="w-3.5 h-3.5" />
                              {displayData.position}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                  {/* --- Left Column: Summary Cards (ใช้ displayData) --- */}
                  <div className="lg:col-span-4 space-y-6">

                     {/* Job Status Card */}
                     <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden ring-1 ring-zinc-100 dark:ring-zinc-800">
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                           <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">สถานะการจ้าง</span>
                           <Badge variant={displayData.status === 'ทำงานอยู่' ? 'default' : 'destructive'} className="rounded-full">
                              {displayData.status}
                           </Badge>
                        </div>
                        <div className="p-6 space-y-6">
                           <div className="flex items-start gap-4">
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                 <Building2 className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs text-zinc-500 mb-1">ค่าตอบแทน</p>
                                 <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {Number(displayData.salary).toLocaleString()} <span className="text-xs font-normal text-zinc-400">บาท</span>
                                 </p>
                              </div>
                           </div>

                           <div className="flex items-start gap-4">
                              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                                 <CalendarIcon className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs text-zinc-500 mb-1">เริ่มงานเมื่อ</p>
                                 <p className="font-semibold text-zinc-900 dark:text-zinc-100">{displayData.start_date || "-"}</p>
                              </div>
                           </div>
                        </div>
                     </Card>

                     {/* Security Card */}
                     <Card className="border-none shadow-sm bg-zinc-900 text-white rounded-2xl overflow-hidden">
                        <div className="p-6">
                           <div className="flex items-center gap-2 mb-6 text-zinc-400">
                              <Shield className="w-5 h-5" />
                              <span className="text-xs font-bold uppercase tracking-widest">ความปลอดภัย</span>
                           </div>

                           <div className="space-y-5">
                              <div className="space-y-2">
                                 <Label className="text-zinc-400 text-xs">อีเมลเข้าสู่ระบบ</Label>
                                 <div className="flex items-center gap-3 text-sm font-medium">
                                    <Mail className="w-4 h-4 text-zinc-500" />
                                    {displayData.email}
                                 </div>
                              </div>
                              <Separator className="bg-white/10" />
                              <div className="space-y-2">
                                 <Label className="text-zinc-400 text-xs">รหัสผ่าน</Label>
                                 <div className="relative">
                                    <Input
                                       type={showPassword ? "text" : "password"}
                                       name="password"
                                       value={formData.password}
                                       onChange={handleChange}
                                       placeholder="เปลี่ยนรหัสผ่านใหม่..."
                                       className="pr-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-0 focus:border-orange-500 rounded-xl"
                                    />
                                    <button
                                       type="button"
                                       onClick={() => setShowPassword(!showPassword)}
                                       className="absolute top-2.5 right-3 text-zinc-400 hover:text-white transition-colors"
                                    >
                                       {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                 </div>
                                 <p className="text-[10px] text-zinc-500">*เว้นว่างไว้หากไม่ต้องการเปลี่ยน</p>
                              </div>
                           </div>
                        </div>
                     </Card>
                  </div>

                  {/* --- Right Column: Editable Forms (ใช้ formData) --- */}
                  <div className="lg:col-span-8 space-y-8">

                     {/* Personal Info Form */}
                     <section>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                           <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                           ข้อมูลส่วนตัว
                        </h3>
                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800">
                           <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              <div className="space-y-2">
                                 <Label className="text-zinc-500">ชื่อ (ภาษาไทย)</Label>
                                 <Input name="name_th" value={formData.name_th} onChange={handleChange} className="bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-zinc-500">ชื่อ-นามสกุล (ภาษาอังกฤษ)</Label>
                                 <Input name="name_en" value={formData.name_en} onChange={handleChange} className="bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white" />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-zinc-500">ชื่อเล่น</Label>
                                 <Input name="nickname" value={formData.nickname} onChange={handleChange} className="bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white" />
                              </div>

                              {/* Calendar Component */}
                              <div className="space-y-2 flex flex-col">
                                 <Label className="text-zinc-500">วัน/เดือน/ปี เกิด</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                       <Button
                                          variant={"outline"}
                                          className={cn(
                                             "w-full pl-3 text-left font-normal bg-zinc-50 border-zinc-200 rounded-xl h-10 hover:bg-white",
                                             !formData.birth_date && "text-muted-foreground"
                                          )}
                                       >
                                          {formData.birth_date ? (
                                             format(new Date(formData.birth_date), "dd/MM/yyyy", { locale: th })
                                          ) : (
                                             <span>เลือกวันที่</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                       </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                       <Calendar
                                          mode="single"
                                          selected={formData.birth_date ? new Date(formData.birth_date) : undefined}
                                          onSelect={handleDateSelect}
                                          disabled={(date) =>
                                             date > new Date() || date < new Date("1900-01-01")
                                          }
                                          initialFocus
                                          locale={th}
                                       />
                                    </PopoverContent>
                                 </Popover>
                              </div>

                              <div className="col-span-1 md:col-span-2 space-y-2">
                                 <Label className="text-zinc-500">เลขบัตรประชาชน</Label>
                                 <div className="relative">
                                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input
                                       name="id_card_number"
                                       value={formData.id_card_number}
                                       onChange={handleChange}
                                       maxLength={13}
                                       className="pl-10 bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white font-mono tracking-wider"
                                       placeholder="xxxxxxxxxxxxx"
                                    />
                                 </div>
                              </div>
                           </CardContent>
                        </Card>
                     </section>

                     {/* Contact Info Form */}
                     <section>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                           <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                           การติดต่อ
                        </h3>
                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-zinc-100 dark:ring-zinc-800">
                           <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              <div className="space-y-2">
                                 <Label className="text-zinc-500">เบอร์โทรศัพท์</Label>
                                 <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input name="phone" value={formData.phone} onChange={handleChange} className="pl-10 bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white" />
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-zinc-500">Line ID</Label>
                                 <Input name="line_id" value={formData.line_id} onChange={handleChange} className="bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white" placeholder="@id" />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-2">
                                 <Label className="text-zinc-500">ที่อยู่ปัจจุบัน</Label>
                                 <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                                    <Textarea
                                       name="address"
                                       value={formData.address}
                                       onChange={handleChange}
                                       rows={3}
                                       className="pl-10 resize-none bg-zinc-50 border-zinc-200 rounded-xl focus:bg-white leading-relaxed"
                                    />
                                 </div>
                              </div>
                           </CardContent>
                        </Card>
                     </section>
                  </div>
               </div>
            </main>
         </SidebarInset>
      </SidebarProvider>
   );
}