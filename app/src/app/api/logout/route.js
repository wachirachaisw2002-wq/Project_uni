import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({ name: "employee_id", value: "", path: "/", maxAge: 0 });
  return res;
}
