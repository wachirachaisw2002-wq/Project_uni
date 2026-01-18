"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image"; 
import {
  FileText,
  ClipboardList,
  History,
  BarChart2,
  Utensils,
  Users,
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

const sidebarItems = [
  { href: "/table", icon: <FileText size={20} />, label: "รับออเดอร์" },
  { href: "/order-status", icon: <ClipboardList size={20} />, label: "คำสั่งรายการอาหาร" },
  { href: "/history", icon: <History size={20} />, label: "ประวัติยอดการสั่งอาหาร" },
  { href: "/dashboard", icon: <BarChart2 size={20} />, label: "สรุปยอดขาย" },
  { href: "/menu", icon: <Utensils size={20} />, label: "รายการอาหาร" },
  { href: "/employees", icon: <Users size={20} />, label: "ข้อมูลพนักงาน" },
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
      
      <SidebarHeader className="h-auto flex pt-6 pb-4 px-4 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col items-start w-full"> 
            {/*<Image 
              src="/logo22323.png" 
              alt="Logo" 
              width={140} // ปรับให้ใหญ่ขึ้นอีกนิดเพื่อให้สมดุลกับตัวหนังสือใหม่
              height={60} 
              className="object-contain mb-2" // เพิ่มระยะห่างด้านล่างรูปภาพ
              priority
            /*/}
            <span className="text-base font-extrabold text-[#FF5722] tracking-wide drop-shadow-sm">
              ระบบจัดการร้านอาหาร
            </span>
        </div>
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