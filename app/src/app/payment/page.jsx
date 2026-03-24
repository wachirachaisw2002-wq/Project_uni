"use client";

import { useEffect, useMemo, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Timer, RefreshCcw, Smartphone, UploadCloud, Trash2, MessageSquare, Receipt, ImagePlus, CheckCircle2, Printer, Loader2, QrCode } from "lucide-react";
const BRAND_COLOR = "#FF5722";

const handlePrintReceipt = (billData, itemsData) => {
  if (!billData || !itemsData) return;
  const storeName = "ร้านตำลืมผัว";
  const taxId = "TAX ID 0107567000414 โทร.0857441773";

  const itemRows = itemsData.map(i => {
    const name = i.name_th || i.name;
    const qty = Number(i.qty || i.quantity || 1);
    const total = (qty * Number(i.price)).toFixed(2);
    const displayName = qty > 1 ? `${name} (x${qty})` : name;
    return `<div class="flex-between mb-1"><span>${displayName}</span><span>${total}</span></div>`;
  }).join('');

  const receiptHtml = `
    <html>
      <head>
        <title>ใบเสร็จรับเงิน ${billData.bill_id ? '#' + billData.bill_id : ''}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 20px 10px; font-size: 14px; color: #000; line-height: 1.4; }
          .text-center { text-align: center; } .flex-between { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .mb-1 { margin-bottom: 4px; } .mt-4 { margin-top: 16px; }
          @media print { .no-print { display: none !important; } }
          .action-buttons { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #ccc; display: flex; gap: 10px; justify-content: center; }
          .btn-print { flex: 1; background: #10b981; color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-print:hover { background: #059669; }
          .btn-close { flex: 1; background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-close:hover { background: #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="bold mb-1">${storeName}</div>
        <div class="mb-1 text-center" style="text-align: left; font-size: 12px;">${taxId}</div>
        ${billData.bill_id ? `<div class="mb-1" style="font-size: 12px;">RID. E${String(billData.bill_id).padStart(14, '0')}</div>` : ''}
        <div class="divider"></div>
        ${itemRows}
        <div class="divider"></div>
        <div class="flex-between bold mb-1"><span>ยอดรวมทั้งสิ้น</span><span>${Number(billData.totalPrice).toFixed(2)}</span></div>
        <div class="flex-between mb-1"><span>ชำระโดย: ${billData.paymentType}</span><span>${Number(billData.totalPrice).toFixed(2)}</span></div>
        <div class="flex-between mb-1"><span>รับเงินมา</span><span>${Number(billData.cashReceived).toFixed(2)}</span></div>
        <div class="flex-between mb-1"><span>เงินทอน</span><span>${Number(billData.changeAmount).toFixed(2)}</span></div>
        <div class="divider mt-4" style="margin-top: 24px;"></div>
        <div class="text-center" style="font-size: 12px;">ใบเสร็จรับเงิน/ใบกำกับภาษี</div>
        <div class="text-center" style="font-size: 12px;">${format(new Date(), "dd/MM/yyyy HH:mm")} CSH:${billData.cashierName}</div>
        <div class="action-buttons no-print">
          <button class="btn-print" onclick="window.print()">สั่งพิมพ์</button>
          <button class="btn-close" onclick="window.close()">ปิด</button>
        </div>
      </body>
    </html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) { printWindow.document.write(receiptHtml); printWindow.document.close(); }
  else alert("กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้เพื่อพิมพ์ใบเสร็จ");
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const tableId = Number(searchParams.get("table_id")) || null;
  const amount = searchParams.get("amount") || "0";
  const relatedTables = (searchParams.get("related") || "").split(",").filter(Boolean);
  const remarkParam = searchParams.get("remark") || "";
  const customerNameParam = searchParams.get("customerName") || "";

  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);

  const [slip, setSlip] = useState({ file: null, preview: null });
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(res => res.json()).then(me => setEmployee({ id: me?.employee_id ?? me?.id, name: me?.name ?? me?.username })).catch(() => { });
  }, []);

  const generateQR = useCallback((value) => {
    if (Number(value) <= 0) return setError("จำนวนเงินไม่ถูกต้อง");
    setLoading(true);
    fetch(`/api/promptpay?amount=${encodeURIComponent(value)}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data?.qrCodeDataUrl) {
          setQrCode(data.qrCodeDataUrl);
          setError("");
          setTimeLeft(180);
        } else setError(data?.error || "ไม่สามารถสร้าง QR ได้");
      })
      .catch(() => setError("เกิดข้อผิดพลาดในการเชื่อมต่อ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (Number(amount) > 0) generateQR(amount); }, [amount, generateQR]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) setSlip({ file, preview: URL.createObjectURL(file) });
    else if (file) alert("กรุณาเลือกไฟล์รูปภาพ");
  };

  const completePayment = async () => {
    if (!tableId && !customerNameParam) return alert("ไม่พบข้อมูลออเดอร์");
    if (!slip.file) return alert("กรุณาอัปโหลดรูปใบเสร็จ");
    if (!confirm(`ยืนยันการชำระเงิน จำนวน ${amount} บาท?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/orders?table=${tableId}`, { cache: "no-store" });
      const orders = await res.json();
      const summary = {};

      (orders || []).forEach(order => {
        (order.items || []).forEach(item => {
          if (item.bill_id) return;
          if (summary[item.menu_id]) {
            summary[item.menu_id].qty += Number(item.qty);
            summary[item.menu_id].total += Number(item.price) * Number(item.qty);
          } else {
            summary[item.menu_id] = { menu_id: item.menu_id, name: item.name, qty: Number(item.qty), price: Number(item.price), total: Number(item.price) * Number(item.qty) };
          }
        });
      });
      const items = Object.values(summary);

      const formData = new FormData();
      if (tableId) formData.append("table_id", String(tableId));
      formData.append("items", JSON.stringify(items));
      formData.append("total_price", String(amount));
      formData.append("payment_type", "เงินโอน");
      formData.append("closed_by_id", employee?.id ?? "");
      formData.append("closed_by_name", employee?.name ?? "");
      formData.append("cash_received", String(amount));
      formData.append("change_amount", "0");
      if (remarkParam) formData.append("remark", remarkParam);
      formData.append("slip_image", slip.file);

      const billRes = await fetch("/api/bills", { method: "POST", body: formData });
      if (!billRes.ok) throw new Error("บันทึกบิลล้มเหลว");
      const billData = await billRes.json();

      if (tableId) {
        await Promise.all([tableId, ...relatedTables].map(t =>
          fetch(`/api/tables/${t}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "changeStatus", status: "ว่าง", paymentType: "เงินโอน" })
          })
        ));
      }

      setSuccessData({
        bill: {
          bill_id: billData.bill_id || billData.id || "",
          table_id: tableId, customer_name: customerNameParam,
          cashierName: employee?.name, totalPrice: amount,
          paymentType: "เงินโอน", cashReceived: amount, changeAmount: 0,
        },
        items
      });
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-10 px-4 dark:bg-black">
        <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 dark:shadow-none p-8 text-center space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-3xl border border-green-100 dark:bg-green-900/20 dark:border-green-900/30">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-black text-green-600 dark:text-green-400">ชำระเงินสำเร็จ</h3>
            <p className="text-zinc-500 mt-2 font-medium">ทำรายการบันทึกสลิปและโอนเงินเรียบร้อยแล้ว</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800" onClick={() => router.push("/table")}>กลับหน้าหลัก</Button>
            <Button className="flex-1 h-14 text-white font-bold rounded-2xl shadow-lg" style={{ backgroundColor: BRAND_COLOR }} onClick={() => handlePrintReceipt(successData.bill, successData.items)}>
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
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white hover:shadow-sm"><ArrowLeft className="h-5 w-5 text-slate-600 dark:text-zinc-300" /></Button>
        <h1 className="text-lg font-semibold text-slate-700 dark:text-zinc-100">ชำระเงิน</h1>
        <div className="w-10" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 dark:shadow-none">
        <div className="relative bg-gradient-to-b from-[#FF5722]/10 to-white pt-8 pb-4 px-6 text-center dark:from-[#FF5722]/20 dark:to-zinc-900">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#FF5722]/20 rounded-full shadow-sm mb-4 dark:bg-zinc-800 dark:border-zinc-700">
            <Receipt className="w-4 h-4" style={{ color: BRAND_COLOR }} />
            <span className="text-sm font-medium text-slate-600 dark:text-zinc-300">โต๊ะ {tableId} {relatedTables.length > 0 && `(+${relatedTables.join(",")})`}</span>
          </div>
          <div className="mb-1 text-slate-500 text-sm dark:text-zinc-400">ยอดชำระทั้งหมด</div>
          <div className="text-5xl font-bold text-slate-800 tracking-tight dark:text-white">{Number(amount).toLocaleString()} <span className="text-xl font-medium text-slate-400 ml-2">฿</span></div>
          {remarkParam && (
            <div className="mt-4 flex justify-center">
              <div className="bg-[#FF5722]/10 text-[#FF5722] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-[#FF5722]/20 dark:bg-[#FF5722]/20 dark:border-[#FF5722]/30">
                <MessageSquare className="w-3.5 h-3.5" />{remarkParam}
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
                  <Timer className="w-3 h-3" />{`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                </span>
              )}
            </div>
            <div className="relative group w-full aspect-square max-w-[240px] bg-white rounded-xl border-2 border-slate-100 flex items-center justify-center overflow-hidden dark:bg-zinc-900 dark:border-zinc-700">
              {qrCode ? (
                <img src={qrCode} alt="QR" className="w-full h-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCcw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
                  <Button size="sm" variant="outline" onClick={() => generateQR(amount)} className="text-xs h-8">โหลด QR ใหม่</Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2 dark:text-zinc-300"><ImagePlus className="w-4 h-4" />หลักฐานการโอน</h3>
            {slip.preview ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 group dark:border-zinc-700">
                <img src={slip.preview} alt="Receipt" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="sm" onClick={() => setSlip({ file: null, preview: null })} className="rounded-full shadow-lg"><Trash2 className="w-4 h-4 mr-2" /> ลบรูปภาพ</Button>
                </div>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-[#FF5722]/5 hover:border-[#FF5722]/50 transition-all group dark:bg-zinc-800/50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform dark:bg-zinc-700"><UploadCloud className="w-5 h-5" style={{ color: BRAND_COLOR }} /></div>
                <p className="text-xs text-slate-500 font-medium group-hover:text-[#FF5722] dark:text-zinc-400 transition-colors">แตะเพื่อแนบสลิป</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col bg-white border-t border-slate-50 p-6 pt-4 dark:bg-zinc-900 dark:border-zinc-800">
          <Button onClick={completePayment} disabled={loading || !qrCode || !slip.file} className="w-full h-12 text-base font-semibold rounded-xl text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none" style={{ backgroundColor: BRAND_COLOR, boxShadow: `0 10px 15px -3px ${BRAND_COLOR}40` }}>
            {loading ? "กำลังบันทึก..." : "ยืนยันการชำระเงิน"}
          </Button>
          {employee && <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium bg-slate-50 py-1.5 px-3 rounded-full mx-auto dark:bg-zinc-800 dark:text-zinc-500"><Smartphone className="w-3 h-3" />พนักงาน: {employee.name}</div>}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>}>
      <PaymentContent />
    </Suspense>
  );
}