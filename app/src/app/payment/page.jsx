// app/payment/page.jsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
  MessageSquare,
  Receipt,
  ImagePlus,
  QrCode
} from "lucide-react";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  // --- Logic เดิม (ไม่เปลี่ยนแปลง) ---
  const tableParam = searchParams.get("table_id");
  const amountParam = searchParams.get("amount") || "0";
  const relatedTablesRaw = searchParams.get("related") || "";
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

  // --- UI Section ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-6 px-4 dark:bg-black">

      {/* Navbar แบบง่าย */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white hover:shadow-sm">
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-300" />
        </Button>
        <h1 className="text-lg font-semibold text-slate-700 dark:text-zinc-100">ชำระเงิน</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 dark:shadow-none">

        {/* ส่วนแสดงยอดเงิน (Hero Section) */}
        <div className="relative bg-gradient-to-b from-blue-50 to-white pt-8 pb-4 px-6 text-center dark:from-blue-900/20 dark:to-zinc-900">
          {/* Table Info Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-blue-100 rounded-full shadow-sm mb-4 dark:bg-zinc-800 dark:border-zinc-700">
            <Receipt className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-zinc-300">
              โต๊ะ {tableId} {relatedTables.length > 0 && `(+${relatedTables.join(",")})`}
            </span>
          </div>

          <div className="mb-1 text-slate-500 text-sm dark:text-zinc-400">ยอดชำระทั้งหมด</div>
          <div className="text-5xl font-bold text-slate-800 tracking-tight dark:text-white">
            {Number(amount).toLocaleString()}
            <span className="text-xl font-medium text-slate-400 ml-2">฿</span>
          </div>

          {/* Remark */}
          {remarkParam && (
            <div className="mt-4 flex justify-center">
              <div className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
                <MessageSquare className="w-3.5 h-3.5" />
                {remarkParam}
              </div>
            </div>
          )}
        </div>

        <CardContent className="px-6 pb-6 space-y-6">

          {/* QR Code Section */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-3 dark:bg-zinc-800/50 dark:border-zinc-700">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-300 w-full px-2">
              <QrCode className="w-4 h-4 text-blue-500" />
              <span>สแกน QR PromptPay</span>
              {qrCode && timeLeft > 0 && (
                <span className={`ml-auto text-xs font-mono flex items-center gap-1 ${timeLeft < 60 ? 'text-red-500' : 'text-slate-400'}`}>
                  <Timer className="w-3 h-3" />
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>

            <div className="relative group w-full aspect-square max-w-[240px] bg-white rounded-xl border-2 border-slate-100 flex items-center justify-center overflow-hidden dark:bg-zinc-900 dark:border-zinc-700">
              {qrCode ? (
                <>
                  <img src={qrCode} alt="QR" className="w-full h-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
                  {/* Scan Line Animation (Optional Decoration) */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCcw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
                  <Button size="sm" variant="outline" onClick={() => generateQR(amount)} className="text-xs h-8">
                    โหลด QR ใหม่
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Upload Slip Section */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2 dark:text-zinc-300">
              <ImagePlus className="w-4 h-4" />
              หลักฐานการโอน
            </h3>

            {receiptImage ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 group dark:border-zinc-700">
                <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="sm" onClick={() => { setReceiptImage(null); setSlipFile(null); }} className="rounded-full shadow-lg">
                    <Trash2 className="w-4 h-4 mr-2" /> ลบรูปภาพ
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all group dark:bg-zinc-800/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform dark:bg-zinc-700">
                  <UploadCloud className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs text-slate-500 font-medium group-hover:text-blue-600 dark:text-zinc-400">
                  แตะเพื่อแนบสลิป
                </p>
              </div>
            )}
          </div>

        </CardContent>

        <CardFooter className="flex flex-col bg-white border-t border-slate-50 p-6 pt-4 dark:bg-zinc-900 dark:border-zinc-800">
          <Button
            onClick={completePayment}
            disabled={loading || !qrCode || !receiptImage}
            className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
          >
            {loading ? "กำลังบันทึก..." : "ยืนยันการชำระเงิน"}
          </Button>

          {currentEmployee && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium bg-slate-50 py-1.5 px-3 rounded-full mx-auto dark:bg-zinc-800 dark:text-zinc-500">
              <Smartphone className="w-3 h-3" />
              พนักงาน: {currentEmployee.name}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* CSS Animation สำหรับเส้น Scan */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}