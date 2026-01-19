// app/payment/page.jsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Timer,
  RefreshCcw,
  CheckCircle2,
  ScanLine,
  Smartphone,
  UploadCloud,
  Trash2,
  MessageSquare // ✅ เพิ่มไอคอน
} from "lucide-react";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  // ✅ 1. รับค่าจาก Params
  const tableParam = searchParams.get("table_id");
  const amountParam = searchParams.get("amount") || "0";
  const relatedTablesRaw = searchParams.get("related") || "";
  // ✅ รับค่า remark ที่ส่งมาจากหน้า Billing
  const remarkParam = searchParams.get("remark") || "";

  const tableId = useMemo(() => {
    const n = Number(tableParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [tableParam]);

  const relatedTables = useMemo(() =>
    relatedTablesRaw ? relatedTablesRaw.split(",").filter(t => t !== "") : [],
    [relatedTablesRaw]
  );

  const [amount, setAmount] = useState(amountParam);
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [receiptImage, setReceiptImage] = useState(null);
  const [slipFile, setSlipFile] = useState(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const me = await res.json();
          setCurrentEmployee({
            id: me?.employee_id ?? me?.id,
            name: me?.name ?? me?.username,
          });
        }
      } catch (e) { console.error("Fetch me error:", e); }
    };
    fetchMe();
  }, []);

  const generateQR = async (value) => {
    const amt = Number(value);
    if (!amt || amt <= 0) return setError("จำนวนเงินไม่ถูกต้อง");

    try {
      setLoading(true);
      const res = await fetch(`/api/promptpay?amount=${encodeURIComponent(amt)}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data?.qrCodeDataUrl) {
        setQrCode(data.qrCodeDataUrl);
        setError("");
        setTimeLeft(3 * 60);
      } else {
        setError(data?.error || "ไม่สามารถสร้าง QR ได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number(amountParam) > 0) {
      generateQR(amountParam);
    }
  }, [amountParam]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return alert("กรุณาเลือกไฟล์รูปภาพ");
      setSlipFile(file);
      setReceiptImage(URL.createObjectURL(file));
    }
  };

  const buildBillItemsFromOrders = async (id) => {
    const res = await fetch(`/api/orders?table=${id}`, { cache: "no-store" });
    const orders = await res.json();
    const summary = {};
    for (const order of orders || []) {
      for (const item of order.items || []) {
        if (item.bill_id) continue;
        const key = item.menu_id;
        if (summary[key]) {
          summary[key].qty += Number(item.qty);
          summary[key].total += Number(item.price) * Number(item.qty);
        } else {
          summary[key] = {
            menu_id: item.menu_id,
            name: item.name,
            qty: Number(item.qty),
            price: Number(item.price),
            total: Number(item.price) * Number(item.qty)
          };
        }
      }
    }
    return Object.values(summary);
  };

  // ✅ บันทึกบิลลงฐานข้อมูล (เพิ่มการส่ง remark)
  const createBillRecord = async (items) => {
    const formData = new FormData();
    formData.append("table_id", String(tableId));
    formData.append("items", JSON.stringify(items));
    formData.append("total_price", String(amount));
    formData.append("payment_type", "เงินโอน");
    formData.append("closed_by_id", currentEmployee?.id ?? "");
    formData.append("closed_by_name", currentEmployee?.name ?? "");
    formData.append("cash_received", String(amount));
    formData.append("change_amount", "0");

    // ✅ ส่ง remark ไปบันทึกด้วย
    if (remarkParam) formData.append("remark", remarkParam);

    if (slipFile) formData.append("slip_image", slipFile);

    const res = await fetch("/api/bills", { method: "POST", body: formData });
    if (!res.ok) throw new Error("บันทึกบิลล้มเหลว");
    return res.json();
  };

  const completePayment = async () => {
    if (!tableId) return alert("ไม่พบเลขโต๊ะ");
    if (!receiptImage) return alert("กรุณาอัปโหลดรูปใบเสร็จ");
    if (!confirm(`ยืนยันการชำระเงินโต๊ะ ${tableId} จำนวน ${amount} บาท?`)) return;

    try {
      setLoading(true);
      const items = await buildBillItemsFromOrders(tableId);
      await createBillRecord(items);

      await fetch(`/api/tables/${tableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeStatus", status: "ว่าง", paymentType: "เงินโอน" }),
      });

      if (relatedTables.length > 0) {
        await Promise.all(relatedTables.map(tNum =>
          fetch(`/api/tables/${tNum}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "changeStatus", status: "ว่าง", paymentType: "เงินโอน" }),
          })
        ));
      }

      router.push("/table");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 dark:bg-black">
      <div className="w-full max-w-md mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-500 dark:text-zinc-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> ย้อนกลับ
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-xl border-none overflow-hidden dark:bg-zinc-900">
        <div className="bg-blue-600 p-6 text-center text-white dark:bg-blue-800">
          <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold">สแกนจ่ายเงิน</h1>
          <p className="text-blue-100 text-sm">โต๊ะ {tableId} {relatedTables.length > 0 && `(+${relatedTables.join(",")})`}</p>
        </div>

        <CardContent className="pt-8 px-8 pb-6 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-gray-500 text-sm">ยอดที่ต้องชำระ</p>
            <div className="text-4xl font-black text-gray-800 dark:text-white">
              {Number(amount).toLocaleString()} <span className="text-lg font-normal text-gray-400">บาท</span>
            </div>
            {/* ✅ แสดง Remark ให้เห็น (ถ้ามี) */}
            {remarkParam && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mt-2 bg-orange-50 dark:bg-orange-900/20 py-1 px-3 rounded-full w-fit mx-auto">
                <MessageSquare className="w-3 h-3" />
                <span>หมายเหตุ: {remarkParam}</span>
              </div>
            )}
          </div>

          <div className="relative mx-auto w-64 h-64 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center overflow-hidden dark:bg-zinc-800 dark:border-zinc-700">
            {qrCode ? (
              <img src={qrCode} alt="QR" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <RefreshCcw className={`w-8 h-8 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                <Button size="sm" variant="ghost" onClick={() => generateQR(amount)}>สร้างใหม่</Button>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {qrCode && timeLeft > 0 && (
              <Badge variant="outline" className={`px-3 py-1 gap-2 ${timeLeft < 30 ? 'text-red-500 border-red-200' : 'text-zinc-500'}`}>
                <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
              </Badge>
            )}
          </div>

          <div className="pt-4 border-t dark:border-zinc-800">
            <h3 className="text-sm font-bold mb-3 dark:text-zinc-300 uppercase tracking-tighter">หลักฐานการโอนเงิน</h3>
            {receiptImage ? (
              <div className="relative w-full h-48 border-2 border-green-500 rounded-xl overflow-hidden">
                <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                <Button variant="destructive" size="icon" onClick={() => { setReceiptImage(null); setSlipFile(null); }} className="absolute top-2 right-2 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-sm font-bold dark:text-zinc-400">แตะเพื่ออัปโหลดสลิป</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 bg-gray-50/50 p-6 border-t dark:bg-zinc-900/50 dark:border-zinc-800">
          <Button
            className="w-full h-14 text-lg font-black rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
            onClick={completePayment}
            disabled={loading || !qrCode || !receiptImage}
          >
            {loading ? "กำลังดำเนินการ..." : <><CheckCircle2 className="mr-2 h-5 w-5" /> ยืนยันชำระเงิน</>}
          </Button>
          {!receiptImage && <p className="text-[10px] text-red-500 font-bold">* จำเป็นต้องแนบหลักฐานการโอน</p>}

          {currentEmployee && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold">
              <Smartphone className="w-3 h-3" /> ผู้รับเงิน: {currentEmployee.name}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}