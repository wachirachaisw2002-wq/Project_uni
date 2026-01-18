"use client";

import { useEffect, useMemo, useState, Suspense } from "react"; // 1. เพิ่ม Suspense ตรงนี้
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CreditCard,
  Receipt,
  Pencil,
  Minus,
  Plus,
  Save,
  Link as LinkIcon,
  CheckCircle2
} from "lucide-react";

const adjustOrderQty = async (tableId, menuId, adjustQty) => {
  const res = await fetch("/api/orders/adjust", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      table_number: tableId,
      menu_id: menuId,
      adjust_qty: adjustQty
    }),
  });
  if (!res.ok) throw new Error("Failed to adjust order");
  return res.json();
};

const fetchTableInfo = async (tableId) => {
  try {
    const res = await fetch(`/api/tables/${tableId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) { return null; }
};

const fetchOrdersByTable = async (tableId) => {
  const res = await fetch(`/api/orders?table=${tableId}`, { cache: "no-store" });
  if (!res.ok) return { summary: [], unservedDetails: [] };

  const orders = await res.json();
  const summary = {};
  const unservedDetails = [];

  for (const order of orders || []) {
    const currentTableNum = order.table_number;
    for (const item of order.items || []) {
      const st = item.status ? String(item.status).trim() : 'ไม่มีสถานะ';
      if (item.bill_id) continue;
      if (Number(item.qty || 0) <= 0) continue;
      if (st === 'ยกเลิก' || st === 'cancelled') continue;

      const isReadyToPay = st === 'เสิร์ฟแล้ว';
      if (!isReadyToPay) {
        unservedDetails.push({ name: item.name, status: st, table: currentTableNum });
      }

      const key = item.menu_id;
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0);
      const lineTotal = price * qty;

      if (summary[key]) {
        summary[key].qty += qty;
        summary[key].total += lineTotal;
        if (!summary[key].tables[currentTableNum]) summary[key].tables[currentTableNum] = 0;
        summary[key].tables[currentTableNum] += qty;
      } else {
        summary[key] = {
          menu_id: item.menu_id,
          name: item.name,
          qty: qty,
          price: price,
          total: lineTotal,
          tables: { [currentTableNum]: qty }
        };
      }
    }
  }
  return { summary: Object.values(summary), unservedDetails };
};

const updateTable = async (id, action, status = null, paymentType = null) => {
  const res = await fetch(`/api/tables/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, status, paymentType }),
  });
  if (!res.ok) throw new Error("Failed to update table");
  return res.json();
};

const createBill = async (billData) => {
  const formData = new FormData();
  formData.append("table_id", billData.tableId);
  formData.append("items", JSON.stringify(billData.items));
  formData.append("total_price", billData.totalPrice);
  formData.append("payment_type", billData.paymentType);
  formData.append("closed_by_id", billData.closedById ?? "");
  formData.append("closed_by_name", billData.closedByName ?? "");
  formData.append("cash_received", billData.cashReceived);
  formData.append("change_amount", billData.changeAmount);

  const res = await fetch("/api/bills", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to create bill");
  return res.json();
};

// 2. เปลี่ยนชื่อฟังก์ชันนี้ จาก export default function BillingPage() เป็น function BillingContent()
function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableParam = useMemo(() => searchParams.get("table") ?? searchParams.get("table_id"), [searchParams]);
  const tableId = useMemo(() => {
    const n = Number(tableParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [tableParam]);

  const [orders, setOrders] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unservedItems, setUnservedItems] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [relatedTables, setRelatedTables] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [adjustingId, setAdjustingId] = useState(null);
  const [paymentStep, setPaymentStep] = useState('select');
  const [cashReceived, setCashReceived] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);

  useEffect(() => {
    if (!tableId) { router.replace("/table"); }
  }, [tableId, router]);

  const loadOrders = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const info = await fetchTableInfo(tableId);
      setTableInfo(info);
      const { summary, unservedDetails } = await fetchOrdersByTable(tableId);
      setOrders(summary);
      setUnservedItems(unservedDetails);
      setTotalPrice(summary.reduce((sum, item) => sum + Number(item.total || 0), 0));

      const tableSet = new Set();
      summary.forEach(item => { if (item.tables) Object.keys(item.tables).forEach(t => tableSet.add(String(t))); });
      const others = Array.from(tableSet).filter(t => t !== String(tableId)).sort((a, b) => Number(a) - Number(b));
      setRelatedTables(others);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { loadOrders(); }, [tableId]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const me = await res.json();
          setCurrentEmployee({ id: me?.employee_id || me?.id, name: me?.name || me?.username });
        }
      } catch (e) { }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    const received = parseFloat(cashReceived) || 0;
    setChangeAmount(received - totalPrice);
  }, [cashReceived, totalPrice]);

  const handleAdjustQtyAction = async (item, amount) => {
    if (adjustingId) return;
    if (amount < 0 && item.qty <= 1) { if (!confirm(`ลบรายการ "${item.name}"?`)) return; }
    setAdjustingId(item.menu_id);
    try {
      await adjustOrderQty(tableId, item.menu_id, amount);
      await loadOrders();
    } catch (e) { alert("ล้มเหลว"); } finally { setAdjustingId(null); }
  };

  const onConfirmPaymentCash = async () => {
    setLoading(true);
    try {
      await createBill({
        tableId, items: orders, totalPrice, paymentType: "เงินสด",
        closedById: currentEmployee?.id, closedByName: currentEmployee?.name,
        cashReceived: parseFloat(cashReceived),
        changeAmount: changeAmount
      });
      await updateTable(tableId, "changeStatus", "ว่าง", "เงินสด");
      if (relatedTables.length > 0) {
        await Promise.all(relatedTables.map(tNum => updateTable(tNum, "changeStatus", "ว่าง", "เงินสด")));
      }
      router.push("/table");
    } catch (e) { alert("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  const goToTransferPayment = () => {
    const params = new URLSearchParams({
      table_id: String(tableId),
      amount: String(totalPrice),
      related: relatedTables.join(",")
    });
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
              <h1 className="text-lg font-bold">เช็คบิล โต๊ะ {tableId}</h1>
              {tableInfo?.group_id && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                  <LinkIcon className="w-2.5 h-2.5 mr-1" />
                  รวมโต๊ะ: {[tableId, ...relatedTables].sort((a, b) => Number(a) - Number(b)).join(", ")}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> กลับ</Button>
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
                <CardTitle className="text-md flex items-center gap-2 font-bold">
                  <Receipt className="w-5 h-5 text-zinc-400" /> รายการอาหารทั้งหมด
                </CardTitle>
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
                        <TableRow key={item.menu_id} className="dark:border-zinc-800">
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold dark:text-zinc-200">{item.name}</span>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(item.tables).map(([tNum, q]) => (
                                  <span key={tNum} className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full border dark:border-zinc-700">
                                    โต๊ะ {tNum}: {q}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => handleAdjustQtyAction(item, -1)} disabled={adjustingId === item.menu_id}><Minus className="w-3 h-3" /></Button>
                                <span className="font-bold w-6 dark:text-zinc-200">{item.qty}</span>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => handleAdjustQtyAction(item, 1)} disabled={adjustingId === item.menu_id}><Plus className="w-3 h-3" /></Button>
                              </div>
                            ) : <Badge variant="secondary" className="font-bold px-3 py-1 rounded-full text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-none">x {item.qty}</Badge>}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-bold dark:text-zinc-200">{item.total.toLocaleString()} ฿</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-5 flex justify-between items-center border-t bg-zinc-50/50 dark:bg-zinc-900/80 dark:border-zinc-800">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-widest">
                      ยอดสุทธิรวม
                    </p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                      {totalPrice.toLocaleString()} <span className="text-sm font-normal text-zinc-500">฿</span>
                    </p>
                  </div>

                  <Button
                    disabled={unservedItems.length > 0 && !isEditing}
                    onClick={() => setPaymentDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 h-11 px-8 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    ชำระเงิน
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
          if (!open) { setPaymentStep('select'); setCashReceived(""); }
          setPaymentDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 gap-0 overflow-hidden border-none shadow-2xl dark:bg-zinc-900">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center text-xl font-bold dark:text-zinc-100">ช่องทางชำระเงิน</DialogTitle>
            </DialogHeader>

            {paymentStep === 'select' ? (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => setPaymentStep('cash_input')} className="p-8 border-2 rounded-[1.5rem] flex flex-col items-center gap-3 hover:border-green-500 hover:bg-green-50/50 dark:border-zinc-800 dark:hover:bg-green-500/10 transition-all group">
                  <Banknote className="w-12 h-12 text-green-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-lg text-zinc-700 dark:text-zinc-300">เงินสด</span>
                </button>
                <button onClick={goToTransferPayment} className="p-8 border-2 rounded-[1.5rem] flex flex-col items-center gap-3 hover:border-blue-500 hover:bg-blue-50/50 dark:border-zinc-800 dark:hover:bg-blue-500/10 transition-all group">
                  <CreditCard className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-lg text-zinc-700 dark:text-zinc-300">เงินโอน</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">ยอดที่ต้องชำระ</p>
                  <p className="text-3xl font-black text-orange-600 dark:text-orange-500">{totalPrice.toLocaleString()} ฿</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Label className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5 block text-center">รับเงินมา (Cash Received)</Label>
                    <Input
                      type="number"
                      className="h-16 text-3xl font-black rounded-2xl text-center border-2 focus-visible:ring-0 focus-visible:border-orange-500 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div className={`p-5 rounded-2xl flex flex-col items-center justify-center border-2 ${cashReceived === "" ? 'bg-zinc-50 border-transparent text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500' :
                  changeAmount >= 0 ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400' : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400'
                  }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1">
                    {changeAmount >= 0 ? "เงินทอน (Change)" : "ยอดขาด (Remaining)"}
                  </span>
                  <div className="flex items-center gap-2">
                    {changeAmount >= 0 && cashReceived !== "" && <CheckCircle2 className="w-6 h-6" />}
                    <span className="text-4xl font-black">
                      {cashReceived === "" ? "0" : Math.abs(changeAmount).toLocaleString()} ฿
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-bold dark:text-zinc-400 dark:hover:bg-zinc-800" onClick={() => { setCashReceived(""); setPaymentStep('select'); }}>กลับ</Button>
                  <Button
                    className="flex-[2] h-14 bg-zinc-900 hover:bg-black text-white text-lg font-black rounded-2xl shadow-xl disabled:opacity-30 transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    disabled={!cashReceived || changeAmount < 0 || loading}
                    onClick={onConfirmPaymentCash}
                  >
                    {loading ? "กำลังบันทึก..." : "ยืนยันการชำระ"}
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

// 3. เพิ่มส่วนนี้สำหรับการ Export ออกไปใช้งานจริง (ตัวครอบ Suspense)
export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
      <BillingContent />
    </Suspense>
  );
}