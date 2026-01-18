'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    // TODO: replace with your real sign-in logic (e.g., credentials sign-in)
    await new Promise((res) => setTimeout(res, 900))
    setLoading(false)
  }

  return (
    <div className="min-h-svh w-full bg-black text-zinc-200">
      {/* subtle vignette for depth on dark bg */}
      <div className="pointer-events-none fixed inset-0 opacity-50 [mask-image:radial-gradient(60%_50%_at_50%_50%,#000,transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,theme(colors.zinc.800/.35),transparent_55%),radial-gradient(circle_at_80%_80%,theme(colors.zinc.800/.35),transparent_55%)]" />
      </div>

      <main className="relative grid min-h-svh place-items-center px-4">
        <Card className="w-full max-w-[420px] border-zinc-800 bg-zinc-900/80 backdrop-blur shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl tracking-tight text-zinc-100 text-center">เข้าสู่ระบบ</CardTitle>
            
          </CardHeader>

          <CardContent>
            <form className="grid gap-5" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-zinc-300">อีเมล</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-zinc-300">รหัสผ่าน</Label>
                  <Link href="#" className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline">ลืมรหัสผ่าน?</Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-9 pr-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" className="data-[state=checked]:bg-zinc-700" />
                  <Label htmlFor="remember" className="text-sm text-zinc-400">จดจำฉันไว้</Label>
                </div>
              </div>

              <Button type="submit" className="h-10 bg-zinc-200 text-zinc-900 hover:bg-white" disabled={loading}>
                {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center text-xs text-zinc-500">
            
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}