"use client";

import { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Plus, Minus, Save, Link as LinkIcon, CheckCircle2, User, XCircle, Printer, AlertCircle, Loader2, ArrowLeft, Banknote, CreditCard, Pencil, ShoppingBag, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const adjustOrderQty = async (tableId, menuId, adjustQty, orderId = null) => {
  const body = { menu_id: menuId, adjust_qty: adjustQty };
  if (tableId) body.table_number = tableId;
  if (orderId) body.order_id = orderId;

  const res = await fetch("/api/orders/adjust", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Failed to adjust order");
  return res.json();
};

const fetchTableInfo = async (tableId) => {
  try {
    const res = await fetch(`/api/tables/${tableId}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  } catch { return null; }
};

const fetchOrders = async (tableId, type, customerName) => {
  const url = type === 'takeout' ? `/api/orders?type=takeout&customerName=${encodeURIComponent(customerName)}` : `/api/orders?table=${tableId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { summary: [], unservedDetails: [], rawOrders: [] };

  const orders = await res.json();
  const summary = {};
  const unservedDetails = [];

  for (const order of orders || []) {
    const currentTableNum = order.table_number || 'Takeaway';
    for (const item of order.items || []) {
      const st = item.status ? String(item.status).trim() : 'ไม่มีสถานะ';
      if (item.bill_id || Number(item.qty || 0) <= 0) continue;

      const isCancelled = st === 'ยกเลิก' || st === 'cancelled';
      const isReadyToPay = st === 'เสิร์ฟแล้ว' || st === 'เสร็จสิ้น';

      if (!isReadyToPay && !isCancelled) unservedDetails.push({ name: item.name, status: st, table: currentTableNum });

      const key = isCancelled ? `${item.menu_id}_cancelled` : item.menu_id;
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0);
      const lineTotal = isCancelled ? 0 : (price * qty);

      if (summary[key]) {
        summary[key].qty += qty;
        summary[key].total += lineTotal;
        summary[key].tables[currentTableNum] = (summary[key].tables[currentTableNum] || 0) + qty;
      } else {
        summary[key] = { menu_id: item.menu_id, name: item.name, qty, price, total: lineTotal, tables: { [currentTableNum]: qty }, order_id: order.id, isCancelled };
      }
    }
  }
  return { summary: Object.values(summary), unservedDetails, rawOrders: orders };
};

const updateTable = async (id, action, status = null, paymentType = null) => {
  const res = await fetch(`/api/tables/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, status, paymentType }) });
  if (!res.ok) throw new Error("Failed to update table");
  return res.json();
};

const createBill = async (billData) => {
  const formData = new FormData();
  if (billData.tableId) formData.append("table_id", billData.tableId);
  if (billData.orderType) formData.append("order_type", billData.orderType);
  if (billData.customerName) formData.append("customer_name", billData.customerName);

  formData.append("items", JSON.stringify(billData.items));
  formData.append("total_price", billData.totalPrice);
  formData.append("payment_type", billData.paymentType);
  formData.append("closed_by_id", billData.closedById ?? "");
  formData.append("closed_by_name", billData.closedByName ?? "");
  formData.append("cash_received", billData.cashReceived);
  formData.append("change_amount", billData.changeAmount);

  const res = await fetch("/api/bills", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to create bill");
  return res.json();
};

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

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableParam = searchParams.get("table") ?? searchParams.get("table_id");
  const type = searchParams.get("type");
  const customerName = searchParams.get("customerName");
  const tableId = useMemo(() => { const n = Number(tableParam); return Number.isFinite(n) && n > 0 ? n : null; }, [tableParam]);

  const [orders, setOrders] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unservedItems, setUnservedItems] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [relatedTables, setRelatedTables] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [adjustingId, setAdjustingId] = useState(null);

  const [paymentState, setPaymentState] = useState({ open: false, step: 'select', cash: "", data: null });
  const changeAmount = (parseFloat(paymentState.cash) || 0) - totalPrice;

  useEffect(() => {
    if (!tableId && type !== 'takeout') router.replace("/table");
  }, [tableId, type, router]);

  const loadOrders = useCallback(async () => {
    if (!tableId && type !== 'takeout') return;
    setLoading(true);
    try {
      if (tableId) setTableInfo(await fetchTableInfo(tableId));
      const { summary, unservedDetails, rawOrders: raw } = await fetchOrders(tableId, type, customerName);
      setOrders(summary);
      setUnservedItems(unservedDetails);
      setRawOrders(raw);
      setTotalPrice(summary.reduce((sum, item) => sum + Number(item.total || 0), 0));

      if (tableId) {
        const tableSet = new Set();
        summary.forEach(item => { if (item.tables) Object.keys(item.tables).forEach(t => tableSet.add(String(t))); });
        setRelatedTables(Array.from(tableSet).filter(t => t !== String(tableId) && t !== 'Takeaway').sort((a, b) => Number(a) - Number(b)));
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [tableId, type, customerName]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    fetch("/api/auth/me").then(res => res.json()).then(me => setCurrentEmployee({ id: me?.employee_id || me?.id, name: me?.name || me?.username })).catch(() => { });
  }, []);

  const handleBack = () => {
    if (tableId && type !== 'takeout') router.push(`/table?revert_table_id=${tableId}`);
    else router.back();
  };

  const handleAdjustQtyAction = async (item, amount) => {
    if (item.isCancelled || adjustingId) return;
    if (amount < 0 && item.qty <= 1 && !confirm(`ต้องการ "ยกเลิก" รายการ "${item.name}" ใช่หรือไม่?`)) return;

    setAdjustingId(item.menu_id);
    try {
      const targetOrderId = (type === 'takeout' && rawOrders.length > 0) ? rawOrders[0].id : null;
      if (!tableId && !targetOrderId) throw new Error("ไม่พบข้อมูลออเดอร์ กรุณารีเฟรช");

      await adjustOrderQty(tableId, item.menu_id, amount, targetOrderId);
      await loadOrders();
    } catch (e) { alert("ล้มเหลว: " + e.message); } finally { setAdjustingId(null); }
  };

  const onConfirmPaymentCash = async () => {
    setLoading(true);
    try {
      const res = await createBill({
        tableId, orderType: type === 'takeout' ? 'TAKEAWAY' : 'DINE_IN', customerName,
        items: orders, totalPrice, paymentType: "เงินสด",
        closedById: currentEmployee?.id, closedByName: currentEmployee?.name,
        cashReceived: parseFloat(paymentState.cash), changeAmount
      });

      if (tableId) {
        await updateTable(tableId, "changeStatus", "ว่าง", "เงินสด");
        if (relatedTables.length > 0) await Promise.all(relatedTables.map(tNum => updateTable(tNum, "changeStatus", "ว่าง", "เงินสด")));
      }

      setPaymentState(p => ({
        ...p, step: 'success', data: {
          bill_id: res.bill_id || res.id || "", table_id: tableId, customer_name: customerName,
          cashierName: currentEmployee?.name, totalPrice, paymentType: "เงินสด", cashReceived: p.cash, changeAmount
        }
      }));
    } catch (e) { alert("เกิดข้อผิดพลาดในการบันทึกบิล"); } finally { setLoading(false); }
  };

  const goToTransferPayment = () => {
    const params = new URLSearchParams();
    if (tableId) params.append('table_id', String(tableId));
    if (type) params.append('type', type);
    if (customerName) params.append('customerName', customerName);
    params.append('amount', String(totalPrice));
    if (relatedTables.length > 0) params.append('related', relatedTables.join(","));
    router.push(`/payment?${params.toString()}`);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-zinc-50/50 dark:bg-black">
        <header className="sticky top-0 z-10 flex h-16 items-center px-6 border-b bg-white dark:bg-black dark:border-zinc-800 justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                เช็คบิล {type === 'takeout' ? <span className="text-purple-600 flex items-center gap-1"><User className="w-4 h-4" /> {customerName}</span> : <span>โต๊ะ {tableInfo?.number || tableId}</span>}
              </h1>
              {tableInfo?.group_id && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 mt-1">
                  <LinkIcon className="w-2.5 h-2.5 mr-1" /> รวมโต๊ะ: {[tableInfo.number, ...relatedTables].sort((a, b) => Number(a) - Number(b)).join(", ")}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> กลับ</Button>
        </header>

        <main className="p-6 flex justify-center">
          <div className="w-full max-w-4xl space-y-4">
            {unservedItems.length > 0 && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" /> ยังเสิร์ฟไม่ครบ {unservedItems.length} รายการ
              </div>
            )}

            <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white dark:bg-zinc-900 transition-colors">
              <CardHeader className="border-b dark:border-zinc-800 flex flex-row items-center justify-between py-4">
                <CardTitle className="text-md flex items-center gap-2 font-bold"><Receipt className="w-5 h-5 text-zinc-400" /> รายการอาหารทั้งหมด</CardTitle>
                <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? <><Save className="w-4 h-4 mr-1" /> บันทึก</> : <><Pencil className="w-4 h-4 mr-1" /> แก้ไข</>}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="pl-6">รายการ</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead>
                        <TableHead className="text-right pr-6">ราคารวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((item) => (
                        <TableRow key={item.isCancelled ? `${item.menu_id}-cancelled` : item.menu_id} className={`dark:border-zinc-800 transition-colors ${item.isCancelled ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`font-semibold flex items-center gap-2 ${item.isCancelled ? 'text-gray-400 line-through decoration-gray-400' : 'dark:text-zinc-200'}`}>
                                {item.name}
                                {item.isCancelled && <span className="no-underline inline-flex items-center text-[10px] text-red-500 bg-red-100 px-2 py-0.5 rounded-full dark:bg-red-900/50 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" /> ยกเลิก</span>}
                              </span>
                              <div className={`flex flex-wrap gap-1 ${item.isCancelled ? 'opacity-50' : ''}`}>
                                {Object.entries(item.tables).map(([tNum, q]) => tNum !== '0' && tNum !== 'Takeaway' ? (
                                  <span key={tNum} className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full border dark:border-zinc-700">
                                    โต๊ะ {tNum}: {q}
                                  </span>
                                ) : null)}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {isEditing && !item.isCancelled ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => handleAdjustQtyAction(item, -1)} disabled={adjustingId === item.menu_id}><Minus className="w-3 h-3" /></Button>
                                <span className="font-bold w-6 dark:text-zinc-200">{item.qty}</span>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => handleAdjustQtyAction(item, 1)} disabled={adjustingId === item.menu_id}><Plus className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <Badge variant="secondary" className={`font-bold px-3 py-1 rounded-full border-none ${item.isCancelled ? 'bg-gray-100 text-gray-400 line-through dark:bg-zinc-800 dark:text-zinc-600' : 'text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                x {item.qty}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={`text-right pr-6 font-bold ${item.isCancelled ? 'text-gray-400' : 'dark:text-zinc-200'}`}>{item.total.toLocaleString()} ฿</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-5 flex justify-between items-center border-t bg-zinc-50/50 dark:bg-zinc-900/80 dark:border-zinc-800">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-widest">ยอดสุทธิรวม</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{totalPrice.toLocaleString()} <span className="text-sm font-normal text-zinc-500">฿</span></p>
                  </div>
                  <Button disabled={unservedItems.length > 0 && !isEditing} onClick={() => setPaymentState(p => ({ ...p, open: true }))} className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 h-11 px-8 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                    ชำระเงิน
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Dialog open={paymentState.open} onOpenChange={(open) => {
          if (!open) {
            if (paymentState.step === 'success') router.push('/table');
            else setPaymentState(p => ({ ...p, open: false, step: 'select', cash: "" }));
          } else setPaymentState(p => ({ ...p, open: true }));
        }}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 gap-0 overflow-hidden border-none shadow-2xl dark:bg-zinc-900">
            {paymentState.step !== 'success' && <DialogHeader className="pb-4"><DialogTitle className="text-center text-xl font-bold dark:text-zinc-100">ช่องทางชำระเงิน</DialogTitle></DialogHeader>}

            {paymentState.step === 'select' ? (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPaymentState(p => ({ ...p, step: 'cash_input' }))} className="p-8 border-2 rounded-[1.5rem] flex flex-col items-center gap-3 hover:border-green-500 hover:bg-green-50/50 dark:border-zinc-800 dark:hover:bg-green-500/10 transition-all group">
                    <Banknote className="w-12 h-12 text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg text-zinc-700 dark:text-zinc-300">เงินสด</span>
                  </button>
                  <button onClick={goToTransferPayment} className="p-8 border-2 rounded-[1.5rem] flex flex-col items-center gap-3 hover:border-blue-500 hover:bg-blue-50/50 dark:border-zinc-800 dark:hover:bg-blue-500/10 transition-all group">
                    <CreditCard className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg text-zinc-700 dark:text-zinc-300">เงินโอน</span>
                  </button>
                </div>
              </div>
            ) : paymentState.step === 'cash_input' ? (
              <div className="space-y-6 pt-2">
                <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">ยอดที่ต้องชำระ</p>
                  <p className="text-3xl font-black text-orange-600 dark:text-orange-500">{totalPrice.toLocaleString()} ฿</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Label className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5 block text-center">รับเงินมา</Label>
                    <Input type="number" className="h-16 text-3xl font-black rounded-2xl text-center border-2 focus-visible:ring-0 focus-visible:border-orange-500 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100" value={paymentState.cash} onChange={(e) => setPaymentState(p => ({ ...p, cash: e.target.value }))} placeholder="0.00" autoFocus />
                  </div>
                </div>
                <div className={`p-5 rounded-2xl flex flex-col items-center justify-center border-2 ${paymentState.cash === "" ? 'bg-zinc-50 border-transparent text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500' : changeAmount >= 0 ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400' : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1">{changeAmount >= 0 ? "เงินทอน" : "ยอดขาด"}</span>
                  <div className="flex items-center gap-2">
                    {changeAmount >= 0 && paymentState.cash !== "" && <CheckCircle2 className="w-6 h-6" />}
                    <span className="text-4xl font-black">{paymentState.cash === "" ? "0" : Math.abs(changeAmount).toLocaleString()} ฿</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold dark:text-zinc-400 dark:hover:bg-zinc-800" onClick={() => setPaymentState(p => ({ ...p, cash: "", step: 'select' }))}>กลับ</Button>
                  <Button className="flex-[2] h-14 bg-zinc-900 hover:bg-black text-white text-lg font-black rounded-2xl shadow-xl disabled:opacity-30 transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200" disabled={!paymentState.cash || changeAmount < 0 || loading} onClick={onConfirmPaymentCash}>
                    {loading ? "กำลังบันทึก..." : "ยืนยันการชำระ"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-2 text-center">
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-3xl border border-green-100 dark:bg-green-900/20 dark:border-green-900/30">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
                  <h3 className="text-2xl font-black text-green-600 dark:text-green-400">ชำระเงินสำเร็จ</h3>
                  <p className="text-zinc-500 mt-2">เงินทอน: <span className="font-bold text-lg text-zinc-800 dark:text-zinc-200">{Number(paymentState.data?.changeAmount || 0).toLocaleString()} ฿</span></p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800" onClick={() => router.push("/table")}>กลับหน้าหลัก</Button>
                  <Button className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg" onClick={() => handlePrintReceipt(paymentState.data, orders)}>
                    <Printer className="w-5 h-5 mr-2" /> พิมพ์ใบเสร็จ
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}