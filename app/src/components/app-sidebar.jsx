"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  ClipboardList,
  History,
  BarChart2,
  Utensils,
  Users,
  Clock,
  FileClock,
} from "lucide-react";

import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarMenu,
} from "@/components/ui/sidebar";

// นำเข้า Component Logo
import Logo from "@/components/ui/logo";

const sidebarItems = [
  { href: "/table", icon: <FileText size={20} />, label: "รับออเดอร์" },
  { href: "/order-status", icon: <ClipboardList size={20} />, label: "คำสั่งรายการอาหาร" },
  { href: "/history", icon: <History size={20} />, label: "ประวัติยอดการสั่งอาหาร" },
  { href: "/dashboard", icon: <BarChart2 size={20} />, label: "สรุปยอดขาย" },
  { href: "/menu", icon: <Utensils size={20} />, label: "รายการอาหาร" },
  { href: "/employees", icon: <Users size={20} />, label: "ข้อมูลพนักงาน" },
  { href: "/attendance", icon: <Clock size={20} />, label: "บันทึกเวลาทำงาน" },
  { href: "/time-report", icon: <FileClock size={20} />, label: "รายงานเวลาทำงาน" },
];

export function AppSidebar() {
  const [user, setUser] = useState({});

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(`/api/user/${userId}`, { cache: "no-store" });
        if (!res.ok) {
          console.error("Failed to fetch user. Status:", res.status);
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    })();
  }, []);

  return (
    <Sidebar collapsible="icon">
      {/* ส่วน Header ปรับให้เป็น SidebarMenu เพื่อให้ alignment ตรงกับด้านล่าง */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* ส่วนรูปโลโก้ (ทำหน้าที่เป็น Icon) */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                {/* ปรับขนาด Logo ให้พอดีกับช่อง Icon (ประมาณ 32-40px) */}
                <Logo width={40} height={40} className="object-contain" />
              </div>

              {/* ส่วนข้อความ (จะซ่อนอัตโนมัติเมื่อ Sidebar พับ) */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-[#FF5722]">
                  ร้านตำลืมผัว
                </span>
                <span className="truncate text-xs">
                  ระบบจัดการร้านอาหาร
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <a
                    href={item.href}
                    className="flex items-center space-x-2 transition-all duration-200 hover:translate-x-1 hover:text-primary dark:hover:text-gray-50"
                    onClick={(e) => {
                      const sidebar = e.currentTarget.closest("[data-sidebar]");
                      if (sidebar?.getAttribute("data-collapsed") === "true") {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col w-full">
          <NavUser user={user || {}} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}