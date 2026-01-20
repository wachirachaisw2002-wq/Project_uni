"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Eye,
  CalendarIcon,
  Search,
  Receipt,
  Pencil,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  AlertTriangle,
  ShoppingBag,
  MessageSquare,
  Loader2 // ✅ Import Loader2 เพิ่ม
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Page() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItems, setEditingItems] = useState([]);
  const [editPaymentType, setEditPaymentType] = useState("");
  const [editReason, setEditReason] = useState("");

  // ดึงข้อมูลพนักงานปัจจุบัน
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const me = await res.json();
        setCurrentEmployee({
          id: me?.employee_id || me?.id,
          name: me?.name_th || me?.name || "พนักงาน",
        });
      } catch (e) { console.error(e); }
    };
    fetchMe();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bills-history");
      const data = await res.json();
      const list = (Array.isArray(data) ? data : []).map((o) => ({
        ...o,
        created: o.created_at ? new Date(o.created_at) : null,
        dateOnly: o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "",
        timeOnly: o.created_at ? format(new Date(o.created_at), "HH:mm") : "",
        cashierName: o.name_th || o.cashier_name || "ไม่ระบุ",
      }));
      setOrders(list);
    } catch (err) { setOrders([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchBillItems = async (billId) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/bill-items?id=${billId}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      setBillItems(items);
      return items;
    } catch { setBillItems([]); return []; } finally { setLoadingItems(false); }
  };

  const handleOpenEdit = async () => {
    const bill = orders.find(o => o.bill_id === selectedBillId);
    if (!bill) return;
    const items = await fetchBillItems(selectedBillId);

    setEditPaymentType(bill.payment_type || "เงินสด");

    setEditingItems(items.map(i => ({
      ...i,
      qty: Number(i.qty || i.quantity || 0),
      price: Number(i.price || 0)
    })));

    setEditReason("");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim()) return alert("กรุณาระบุสาเหตุ");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/bills-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bill_id: selectedBillId,
          type: 'EDIT',
          user_id: currentEmployee.id,
          payment_type: editPaymentType,
          total_price: editingItems.reduce((s, i) => s + (i.qty * i.price), 0),
          items: editingItems,
          void_reason: editReason
        }),
      });

      if (res.ok) {
        await fetchOrders();
        setEditDialogOpen(false);
        setOpen(false);
      }
    } catch (e) { alert("เกิดข้อผิดพลาด"); } finally { setIsProcessing(false); }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const searchStr = search.toLowerCase();
      const customerName = (o.customer_name || "").toLowerCase();
      const matchText = (o.table_id?.toString() || "").includes(searchStr) ||
        (o.bill_id?.toString() || "").includes(searchStr) ||
        (o.cashierName || "").toLowerCase().includes(searchStr) ||
        customerName.includes(searchStr);
      const matchDate = !selectedDate || (o.created && o.created.toDateString() === selectedDate.toDateString());
      return matchText && matchDate;
    });
  }, [orders, search, selectedDate]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const getPaymentBadge = (type) => {
    if (type === "เงินสด") return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-none">เงินสด</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-none">โอนเงิน</Badge>;
  };

  const selectedBillData = orders.find(o => o.bill_id === selectedBillId);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white dark:bg-black">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-6 
            bg-white/80 backdrop-blur-md border-b border-zinc-200
            dark:bg-black/80 dark:border-zinc-800"
        >
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ประวัติยอดการสั่งอาหาร</h1>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">

          {/* ✅ ส่วน Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูลประวัติ...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="ค้นหาเลขบิล, โต๊ะ, ชื่อพนักงาน หรือชื่อลูกค้า..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10 h-10 bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100 rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-10 border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-xl transition-all
                        ${selectedDate ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/10" : "text-zinc-500 dark:text-zinc-300"}
                      `}
                    >
                      <CalendarIcon className={`h-4 w-4 mr-2 ${selectedDate ? "text-emerald-500" : "text-zinc-400"}`} />
                      {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: th }) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-4 rounded-3xl shadow-2xl border-none bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800"
                    align="end"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setPage(1); }}
                      locale={th}
                      className="p-0"
                      classNames={{
                        day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white shadow-lg shadow-emerald-500/30 scale-100",
                        day_today: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden rounded-2xl shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                      <TableRow className="border-zinc-200 dark:border-zinc-800">
                        <TableHead className="w-[100px] py-4">เลขบิล</TableHead>
                        <TableHead className="text-center">โต๊ะ / ประเภท</TableHead>
                        <TableHead>ยอดรวม</TableHead>
                        <TableHead>ชำระเงิน</TableHead>
                        <TableHead>พนักงาน</TableHead>
                        <TableHead>วัน/เวลา</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow
                          key={order.bill_id}
                          className={`group border-zinc-100 dark:border-zinc-900 transition-colors
                            ${order.status === 'VOID' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'}`}
                        >
                          <TableCell className="font-mono text-sm">
                            <span className="text-zinc-400">#</span>{order.bill_id}
                          </TableCell>

                          <TableCell className="text-center">
                            {order.table_id && Number(order.table_id) > 0 ? (
                              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-bold border dark:border-zinc-700">
                                {order.table_id}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 rounded text-[10px] font-bold border border-orange-100 dark:border-orange-800 flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3" /> กลับบ้าน
                                </span>
                                {order.customer_name && (
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[100px] truncate" title={order.customer_name}>
                                    {order.customer_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="font-bold">
                            <div className={order.status === 'VOID' ? 'line-through opacity-30' : ''}>
                              {Number(order.total_price).toLocaleString()} ฿
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.status === 'VOID' ? <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">VOID</Badge> : getPaymentBadge(order.payment_type)}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                            {order.cashierName}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400">
                            {order.dateOnly} <span className="ml-1 opacity-50">{order.timeOnly}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => { setSelectedBillId(order.bill_id); fetchBillItems(order.bill_id); setOpen(true); }}
                              className="h-8 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> ดูบิล
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-2">
                  <span className="text-xs text-zinc-500">หน้า {page} จาก {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Dialog ดูรายละเอียดบิล */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden rounded-3xl">
            <DialogHeader className="p-6 pb-2 border-b dark:border-zinc-900">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl"><Receipt className="w-5 h-5 text-emerald-500" /></div>
                  <div>
                    <DialogTitle className="text-lg">รายละเอียดบิล #{selectedBillId}</DialogTitle>
                    <DialogDescription className="text-xs flex flex-col gap-1 mt-1">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> ผู้เช็คบิล: {selectedBillData?.cashierName}</span>
                      {selectedBillData?.customer_name && (
                        <span className="flex items-center gap-1 text-orange-500"><ShoppingBag className="w-3 h-3" /> ลูกค้า: {selectedBillData.customer_name}</span>
                      )}
                    </DialogDescription>
                  </div>
                </div>
                {selectedBillData?.status === 'VOID' && <Badge variant="destructive">ยกเลิกแล้ว</Badge>}
              </div>
            </DialogHeader>

            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-zinc-100 dark:border-zinc-900 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                    <TableRow className="border-zinc-100 dark:border-zinc-900">
                      <TableHead className="text-xs h-9 w-[50px] text-center">โต๊ะ</TableHead>
                      <TableHead className="text-xs h-9">รายการเมนู</TableHead>
                      <TableHead className="text-center text-xs h-9">จำนวน</TableHead>
                      <TableHead className="text-right text-xs h-9">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billItems.map((item, idx) => (
                      <TableRow key={idx} className="border-zinc-50 dark:border-zinc-900/30 hover:bg-transparent">
                        <TableCell className="py-2.5 text-center text-xs text-zinc-400">
                          {item.table_no || item.table_id || (Number(selectedBillData?.table_id) > 0 ? selectedBillData?.table_id : '-')}
                        </TableCell>
                        <TableCell className="py-2.5 text-sm">{item.name_th || item.menu_name}</TableCell>
                        <TableCell className="py-2.5 text-center text-sm font-mono">x{item.qty || item.quantity}</TableCell>
                        <TableCell className="py-2.5 text-right text-sm font-bold">
                          {((Number(item.qty) || Number(item.quantity) || 0) * Number(item.price)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>ช่องทาง: {selectedBillData?.payment_type}</span>
                  <span>
                    {Number(selectedBillData?.table_id) > 0
                      ? `โต๊ะ: ${selectedBillData?.table_id}`
                      : <span className="flex items-center gap-1 text-orange-500 font-bold"><ShoppingBag className="w-3 h-3" /> กลับบ้าน</span>
                    }
                  </span>
                </div>

                {selectedBillData?.remark && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-2.5 rounded-xl text-xs text-yellow-700 dark:text-yellow-500 flex gap-2 items-start">
                    <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">หมายเหตุ:</span> {selectedBillData.remark}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">ยอดสุทธิรวม</span>
                  <span className={`text-xl font-black ${selectedBillData?.status === 'VOID' ? 'text-zinc-500 line-through' : 'text-emerald-500'}`}>
                    {selectedBillData?.status === 'VOID' ? '0' : Number(selectedBillData?.total_price).toLocaleString()} ฿
                  </span>
                </div>
              </div>

              {selectedBillData?.status === 'VOID' && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] font-bold text-red-500 uppercase">เหตุผลการ Void:</p>
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">{selectedBillData.void_reason}</p>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 pt-0 flex-row gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl dark:border-zinc-800">ปิดหน้าต่าง</Button>
              {selectedBillData?.status !== 'VOID' && (
                <Button onClick={handleOpenEdit} className="flex-1 bg-zinc-900 dark:bg-white dark:text-black rounded-xl">
                  <Pencil className="w-3 h-3 mr-2" /> แก้ไข / ออกบิลใหม่
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog แก้ไขบิล */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden rounded-3xl shadow-2xl">
            <DialogHeader className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b dark:border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                  <Pencil className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">แก้ไขรายการบิล #{selectedBillId}</DialogTitle>
                  <DialogDescription className="text-zinc-500">
                    ปรับปรุงจำนวนรายการอาหารเพื่อออกบิลใหม่ (บิลเดิมจะถูกยกเลิก)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">รายการอาหารในบิล</Label>
                <div className="max-h-[35vh] overflow-y-auto rounded-2xl border dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/50">
                  <Table>
                    <TableHeader className="bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-10">
                      <TableRow className="dark:border-zinc-800">
                        <TableHead className="text-xs font-bold">เมนู</TableHead>
                        <TableHead className="text-center text-xs font-bold w-[140px]">จำนวน</TableHead>
                        <TableHead className="text-right text-xs font-bold">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right text-xs font-bold w-[120px]">รวม</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingItems.map((item, idx) => (
                        <TableRow key={idx} className="dark:border-zinc-900 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30">
                          <TableCell className="py-3">
                            <div className="font-medium text-sm">{item.name_th || item.menu_name}</div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center justify-center gap-1 bg-white dark:bg-black border dark:border-zinc-800 p-1 rounded-xl w-max mx-auto">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => {
                                  setEditingItems(prev => prev.map((currItem, i) => {
                                    if (i !== idx) return currItem;
                                    const currentQty = currItem.qty;
                                    return { ...currItem, qty: Math.max(1, currentQty - 1) };
                                  }));
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-bold w-8 text-center">{item.qty}</span>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => {
                                  setEditingItems(prev => prev.map((currItem, i) => {
                                    if (i !== idx) return currItem;
                                    return { ...currItem, qty: currItem.qty + 1 };
                                  }));
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-xs text-zinc-500">{Number(item.price).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            {(item.qty * Number(item.price)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setEditingItems(prev => prev.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-500 h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <Label className="text-xs font-bold uppercase tracking-widest text-red-500">สาเหตุการแก้ไข (จำเป็น)</Label>
                  </div>
                  <Textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 min-h-[100px] text-sm"
                    placeholder="ระบุสาเหตุ..."
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">ยอดรวมสุทธิใหม่</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-emerald-500">
                        {editingItems.reduce((s, i) => s + (i.qty * Number(i.price)), 0).toLocaleString()}
                      </span>
                      <span className="text-lg font-bold text-emerald-500">฿</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t dark:border-zinc-900 flex-row gap-3">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1 h-12 rounded-2xl dark:border-zinc-800 font-bold">
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isProcessing || !editReason.trim() || editingItems.length === 0}
                className="flex-[1.5] h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg"
              >
                {isProcessing ? "กำลังบันทึก..." : "ยืนยันและออกบิลใหม่"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}