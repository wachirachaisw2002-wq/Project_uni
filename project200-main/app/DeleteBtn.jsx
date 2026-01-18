"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Plus, Edit, Trash2 } from "lucide-react";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">ข้อมูลพนักงาน</h1>
          </div>
          <Button
            onClick={() => setOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
            aria-label="เพิ่มพนักงาน"
          >
            <Plus size={16} />
            เพิ่มพนักงาน
          </Button>
        </header>

        <main className="p-4 space-y-6">
          <Separator />

          {/* ตารางข้อมูล */}
          <Card>
            <CardContent className="p-4 space-y-4 overflow-auto">
              <h2 className="text-md font-medium">รายชื่อพนักงาน</h2>
              <table className="w-full min-w-[900px] border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left">ชื่อ</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">อีเมล</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">รหัสผ่าน</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">หมายเลขโทรศัพท์</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">ตำแหน่ง</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">สถานะการทำงาน</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">เงินเดือน</th>
                    <th className="border border-gray-300 px-3 py-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">—</td>
                    <td className="border border-gray-300 px-3 py-2 text-right space-x-2">
                      <button
                        className="inline-flex items-center justify-center rounded border border-gray-500 p-1 text-gray-700 hover:bg-gray-100"
                        aria-label="แก้ไข"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded border border-red-600 p-1 text-red-600 hover:bg-red-100"
                        aria-label="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Dialog เพิ่มพนักงาน */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg max-w-[600px]">
              <DialogHeader>
                <DialogTitle>เพิ่มพนักงาน</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลพนักงานใหม่ที่ต้องการเพิ่ม
                </DialogDescription>
              </DialogHeader>

              <form className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="name">ชื่อ</Label>
                  <Input id="name" name="name" placeholder="กรอกชื่อ" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" name="email" type="email" placeholder="someone@example.com" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="phone">หมายเลขโทรศัพท์</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="0812345678" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="position">ตำแหน่ง</Label>
                  <select
                    id="position"
                    name="position"
                    className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      เลือกตำแหน่ง
                    </option>
                    <option value="owner">เจ้าของร้าน</option>
                    <option value="general">พนักงานทั่วไป</option>
                    <option value="kitchen">พนักงานในครัว</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="status">สถานะการทำงาน</Label>
                  <select
                    id="status"
                    name="status"
                    className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      เลือกสถานะ
                    </option>
                    <option value="active">ทำงานอยู่</option>
                    <option value="inactive">ไม่ได้ทำงานแล้ว</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="salary">เงินเดือน</Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    placeholder="เช่น 15000"
                    min={0}
                  />
                </div>
              </form>

              <DialogFooter>
                <Button type="submit" onClick={() => setOpen(false)}>
                  เพิ่มพนักงาน
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
