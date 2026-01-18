"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileText,
  CreditCard,
  ClipboardList,
  History,
  BarChart2,
  Utensils,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="flex h-screen">
      <motion.div
        animate={{ width: isOpen ? 250 : isMobile ? 0 : 60 }}
        className={`bg-gray-800 text-white h-full fixed left-0 top-0 flex flex-col py-4 shadow-lg overflow-hidden transition-all duration-300 ${
          isMobile && !isOpen ? "hidden" : "block"
        }`}
      >
        <div className="flex items-center justify-between px-4 mb-4">
          {isOpen && <span className="text-lg font-bold">ระบบจัดการร้าน</span>}
          <button
            className="text-white focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="flex flex-col space-y-4">
          <SidebarItem href="/orders" icon={<FileText size={24} />} label="รับออเดอร์" isOpen={isOpen} />
          <SidebarItem href="/billing" icon={<CreditCard size={24} />} label="เช็คบิล" isOpen={isOpen} />
          <SidebarItem href="/order-status" icon={<ClipboardList size={24} />} label="ดูคำสั่งออเดอร์" isOpen={isOpen} />
          <SidebarItem href="/history" icon={<History size={24} />} label="ประวัติยอดการสั่งอาหาร" isOpen={isOpen} />
          <SidebarItem href="/dashboard" icon={<BarChart2 size={24} />} label="สรุปยอดขาย" isOpen={isOpen} />
          <SidebarItem href="/menu" icon={<Utensils size={24} />} label="รายการอาหาร" isOpen={isOpen} />
          <SidebarItem href="/staff" icon={<Users size={24} />} label="ข้อมูลพนักงาน" isOpen={isOpen} />
        </nav>

        <div className="mt-auto pb-4 flex justify-center">
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center w-5/6"
            title="ออกจากระบบ"
          >
            <LogOut size={24} />
            {isOpen && <span className="ml-2">ออกจากระบบ</span>}
          </button>
        </div>
      </motion.div>

      {isMobile && (
        <button
          className="fixed top-4 left-4 bg-gray-800 text-white p-2 rounded-md z-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu size={24} />
        </button>
      )}

      <div className={`flex-1 p-4 transition-all duration-300 ${isOpen ? "ml-60" : "ml-16"}`}>
        <h1 className="text-2xl font-bold"></h1>
      </div>
    </div>
  );
};

const SidebarItem = ({ href, icon, label, isOpen }) => {
  return (
    <Link
      href={href}
      className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-700 rounded-md transition-all relative group"
      title={label}
    >
      <span className="w-6 flex justify-center">{icon}</span>
      {isOpen && <span>{label}</span>}
      {!isOpen && (
        <span className="absolute left-full ml-2 bg-gray-700 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      )}
    </Link>
  );
};

export default dynamic(() => Promise.resolve(Sidebar), { ssr: false });