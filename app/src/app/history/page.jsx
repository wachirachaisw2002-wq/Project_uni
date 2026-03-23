"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Eye, CalendarIcon, Search, Receipt, Pencil, Plus, Minus, Trash2,
  ChevronLeft, ChevronRight, User, AlertTriangle, ShoppingBag,
  MessageSquare, Loader2, Printer, Image as ImageIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const getPaymentBadge = (type) => (
  <Badge className={`shadow-none ${type === "เงินสด" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}>
    {type}
  </Badge>
);

const handlePrintReceipt = (billData, itemsData) => {
  if (!billData || !itemsData || billData.status === 'VOID') return;
  const storeName = "ร้านตำลืมผัว";
  const receiptHtml = `
    <html>
      <head>
        <title>ใบเสร็จรับเงิน #${billData.bill_id}</title>
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
          
          @media print {
            .no-print { display: none !important; }
          }
          .action-buttons { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #ccc; display: flex; gap: 10px; justify-content: center; }
          .btn-print { flex: 1; background: #10b981; color: #fff; border: none; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-print:hover { background: #059669; }
          .btn-close { flex: 1; background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; padding: 10px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: bold; }
          .btn-close:hover { background: #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="text-center font-bold text-xl mb-1">${storeName}</div>
        <div class="text-center mb-2">ใบเสร็จรับเงิน</div>
        
        <div class="flex mb-1"><span>เลขที่บิล:</span> <span>#${billData.bill_id}</span></div>
        <div class="flex mb-1"><span>วันที่:</span> <span>${billData.dateOnly} ${billData.timeOnly}</span></div>
        <div class="flex mb-1"><span>พนักงาน:</span> <span>${billData.cashierName}</span></div>
        <div class="flex mb-1"><span>ลูกค้า/โต๊ะ:</span> <span class="font-bold">${Number(billData.table_id) > 0 ? 'โต๊ะ ' + billData.table_id : billData.customer_name || 'สั่งกลับบ้าน'}</span></div>
        <div class="divider"></div>
        <table>
          <thead><tr><th class="text-left" style="width: 50%;">รายการ</th><th class="text-center" style="width: 20%;">จำนวน</th><th class="text-right" style="width: 30%;">ราคา</th></tr></thead>
          <tbody>
            ${itemsData.map(i => `<tr><td class="text-left">${i.name_th || i.menu_name}</td><td class="text-center">${i.qty || i.quantity}</td><td class="text-right">${((Number(i.qty) || Number(i.quantity) || 0) * Number(i.price)).toLocaleString()}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="flex font-bold text-lg mt-2"><span>ยอดรวมทั้งสิ้น</span><span>${Number(billData.total_price).toLocaleString()} บาท</span></div>
        <div class="flex mt-1 text-sm"><span>ชำระโดย:</span><span>${billData.payment_type}</span></div>
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

export default function Page() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [printingBillId, setPrintingBillId] = useState(null);

  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(me => setCurrentEmployee({ id: me?.employee_id || me?.id, name: me?.name_th || me?.name || "พนักงาน" })).catch(() => { });
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bills-history");
      const list = (await res.json() || []).map(o => ({
        ...o,
        created: o.created_at ? new Date(o.created_at) : null,
        dateOnly: o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "",
        timeOnly: o.created_at ? format(new Date(o.created_at), "HH:mm") : "",
        cashierName: o.name_th || o.cashier_name || "ไม่ระบุ",
      }));
      setOrders(list);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const loadBillItems = async (billId) => {
    try {
      const res = await fetch(`/api/bill-items?id=${billId}`);
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items || []);
    } catch { return []; }
  };

  const handleOpenView = async (order) => {
    setSelectedBill(order);
    const items = await loadBillItems(order.bill_id);
    setBillItems(items);
    setViewModalOpen(true);
  };

  const handleDirectPrint = async (order) => {
    setPrintingBillId(order.bill_id);
    const items = await loadBillItems(order.bill_id);
    handlePrintReceipt(order, items);
    setPrintingBillId(null);
  };

  const handleOpenSlip = (url) => {
    setSelectedSlipUrl(url);
    setSlipModalOpen(true);
  };

  const filteredOrders = useMemo(() => orders.filter(o => {
    const s = search.toLowerCase();
    const matchText = (o.table_id || "").toString().includes(s) || (o.bill_id || "").toString().includes(s) || (o.cashierName || "").toLowerCase().includes(s) || (o.customer_name || "").toLowerCase().includes(s);
    const matchDate = !selectedDate || (o.created && o.created.toDateString() === selectedDate.toDateString());
    return matchText && matchDate;
  }), [orders, search, selectedDate]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-zinc-50/30 dark:bg-black">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-4"><SidebarTrigger /><h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ประวัติยอดการสั่งอาหาร</h1></div>
        </header>

        <main className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /><p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูลประวัติ...</p></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input placeholder="ค้นหาเลขบิล, โต๊ะ, ชื่อพนักงาน หรือชื่อลูกค้า..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 h-10 bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 rounded-xl shadow-sm" />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-sm ${selectedDate ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50" : "text-zinc-500"}`}>
                      <CalendarIcon className={`h-4 w-4 mr-2 ${selectedDate ? "text-emerald-500" : "text-zinc-400"}`} />
                      {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: th }) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4 rounded-3xl shadow-2xl border-none bg-white/95 dark:bg-zinc-900/95" align="end">
                    <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setPage(1); }} locale={th} className="p-0" />
                  </PopoverContent>
                </Popover>
              </div>

              <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-zinc-900/40 ring-1 ring-zinc-200 dark:ring-zinc-800 flex flex-col">
                <CardContent className="p-0 flex-1 overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                      <TableRow className="dark:border-zinc-800">
                        <TableHead className="w-[100px] py-4 pl-4">เลขบิล</TableHead><TableHead className="text-center">โต๊ะ / ประเภท</TableHead><TableHead>ยอดรวม</TableHead><TableHead>ชำระเงิน</TableHead><TableHead>พนักงาน</TableHead><TableHead>วัน/เวลา</TableHead><TableHead className="text-right pr-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center text-zinc-400"><div className="flex flex-col items-center gap-2"><AlertTriangle className="h-6 w-6 opacity-20" /><span className="text-xs">ไม่พบข้อมูลประวัติบิล</span></div></TableCell></TableRow>
                      ) : paginatedOrders.map((order) => (
                        <TableRow key={order.bill_id} className={`group dark:border-zinc-800 ${order.status === 'VOID' ? 'bg-red-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}>
                          <TableCell className="font-mono text-sm pl-4"><span className="text-zinc-400">#</span>{order.bill_id}</TableCell>
                          <TableCell className="text-center">
                            {Number(order.table_id) > 0 ? <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-bold border dark:border-zinc-700">{order.table_id}</span>
                              : <div className="flex flex-col items-center gap-1"><span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold border border-orange-100 flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> กลับบ้าน</span><span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{order.customer_name}</span></div>}
                          </TableCell>
                          <TableCell className="font-bold"><div className={order.status === 'VOID' ? 'line-through opacity-30' : ''}>{Number(order.total_price).toLocaleString()} ฿</div></TableCell>
                          <TableCell>{order.status === 'VOID' ? <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">VOID</Badge> : getPaymentBadge(order.payment_type)}</TableCell>
                          <TableCell className="text-sm text-zinc-500">{order.cashierName}</TableCell>
                          <TableCell className="text-xs text-zinc-400">{order.dateOnly} <span className="opacity-50">{order.timeOnly}</span></TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end gap-2">
                              {order.status !== 'VOID' && (
                                <>
                                  {order.payment_type === 'เงินโอน' && order.slip_url && (
                                    <Button variant="outline" size="sm" onClick={() => handleOpenSlip(order.slip_url)} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg">
                                      <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> สลิป
                                    </Button>
                                  )}

                                  <Button variant="outline" size="sm" onClick={() => handleDirectPrint(order)} disabled={printingBillId === order.bill_id} className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg">
                                    {printingBillId === order.bill_id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Printer className="h-3.5 w-3.5 mr-1.5" />} พิมพ์
                                  </Button>
                                </>
                              )}
                              <Button variant="secondary" size="sm" onClick={() => handleOpenView(order)} className="h-8 bg-white text-black hover:bg-zinc-200 dark:bg-zinc-100 dark:text-black dark:hover:bg-white rounded-lg font-bold transition-all shadow-sm">
                                <Eye className="h-3.5 w-3.5 mr-1.5" /> ดูบิล
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>

                {filteredOrders.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                    <div className="text-[10px] text-zinc-500">แสดงรายการที่ {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filteredOrders.length)} จาก {filteredOrders.length} รายการ</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-2"><ChevronLeft className="h-4 w-4" /> ก่อนหน้า</Button>
                      <div className="text-xs font-medium text-zinc-600 min-w-[3rem] text-center">{page} / {totalPages || 1}</div>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="h-8 px-2">ถัดไป <ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </main>

        <ViewBillModal
          open={viewModalOpen} onClose={() => setViewModalOpen(false)}
          bill={selectedBill} items={billItems}
          onEdit={() => { setViewModalOpen(false); setEditModalOpen(true); }}
        />

        <EditBillModal
          open={editModalOpen} onClose={() => setEditModalOpen(false)}
          bill={selectedBill} initialItems={billItems} employee={currentEmployee}
          onSuccess={fetchOrders}
        />

        <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-center flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                <ImageIcon className="w-5 h-5" /> สลิปชำระเงิน
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center bg-zinc-50 dark:bg-black/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800/50">
              {selectedSlipUrl ? (
                <img
                  src={selectedSlipUrl}
                  alt="Slip"
                  className="max-w-full max-h-[60vh] rounded-xl shadow-sm object-contain"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x400?text=Image+Not+Found"; }}
                />
              ) : (
                <div className="flex flex-col items-center py-10 text-zinc-400">
                  <AlertTriangle className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">ไม่พบรูปภาพสลิป</p>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6 sm:justify-center">
              <Button variant="outline" onClick={() => setSlipModalOpen(false)} className="rounded-xl w-full sm:w-auto font-bold">
                ปิดหน้าต่าง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
    </SidebarProvider>
  );
}

function ViewBillModal({ open, onClose, bill, items, onEdit }) {
  if (!bill) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-2 border-b dark:border-zinc-900">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Receipt className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <DialogTitle className="text-lg">รายละเอียดบิล #{bill.bill_id}</DialogTitle>
                <DialogDescription className="text-xs flex flex-col gap-1 mt-1">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> ผู้เช็คบิล: {bill.cashierName}</span>
                  {bill.customer_name && <span className="flex items-center gap-1 text-orange-500"><ShoppingBag className="w-3 h-3" /> ลูกค้า: {bill.customer_name}</span>}
                </DialogDescription>
              </div>
            </div>
            {bill.status === 'VOID' && <Badge variant="destructive">ยกเลิกแล้ว</Badge>}
          </div>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-zinc-100 dark:border-zinc-900 overflow-hidden max-h-[40vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50 sticky top-0"><TableRow><TableHead className="text-xs h-9 w-[50px] text-center">โต๊ะ</TableHead><TableHead className="text-xs h-9">รายการเมนู</TableHead><TableHead className="text-center text-xs h-9">จำนวน</TableHead><TableHead className="text-right text-xs h-9">รวม</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2 text-center text-xs text-zinc-400">{item.table_no || item.table_id || (Number(bill.table_id) > 0 ? bill.table_id : '-')}</TableCell>
                    <TableCell className="py-2 text-sm">{item.name_th || item.menu_name}</TableCell>
                    <TableCell className="py-2 text-center text-sm font-mono">x{item.qty || item.quantity}</TableCell>
                    <TableCell className="py-2 text-right text-sm font-bold">{((Number(item.qty) || Number(item.quantity) || 0) * Number(item.price)).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border space-y-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>ช่องทาง: {bill.payment_type}</span>
              <span>{Number(bill.table_id) > 0 ? `โต๊ะ: ${bill.table_id}` : <span className="flex items-center gap-1 text-orange-500 font-bold"><ShoppingBag className="w-3 h-3" /> กลับบ้าน</span>}</span>
            </div>
            {bill.remark && <div className="bg-yellow-50 p-2.5 rounded-xl text-xs text-yellow-700 flex gap-2"><MessageSquare className="w-4 h-4 shrink-0 mt-0.5" /><div><span className="font-bold">หมายเหตุ:</span> {bill.remark}</div></div>}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold">ยอดสุทธิรวม</span>
              <span className={`text-xl font-black ${bill.status === 'VOID' ? 'text-zinc-500 line-through' : 'text-emerald-500'}`}>{bill.status === 'VOID' ? '0' : Number(bill.total_price).toLocaleString()} ฿</span>
            </div>
          </div>
          {bill.status === 'VOID' && <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl"><p className="text-[10px] font-bold text-red-500 uppercase">เหตุผลการ Void:</p><p className="text-sm text-red-700 font-medium">{bill.void_reason}</p></div>}
        </div>

        <DialogFooter className="p-4 pt-0 flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">ปิดหน้าต่าง</Button>
          {bill.status !== 'VOID' && <Button onClick={onEdit} className="flex-1 bg-zinc-900 dark:bg-white dark:text-black rounded-xl"><Pencil className="w-4 h-4 mr-2" /> แก้ไขบิล</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBillModal({ open, onClose, bill, initialItems, employee, onSuccess }) {
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState("");
  const [payment, setPayment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && bill) {
      setItems(initialItems.map(i => ({ ...i, qty: Number(i.qty || i.quantity || 0), price: Number(i.price || 0) })));
      setPayment(bill.payment_type || "เงินสด");
      setReason("");
    }
  }, [open, bill, initialItems]);

  const updateQty = (idx, delta) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!reason.trim()) return alert("กรุณาระบุสาเหตุ");
    setLoading(true);
    try {
      const res = await fetch("/api/bills-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_id: bill.bill_id, type: 'EDIT', user_id: employee?.id, payment_type: payment,
          total_price: items.reduce((s, i) => s + (i.qty * i.price), 0), items, void_reason: reason
        }),
      });
      if (res.ok) { onClose(); onSuccess(); } else alert("เกิดข้อผิดพลาด");
    } catch { alert("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden rounded-3xl shadow-2xl">
        <DialogHeader className="p-6 bg-zinc-50 border-b"><div className="flex items-center gap-3"><div className="p-2.5 bg-blue-500/10 rounded-2xl"><Pencil className="w-5 h-5 text-blue-500" /></div><div><DialogTitle className="text-xl font-bold">แก้ไขรายการบิล #{bill.bill_id}</DialogTitle><DialogDescription>ปรับปรุงจำนวนรายการอาหารเพื่อออกบิลใหม่ (บิลเดิมจะถูกยกเลิก)</DialogDescription></div></div></DialogHeader>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">รายการอาหารในบิล</Label>
            <div className="max-h-[35vh] overflow-y-auto rounded-2xl border bg-zinc-50/30">
              <Table>
                <TableHeader className="bg-zinc-100 sticky top-0 z-10"><TableRow><TableHead className="text-xs font-bold">เมนู</TableHead><TableHead className="text-center text-xs font-bold w-[140px]">จำนวน</TableHead><TableHead className="text-right text-xs font-bold">ราคา/หน่วย</TableHead><TableHead className="text-right text-xs font-bold w-[120px]">รวม</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 font-medium text-sm">{item.name_th || item.menu_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 bg-white border p-1 rounded-xl w-max mx-auto">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(idx, -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="text-sm font-bold w-8 text-center">{item.qty}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(idx, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-zinc-500">{Number(item.price).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-sm">{(item.qty * Number(item.price)).toLocaleString()}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-zinc-400 hover:text-red-500 h-8 w-8"><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><Label className="text-xs font-bold uppercase tracking-widest text-red-500">สาเหตุการแก้ไข (จำเป็น)</Label></div>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-2xl bg-zinc-50 min-h-[100px] text-sm" placeholder="ระบุสาเหตุ..." />
            </div>
            <div className="flex flex-col justify-end">
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ยอดรวมสุทธิใหม่</span>
                <div className="flex items-baseline gap-1.5"><span className="text-4xl font-black text-emerald-500">{items.reduce((s, i) => s + (i.qty * Number(i.price)), 0).toLocaleString()}</span><span className="text-lg font-bold text-emerald-500">฿</span></div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 bg-zinc-50 border-t flex-row gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold">ยกเลิก</Button>
          <Button onClick={handleSave} disabled={loading || !reason.trim() || items.length === 0} className="flex-[1.5] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg">
            {loading ? "กำลังบันทึก..." : "ยืนยันและออกบิลใหม่"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}