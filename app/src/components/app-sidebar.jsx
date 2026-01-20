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

// ✅ 1. กำหนดสิทธิ์ให้แต่ละเมนู (allowedRoles)
const MENU_ITEMS = [
  { 
    href: "/table", 
    icon: <FileText size={20} />, 
    label: "รับออเดอร์", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานทั่วไป"] 
  },
  { 
    href: "/order-status", 
    icon: <ClipboardList size={20} />, 
    label: "รายการออเดอร์", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานทั่วไป", "พนักงานในครัว"] 
  },
  { 
    href: "/history", 
    icon: <History size={20} />, 
    label: "ประวัติยอดการสั่งอาหาร", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน"] 
  },
  { 
    href: "/dashboard", 
    icon: <BarChart2 size={20} />, 
    label: "สรุปยอดขาย", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน"] 
  },
  { 
    href: "/attendance", 
    icon: <Clock size={20} />, 
    label: "บันทึกเวลาทำงาน", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานทั่วไป", "พนักงานในครัว"] // ทุกคนต้องลงเวลา
  },
  { 
    href: "/time-report", 
    icon: <FileClock size={20} />, 
    label: "รายงานเวลาทำงาน", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน"] 
  },
  { 
    href: "/menu", 
    icon: <Utensils size={20} />, 
    label: "รายการอาหาร", 
    allowedRoles: ["เจ้าของร้าน", "ผู้จัดการร้าน", "พนักงานในครัว"] 
  },
  { 
    href: "/employees", 
    icon: <Users size={20} />, 
    label: "ข้อมูลพนักงาน", 
    allowedRoles: ["เจ้าของร้าน"] 
  },
];

export function AppSidebar() {
  const [user, setUser] = useState({});
  const [userPosition, setUserPosition] = useState(""); // ✅ State สำหรับเก็บตำแหน่ง

  useEffect(() => {
    // ✅ ดึงตำแหน่งจาก LocalStorage ทันทีที่โหลดหน้าเว็บ
    const storedPosition = typeof window !== "undefined" ? localStorage.getItem("userPosition") : null;
    if (storedPosition) {
      setUserPosition(storedPosition);
    }

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
        
        // อัปเดตตำแหน่งจาก API อีกครั้งเพื่อความชัวร์ (กรณี localStorage เก่า)
        if (data.position) {
          setUserPosition(data.position);
          localStorage.setItem("userPosition", data.position);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    })();
  }, []);

  // ✅ กรองเมนูตามตำแหน่ง (ถ้ายังไม่โหลดตำแหน่ง ให้แสดง array ว่าง หรือเมนูพื้นฐาน)
  const filteredItems = userPosition 
    ? MENU_ITEMS.filter(item => item.allowedRoles.includes(userPosition))
    : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                <Logo width={40} height={40} className="object-contain" />
              </div>

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
            {/* ✅ ใช้ filteredItems แทน sidebarItems เดิม */}
            {filteredItems.map((item) => (
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