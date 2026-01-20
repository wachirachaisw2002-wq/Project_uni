"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // 1. บันทึกข้อมูลลงเครื่อง
        localStorage.setItem("userId", data.id);
        localStorage.setItem("userPosition", data.position);

        // 2. ✅ ตรวจสอบตำแหน่งเพื่อเปลี่ยนหน้า (Redirect Logic)
        // ใช้ .trim() ป้องกันกรณีใน DB มีช่องว่างต่อท้าย
        const position = (data.position || "").trim();

        if (position === "พนักงานในครัว") {
          router.push("/order-status"); // หรือ /orders-status-page-split ถ้าคุณใช้ชื่อนั้น
        } else {
          router.push("/table"); // ตำแหน่งอื่นๆ (เจ้าของ, ผู้จัดการ, พนักงานทั่วไป) ไปหน้าโต๊ะ
        }

      } else {
        setError(data.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4 transition-colors duration-500">
      <Card className="w-full max-w-md shadow-none border-gray-200 dark:border-zinc-900 dark:bg-black">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4 pb-2">
            <Image
              src="/logo.png"
              alt="ตำลืมผัว โลโก้"
              width={150}
              height={150}
              className="h-auto w-auto object-contain"
              priority
            />
          </div>

          <CardTitle className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            เข้าสู่ระบบ
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-zinc-500">
            กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg text-center dark:bg-transparent dark:text-red-500 dark:border-red-900/50">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-zinc-400">
                อีเมล
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-gray-300 dark:bg-black dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-700 focus-visible:ring-gray-400 dark:focus-visible:ring-white transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-zinc-400">
                รหัสผ่าน
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 border-gray-300 dark:bg-black dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-700 focus-visible:ring-gray-400 dark:focus-visible:ring-white transition-all"
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:text-zinc-600 dark:hover:text-white focus:outline-none transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-6 pb-8">
            <Button
              className="w-full h-12 text-lg font-bold shadow-sm text-white bg-[#FF5722] hover:bg-[#E64A19] transition-all active:scale-[0.98]"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}