"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Sun, Moon, UserCog } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({ user }) {
  // Fallback data
  const currentUser = user || { name: "Guest User", email: "guest@example.com" };

  const { isMobile } = useSidebar();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("userId");
    router.push("/");
  };

  const handleThemeToggle = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // ฟังก์ชันสำหรับลิ้งค์ไปหน้าแก้ไขข้อมูลส่วนตัว
  const handleEditProfile = () => {
    // ลิ้งค์ไปที่หน้า /profile (คุณต้องไปสร้างหน้า page.tsx ในโฟลเดอร์ app/profile ด้วยนะครับ)
    router.push("/profile");
  };

  const nameSafe = currentUser.name_th || currentUser.name || "User";
  const emailSafe = currentUser.email || "";
  const initials =
    currentUser.avatarFallback ||
    (typeof nameSafe === "string" && nameSafe.length >= 2
      ? nameSafe.slice(0, 2).toUpperCase()
      : "US");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{nameSafe}</span>
                <span className="truncate text-xs">{emailSafe}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{nameSafe}</span>
                  <span className="truncate text-xs">{emailSafe}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* เปลี่ยน onClick ให้เรียก router.push ไปหน้าอื่นแทนการเปิด Dialog */}
            <DropdownMenuItem onClick={handleEditProfile}>
              <UserCog className="mr-2 h-4 w-4" />
              แก้ไขข้อมูลส่วนตัว
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleThemeToggle}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "ธีมสว่าง" : "ธีมมืด"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="text-rose-500 focus:text-rose-500">
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}