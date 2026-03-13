"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Timer,
  RefreshCcw,
  Smartphone,
  UploadCloud,
  Trash2,
  MessageSquare,
  Receipt,
  ImagePlus,
  QrCode,
  CheckCircle2,
  Printer
} from "lucide-react";
import { format } from "date-fns";

const handlePrintReceipt = (billData, itemsData) => {
  if (!billData || !itemsData) return;
  const storeName = "ร้านตำลืมผัว";
  const receiptHtml = `
    <html>
      <head>
        <title>ใบเสร็จรับเงิน ${billData.bill_id ? '#' + billData.bill_id : ''}</title>
        <style>
          @page { margin: 0; size: auto; }
          body { font-family: sans-serif; width: 300px; margin: 0 auto; padding: 20px 10px; font-size: 13px; color: #000; }
          .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
          .font-bold { font-weight: bold; } .text-xl { font-size: 22px; } .text-lg { font-size: 18px; } .text-sm { font-size: 11px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; } th, td { padding: 4px 0; vertical-align: top; }
          th { border-bottom: 1px solid #000; } .flex { display: flex; justify-content: space-between; }
          .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; }
          .watermark { text-align: center; font-size: 10px; margin-top: 20px; color: #666; }
          @media print { .no-print { display: none !important; } }
          .action-buttons { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #ccc; display: flex; gap: 10px; justify-content: center; }
          .btn-print { flex: 1; background: #10b981; color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-print:hover { background: #059669; }
          .btn-close { flex: 1; background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-close:hover { background: #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold text-xl mb-1">${storeName}</div>
        <div class="text-center mb-2">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</div>
        
        ${billData.bill_id ? `<div class="flex mb-1"><span>เลขที่บิล:</span> <span>#${billData.bill_id}</span></div>` : ''}
        <div class="flex mb-1"><span>วันที่:</span> <span>${format(new Date(), "dd/MM/yyyy HH:mm")}</span></div>
        <div class="flex mb-1"><span>พนักงาน:</span> <span>${billData.cashierName}</span></div>
        <div class="flex mb-1"><span>ลูกค้า/โต๊ะ:</span> <span class="font-bold">${billData.table_id ? 'โต๊ะ ' + billData.table_id : billData.customer_name || 'สั่งกลับบ้าน'}</span></div>
        <div class="divider"></div>
        <table>
          <thead><tr><th class="text-left" style="width: 50%;">รายการ</th><th class="text-center" style="width: 20%;">จำนวน</th><th class="text-right" style="width: 30%;">ราคา</th></tr></thead>
          <tbody>
            ${itemsData.map(i => `<tr><td class="text-left">${i.name_th || i.name}</td><td class="text-center">${i.qty || i.quantity}</td><td class="text-right">${((Number(i.qty) || Number(i.quantity) || 0) * Number(i.price)).toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="flex font-bold text-lg mt-2"><span>ยอดรวมทั้งสิ้น</span><span>${Number(billData.totalPrice).toLocaleString()} บาท</span></div>
        <div class="flex mt-1 text-sm"><span>ชำระโดย:</span><span>${billData.paymentType}</span></div>
        <div class="flex mt-1 text-sm"><span>รับเงินมา:</span><span>${Number(billData.cashReceived).toLocaleString()} บาท</span></div>
        <div class="flex mt-1 text-sm"><span>เงินทอน:</span><span>${Number(billData.changeAmount).toLocaleString()} บาท</span></div>
        <div class="divider"></div>
        <div class="text-center mt-4 font-bold">ขอบคุณที่ใช้บริการ</div>
        <div class="text-center text-sm">โอกาสหน้าเชิญใหม่ครับ/ค่ะ</div>
        
        <div class="action-buttons no-print">
          <button class="btn-print" onclick="window.print()">สั่งพิมพ์ใบเสร็จ</button>
          <button class="btn-close" onclick="window.close()">ปิดหน้าต่าง</button>
        </div>
      </body>
    </html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) { printWindow.document.write(receiptHtml); printWindow.document.close(); }
  else { alert("กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้เพื่อพิมพ์ใบเสร็จ"); }
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const tableParam = searchParams.get("table_id");
  const amountParam = searchParams.get("amount") || "0";
  const relatedTablesRaw = searchParams.get("related") || "";
  const remarkParam = searchParams.get("remark") || "";
  const customerNameParam = searchParams.get("customerName") || "";

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

  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [billItems, setBillItems] = useState([]);

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
      const res = await createBillRecord(items);

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

      setBillItems(items);
      setPaymentSuccessData({
        bill_id: res.bill_id || res.id || "",
        table_id: tableId,
        customer_name: customerNameParam,
        cashierName: currentEmployee?.name,
        totalPrice: amount,
        paymentType: "เงินโอน",
        cashReceived: amount,
        changeAmount: 0,
      });
      setIsSuccess(true);

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const BRAND_COLOR = "#FF5722";

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-10 px-4 dark:bg-black">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 dark:shadow-none p-8 text-center space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-3xl border border-green-100 dark:bg-green-900/20 dark:border-green-900/30">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-black text-green-600 dark:text-green-400">ชำระเงินสำเร็จ</h3>
            <p className="text-zinc-500 mt-2 font-medium">ทำรายการบันทึกสลิปและโอนเงินเรียบร้อยแล้ว</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800" onClick={() => router.push("/table")}>
              กลับหน้าหลัก
            </Button>
            <Button
              className="flex-1 h-14 text-white font-bold rounded-2xl shadow-lg"
              style={{ backgroundColor: BRAND_COLOR }}
              onClick={() => handlePrintReceipt(paymentSuccessData, billItems)}
            >
              <Printer className="w-5 h-5 mr-2" /> พิมพ์ใบเสร็จ
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-6 px-4 dark:bg-black">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white hover:shadow-sm">
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-300" />
        </Button>
        <h1 className="text-lg font-semibold text-slate-700 dark:text-zinc-100">ชำระเงิน</h1>
        <div className="w-10" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 dark:shadow-none">
        <div className="relative bg-gradient-to-b from-[#FF5722]/10 to-white pt-8 pb-4 px-6 text-center dark:from-[#FF5722]/20 dark:to-zinc-900">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5722]/20 rounded-full shadow-sm mb-4 dark:bg-zinc-800 dark:border-zinc-700">
            <Receipt className="w-4 h-4" style={{ color: BRAND_COLOR }} />
            <span className="text-sm font-medium text-slate-600 dark:text-zinc-300">
              โต๊ะ {tableId} {relatedTables.length > 0 && `(+${relatedTables.join(",")})`}
            </span>
          </div>

          <div className="mb-1 text-slate-500 text-sm dark:text-zinc-400">ยอดชำระทั้งหมด</div>
          <div className="text-5xl font-bold text-slate-800 tracking-tight dark:text-white">
            {Number(amount).toLocaleString()}
            <span className="text-xl font-medium text-slate-400 ml-2">฿</span>
          </div>

          {remarkParam && (
            <div className="mt-4 flex justify-center">
              <div className="bg-[#FF5722]/10 text-[#FF5722] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-[#FF5722]/20 dark:bg-[#FF5722]/20 dark:border-[#FF5722]/30">
                <MessageSquare className="w-3.5 h-3.5" />
                {remarkParam}
              </div>
            </div>
          )}
        </div>

        <CardContent className="px-6 pb-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-3 dark:bg-zinc-800/50 dark:border-zinc-700">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-300 w-full px-2">
              <QrCode className="w-4 h-4" style={{ color: BRAND_COLOR }} />
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
                <img src={qrCode} alt="QR" className="w-full h-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
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
                className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-[#FF5722]/5 hover:border-[#FF5722]/50 transition-all group dark:bg-zinc-800/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform dark:bg-zinc-700">
                  <UploadCloud className="w-5 h-5" style={{ color: BRAND_COLOR }} />
                </div>
                <p className="text-xs text-slate-500 font-medium group-hover:text-[#FF5722] dark:text-zinc-400 transition-colors">
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
            className="w-full h-12 text-base font-semibold rounded-xl text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            style={{
              backgroundColor: BRAND_COLOR,
              boxShadow: `0 10px 15px -3px ${BRAND_COLOR}40`
            }}
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
    </div>
  );
}