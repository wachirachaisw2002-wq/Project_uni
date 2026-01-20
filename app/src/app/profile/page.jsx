"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
   Loader2, Save, Phone, MapPin,
   Calendar as CalendarIcon, Mail, Shield,
   CreditCard, User, Lock, Eye, EyeOff
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
   const router = useRouter();
   const [isLoading, setIsLoading] = useState(true);
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
            setIsLoading(false);
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

   if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center h-screen gap-4 bg-zinc-50 dark:bg-black">
            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
         </div>
      );
   }

   const getInitials = (name) => {
      if (!name) return "พง";
      return name.trim().substring(0, 2);
   };

   return (
      <SidebarProvider>
         <AppSidebar />
         <SidebarInset className="bg-zinc-50/50 dark:bg-black min-h-screen">

            <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 dark:bg-black/80 dark:border-zinc-800">
               <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">โปรไฟล์พนักงาน</h1>
               </div>
               <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  size="sm"
                  className="rounded-full bg-orange-600 hover:bg-orange-700 text-white px-6"
               >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  บันทึก
               </Button>
            </header>

            <main className="p-4 md:p-8 max-w-5xl mx-auto">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  <div className="lg:col-span-4 space-y-6">
                     <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden sticky top-24">
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-4 pt-8">
                           <Avatar className="h-24 w-24 border-4 border-white shadow-md dark:border-zinc-800">
                              <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl font-bold">
                                 {getInitials(displayData.name_th)}
                              </AvatarFallback>
                           </Avatar>

                           <div className="space-y-1">
                              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                 {displayData.name_th || "ไม่ระบุชื่อ"}
                              </h2>
                              <p className="text-sm text-zinc-500 font-medium">
                                 {displayData.name_en}
                              </p>
                           </div>

                           <Badge variant={displayData.status === 'ทำงานอยู่' ? 'default' : 'secondary'} className="px-4 py-1 rounded-full">
                              {displayData.status}
                           </Badge>

                           <div className="w-full pt-4 space-y-3">
                              <Separator />
                              <div className="flex justify-between text-sm">
                                 <span className="text-zinc-500">ตำแหน่ง</span>
                                 <span className="font-medium">{displayData.position}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                 <span className="text-zinc-500">เงินเดือน</span>
                                 <span className="font-medium">{Number(displayData.salary).toLocaleString()} บ.</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                 <span className="text-zinc-500">เริ่มงาน</span>
                                 <span className="font-medium">{displayData.start_date || "-"}</span>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                     <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <CardHeader>
                           <CardTitle className="text-lg flex items-center gap-2">
                              <User className="h-5 w-5 text-orange-600" />
                              ข้อมูลส่วนตัวและการติดต่อ
                           </CardTitle>
                           <CardDescription>แก้ไขข้อมูลส่วนตัวของคุณที่นี่</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <Label>ชื่อ (ภาษาไทย)</Label>
                                 <Input name="name_th" value={formData.name_th} onChange={handleChange} className="bg-zinc-50/50" />
                              </div>
                              <div className="space-y-2">
                                 <Label>ชื่อ (ภาษาอังกฤษ)</Label>
                                 <Input name="name_en" value={formData.name_en} onChange={handleChange} className="bg-zinc-50/50" />
                              </div>
                              <div className="space-y-2">
                                 <Label>ชื่อเล่น</Label>
                                 <Input name="nickname" value={formData.nickname} onChange={handleChange} className="bg-zinc-50/50" />
                              </div>
                              <div className="space-y-2">
                                 <Label>วันเกิด</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                       <Button variant="outline" className={cn("w-full pl-3 text-left font-normal bg-zinc-50/50", !formData.birth_date && "text-muted-foreground")}>
                                          {formData.birth_date ? format(new Date(formData.birth_date), "dd/MM/yyyy", { locale: th }) : <span>เลือกวันที่</span>}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                       </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                       <Calendar mode="single" selected={formData.birth_date ? new Date(formData.birth_date) : undefined} onSelect={handleDateSelect} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus locale={th} />
                                    </PopoverContent>
                                 </Popover>
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-2">
                                 <Label>เลขบัตรประชาชน</Label>
                                 <div className="relative">
                                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input name="id_card_number" value={formData.id_card_number} onChange={handleChange} maxLength={13} className="pl-10 bg-zinc-50/50 font-mono" placeholder="xxxxxxxxxxxxx" />
                                 </div>
                              </div>
                           </div>

                           <Separator />

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <Label>เบอร์โทรศัพท์</Label>
                                 <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                    <Input name="phone" value={formData.phone} onChange={handleChange} className="pl-10 bg-zinc-50/50" />
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <Label>Line ID</Label>
                                 <Input name="line_id" value={formData.line_id} onChange={handleChange} className="bg-zinc-50/50" placeholder="@id" />
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-2">
                                 <Label>ที่อยู่ปัจจุบัน</Label>
                                 <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                                    <Textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="pl-10 bg-zinc-50/50 resize-none leading-relaxed" />
                                 </div>
                              </div>
                           </div>

                        </CardContent>
                     </Card>

                     <Card className="border-none shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <CardHeader className="pb-3">
                           <CardTitle className="text-lg flex items-center gap-2">
                              <Shield className="h-5 w-5 text-zinc-500" />
                              บัญชีและความปลอดภัย
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-zinc-500">อีเมล (ใช้เข้าสู่ระบบ)</Label>
                              <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                 <Mail className="h-4 w-4" />
                                 {displayData.email}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <Label>เปลี่ยนรหัสผ่าน</Label>
                              <div className="relative">
                                 <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                 <Input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="กรอกรหัสผ่านใหม่..."
                                    className="pl-10 pr-10 bg-zinc-50/50"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                 >
                                    {showPassword ? (
                                       <EyeOff className="h-4 w-4" />
                                    ) : (
                                       <Eye className="h-4 w-4" />
                                    )}
                                 </button>
                              </div>
                              <p className="text-[11px] text-zinc-400 pl-1">*เว้นว่างไว้หากไม่ต้องการเปลี่ยน</p>
                           </div>
                        </CardContent>
                     </Card>
                  </div>
               </div>
            </main>
         </SidebarInset>
      </SidebarProvider>
   );
}