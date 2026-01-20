// app/orders-status-page-split/page.jsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ✅ Import Loader2 เพิ่ม
import { Edit2, Trash2, ChefHat, UtensilsCrossed, ArrowLeft, Clock, CheckCircle2, BellRing, Package, ShoppingBag, User, XCircle, Loader2 } from "lucide-react";

export default function OrdersStatusPageSplit() {
  const [currentView, setCurrentView] = useState("home");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kitchenCategory, setKitchenCategory] = useState("ทั้งหมด");
  const [serverCategory, setServerCategory] = useState("ทั้งหมด");
  const [menus, setMenus] = useState([]);
  const [editData, setEditData] = useState({ orderItemId: null, qty: 1, note: "" });
  const nextOrdersRef = useRef([]);
  const isEditingRef = useRef(false);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);

  const sameOrders = (a, b) => {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  const normalize = (data) => {
    const normalized = Array.isArray(data?.orders)
      ? data.orders.map((o) => ({
        id: o?.id ?? o?.order_id ?? "-",
        table: o?.table ?? o?.table_number ?? "-",
        orderType: o?.orderType ?? "DINE_IN",
        customerName: o?.customerName ?? "",
        items: Array.isArray(o?.items)
          ? o.items.map((i) => ({
            orderItemId:
              i?.orderItemId ??
              i?.order_item_id ??
              `${o?.id}-${i?.menu_id ?? i?.id ?? Math.random()}`,
            menu_id: i?.menu_id ?? i?.id ?? null,
            name: i?.name ?? "ไม่ระบุ",
            category: (i?.category ?? "-").toString().trim(),
            type: i?.type ?? "cooked",
            qty: Number(i?.qty ?? 1),
            price: Number(i?.price ?? 0),
            note: i?.note ?? "",
            status: (i?.status ?? "").trim(),
          }))
          : [],
      }))
      : [];
    return normalized;
  };

  const fetchOnce = async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/orders-status", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch /api/orders-status");
      const data = await res.json();
      const nextSnapshot = normalize(data);

      nextOrdersRef.current = nextSnapshot;

      if (loading) {
        setOrders(nextSnapshot);
        setLoading(false);
        return;
      }

      if (!isEditingRef.current && !sameOrders(orders, nextSnapshot)) {
        setOrders(nextSnapshot);
      }
    } catch (e) {
      if (e?.name !== "AbortError") console.error(e);
    }
  };

  const pollLoop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await fetchOnce();
      if (mountedRef.current) pollLoop();
    }, 5000);
  };

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await fetchOnce();
      pollLoop();
    })();

    const onVisible = async () => {
      if (document.visibilityState === "visible") await fetchOnce();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/menu", { cache: "no-store" });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid menu data");
      setMenus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const m of menus) {
      const cat = (m?.category ?? "").toString().trim();
      if (cat) set.add(cat);
    }
    const list = Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
    return ["ทั้งหมด", ...list];
  }, [menus]);

  useEffect(() => {
    if (!categories.includes(kitchenCategory)) setKitchenCategory("ทั้งหมด");
    if (!categories.includes(serverCategory)) setServerCategory("ทั้งหมด");
  }, [categories]);

  const handleEditSave = async () => {
    const { orderItemId, qty, note } = editData;
    if (!orderItemId) return;
    if (!qty || Number(qty) < 1) {
      alert("จำนวนต้องไม่น้อยกว่า 1");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/orders-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, qty: Number(qty), note }),
      });
      if (!res.ok) throw new Error("PATCH /api/orders-status failed");

      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          items: (o.items || []).map((it) =>
            it.orderItemId === orderItemId ? { ...it, qty: Number(qty), note } : it
          ),
        }))
      );
      setEditData({ orderItemId: null, qty: 1, note: "" });

      fetchOnce();
    } catch (e) {
      console.error(e);
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (orderItemId) => {
    if (!orderItemId) return;
    if (!confirm("ยืนยันการยกเลิกรายการนี้?")) return;
    try {
      const res = await fetch("/api/orders-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, action: "cancel" }),
      });
      if (!res.ok) throw new Error("Cancel failed");

      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          items: (o.items || []).map((it) =>
            it.orderItemId === orderItemId ? { ...it, status: "ยกเลิก" } : it
          ),
        }))
      );

      fetchOnce();
    } catch (e) {
      console.error(e);
      alert("ยกเลิกไม่สำเร็จ");
    }
  };

  const handleAction = async (orderItemId, action, optimisticStatus) => {
    if (!orderItemId) return;
    try {
      const res = await fetch("/api/orders-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, action }),
      });
      if (!res.ok) throw new Error("PATCH action failed");

      if (optimisticStatus) {
        setOrders((prev) =>
          prev.map((o) => ({
            ...o,
            items: (o.items || []).map((it) =>
              it.orderItemId === orderItemId ? { ...it, status: optimisticStatus } : it
            ),
          }))
        );
      }

      fetchOnce();
    } catch (e) {
      console.error(e);
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const getKitchenToggle = (item) => {
    const s = (item.status || "").trim();
    if (item.type === "ready" && s !== "ทำเสร็จ" && s !== "เสิร์ฟแล้ว" && s !== "ยกเลิก") {
      return { label: "เตรียมเสร็จ", action: "complete", optimistic: "ทำเสร็จ", icon: <Package className="w-4 h-4 mr-1" /> };
    }
    if (s === "กำลังทำ") {
      return { label: "ทำเสร็จ", action: "complete", optimistic: "ทำเสร็จ", icon: <CheckCircle2 className="w-4 h-4 mr-1" /> };
    }
    if (s === "ทำเสร็จ" || s === "เสิร์ฟแล้ว" || s === "ยกเลิก") return null;
    return { label: "เริ่มทำ", action: "start", optimistic: "กำลังทำ", icon: <ChefHat className="w-4 h-4 mr-1" /> };
  };

  const allPending = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        items: (o.items || []).filter((i) => i.status !== "เสิร์ฟแล้ว"),
      })),
    [orders]
  );

  const kitchenQueue = useMemo(() => {
    const filt = (o) => {
      const items = (o.items || [])
        .filter((i) => i.status !== "เสิร์ฟแล้ว")
        .filter((i) => kitchenCategory === "ทั้งหมด" || i.category === kitchenCategory);
      return { ...o, items };
    };
    return allPending.map(filt).filter((o) => o.items.length > 0);
  }, [allPending, kitchenCategory]);

  const readyToServe = useMemo(() => {
    const filt = (o) => {
      const items = (o.items || [])
        .filter((i) => i.status === "ทำเสร็จ" || (i.type === "ready" && i.status !== "เสิร์ฟแล้ว"))
        .filter((i) => serverCategory === "ทั้งหมด" || i.category === serverCategory);
      return { ...o, items };
    };
    return orders.map(filt).filter((o) => o.items.length > 0);
  }, [orders, serverCategory]);

  const servedItems = useMemo(
    () => orders.flatMap((o) => (o.items || []).filter((i) => i.status === "เสิร์ฟแล้ว")),
    [orders]
  );

  const statusChip = (item) => {
    const s = (item.status || "").trim();
    const base = "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset";

    if (s === "ยกเลิก") {
      return (
        <span className={`${base} bg-red-100 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30 line-through decoration-red-700/50`}>
          <XCircle className="w-3 h-3 mr-1" /> ยกเลิก
        </span>
      );
    }

    if (item.type === "ready" && s !== "เสิร์ฟแล้ว" && s !== "ทำเสร็จ") {
      return (
        <span className={`${base} bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30`}>
          <Package className="w-3 h-3 mr-1" /> หยิบได้เลย
        </span>
      );
    }

    switch (s) {
      case "กำลังทำ": return <span className={`${base} bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-500/30`}><Clock className="w-3 h-3 mr-1" /> กำลังทำ</span>;
      case "ทำเสร็จ": return <span className={`${base} bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30`}><CheckCircle2 className="w-3 h-3 mr-1" /> รอเสิร์ฟ</span>;
      case "เสิร์ฟแล้ว": return <span className={`${base} bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700`}>เสิร์ฟแล้ว</span>;
      default: return <span className={`${base} bg-slate-50 text-slate-600 ring-slate-500/10 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700`}>รอเริ่ม</span>;
    }
  };

  const OrderSourceBadge = ({ order }) => {
    const isTakeaway = order.orderType === 'TAKEAWAY';
    if (isTakeaway) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 mb-1">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]" title={order.customerName}>{order.customerName}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-bold text-lg text-gray-800 dark:bg-zinc-800 dark:text-white mb-1">
          {order.table}
        </div>
        <span className="text-xs text-gray-500 dark:text-zinc-500 font-medium">ทานที่ร้าน</span>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b 
                          bg-white/95 backdrop-blur shadow-sm 
                          dark:bg-black/95 dark:border-zinc-800 dark:shadow-none">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {currentView === "home" && "รายการออเดอร์"}
                {currentView === "kitchen" && "ระบบครัว (รายการทั้งหมด)"}
                {currentView === "server" && "ระบบเสิร์ฟ (เฉพาะรอเสิร์ฟ)"}
              </h1>
            </div>
          </div>
          {currentView !== "home" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("home")}
              className="text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับหน้าหลัก
            </Button>
          )}
        </header>

        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] dark:bg-black">
          {/* ✅ ส่วน Loading State สีส้ม */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดรายการ...</p>
            </div>
          ) : (
            <>
              {currentView === "home" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-10">
                  <Card
                    className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-sm group relative overflow-hidden h-72 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 dark:border dark:border-zinc-800"
                    onClick={() => setCurrentView("kitchen")}
                  >
                    <div className="absolute top-0 w-full h-2 bg-emerald-500" />
                    <div className="mx-auto bg-emerald-100 p-6 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform dark:bg-emerald-950">
                      <ChefHat className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2 dark:text-white">พนักงานครัว</h2>
                      <p className="text-gray-500 mb-4 dark:text-zinc-400">ดูรายการอาหารทั้งหมด</p>
                      <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${kitchenQueue.length > 0
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
                        }`}>
                        {kitchenQueue.length > 0 ? `มีรายการค้าง ${kitchenQueue.length} ออเดอร์` : 'ไม่มีรายการค้าง'}
                      </span>
                    </div>
                  </Card>

                  <Card
                    className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-sm group relative overflow-hidden h-72 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 dark:border dark:border-zinc-800"
                    onClick={() => setCurrentView("server")}
                  >
                    <div className="absolute top-0 w-full h-2 bg-blue-500" />
                    <div className="mx-auto bg-blue-100 p-6 rounded-full w-fit mb-6 group-hover:scale-110 transition-transform dark:bg-blue-950">
                      <UtensilsCrossed className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2 dark:text-white">พนักงานเสิร์ฟ</h2>
                      <p className="text-gray-500 mb-4 dark:text-zinc-400">ดูรายการที่พร้อมเสิร์ฟ</p>
                      <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${readyToServe.length > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-500'
                        }`}>
                        {readyToServe.length > 0 ? `พร้อมเสิร์ฟ ${readyToServe.length} ออเดอร์` : 'ไม่มีรายการรอเสิร์ฟ'}
                      </span>
                    </div>
                  </Card>
                </div>
              )}

              {currentView === "kitchen" && (
                <Card className="border-t-4 border-emerald-500 shadow-sm border-x-0 border-b-0 dark:bg-black dark:border-zinc-800">
                  <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-950">
                        <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-gray-800 dark:text-white">รายการอาหาร (ทั้งหมด)</CardTitle>
                      </div>
                    </div>
                    <Select value={kitchenCategory} onValueChange={setKitchenCategory}>
                      <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                        <SelectValue placeholder="หมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                        {categories.map((cat) => (
                          <SelectItem key={`k-${cat}`} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>

                  <CardContent className="p-0">
                    {kitchenQueue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-700">
                        <div className="bg-gray-100 p-4 rounded-full mb-3 dark:bg-zinc-900">
                          <ChefHat className="h-8 w-8 opacity-40" />
                        </div>
                        <p>ไม่มีรายการค้างสำหรับครัว</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50/50 dark:bg-zinc-900/30">
                            <TableRow className="dark:border-zinc-800">
                              <TableHead className="w-[120px] text-center font-bold text-gray-700 dark:text-zinc-300">ที่มา</TableHead>
                              <TableHead className="font-bold text-gray-700 dark:text-zinc-300">รายการ</TableHead>
                              <TableHead className="font-bold text-gray-700 dark:text-zinc-300">ประเภท</TableHead>
                              <TableHead className="w-[100px] text-center font-bold text-gray-700 dark:text-zinc-300">จำนวน</TableHead>
                              <TableHead className="font-bold text-gray-700 dark:text-zinc-300">หมายเหตุ</TableHead>
                              <TableHead className="font-bold text-gray-700 dark:text-zinc-300">สถานะ</TableHead>
                              <TableHead className="text-right font-bold text-gray-700 dark:text-zinc-300">จัดการ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {kitchenQueue.flatMap((order) =>
                              order.items.map((item) => {
                                const toggle = getKitchenToggle(item);
                                const isProcessing = item.status === "กำลังทำ";
                                const isCancelled = item.status === "ยกเลิก";
                                const isDone = item.status === "ทำเสร็จ";

                                return (
                                  <TableRow key={`k-${item.orderItemId}`}
                                    className={`hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 dark:border-zinc-800 transition-opacity duration-300
                                      ${isCancelled ? "opacity-40 bg-gray-50 dark:bg-zinc-900/50 select-none" : ""}
                                      ${isDone ? "bg-green-50/30 dark:bg-green-900/10" : ""}
                                    `}
                                  >
                                    <TableCell className="text-center align-top pt-4">
                                      <OrderSourceBadge order={order} />
                                    </TableCell>

                                    <TableCell className={`font-medium text-gray-900 text-base dark:text-zinc-100 ${isCancelled ? "line-through decoration-gray-400" : ""}`}>
                                      {item.name}
                                    </TableCell>
                                    <TableCell className={`text-gray-500 dark:text-zinc-400 ${isCancelled ? "line-through" : ""}`}>
                                      {item.category}
                                    </TableCell>
                                    <TableCell className={`text-center font-bold text-lg dark:text-white ${isCancelled ? "line-through" : ""}`}>
                                      {item.qty}
                                    </TableCell>
                                    <TableCell className={`text-red-500 font-medium dark:text-red-400 ${isCancelled ? "line-through" : ""}`}>
                                      {item.note || "-"}
                                    </TableCell>
                                    <TableCell>{statusChip(item)}</TableCell>
                                    <TableCell>
                                      <div className="flex justify-end gap-2 items-center">
                                        {!isCancelled && toggle && (
                                          <Button
                                            size="sm"
                                            variant={toggle.action === "start" ? "outline" : "default"}
                                            className={toggle.action === "complete"
                                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm h-8 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                              : "border-gray-300 text-gray-700 hover:bg-gray-50 h-8 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                                            }
                                            onClick={() => handleAction(item.orderItemId, toggle.action, toggle.optimistic)}
                                          >
                                            {toggle.icon} {toggle.label}
                                          </Button>
                                        )}
                                        {!isCancelled && !isDone && (
                                          <>
                                            <Dialog
                                              open={editData.orderItemId === item.orderItemId}
                                              onOpenChange={(open) => {
                                                isEditingRef.current = open;
                                                if (!open) setEditData({ orderItemId: null, qty: 1, note: "" });
                                              }}
                                            >
                                              <DialogTrigger asChild>
                                                <Button size="icon" variant="ghost" disabled={isProcessing}
                                                  className="h-8 w-8 text-gray-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 dark:hover:bg-zinc-900"
                                                  onClick={() => setEditData({ orderItemId: item.orderItemId, qty: item.qty, note: item.note ?? "" })}
                                                >
                                                  <Edit2 size={14} />
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="sm:max-w-md dark:bg-zinc-950 dark:border-zinc-800">
                                                <DialogHeader><DialogTitle className="dark:text-white">แก้ไขรายการ: {item.name}</DialogTitle></DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                  <div className="space-y-2">
                                                    <Label className="dark:text-zinc-300">จำนวน</Label>
                                                    <Input type="number" min={1} value={editData.qty}
                                                      onChange={(e) => setEditData(prev => ({ ...prev, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                                                      className="bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                                                    />
                                                  </div>
                                                  <div className="space-y-2">
                                                    <Label className="dark:text-zinc-300">รายละเอียดเพิ่มเติม</Label>
                                                    <Input value={editData.note}
                                                      onChange={(e) => setEditData(prev => ({ ...prev, note: e.target.value }))}
                                                      className="bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white"
                                                      placeholder="เช่น ไม่ใส่ผัก"
                                                    />
                                                  </div>
                                                </div>
                                                <DialogFooter>
                                                  <Button variant="outline" onClick={() => setEditData({ orderItemId: null, qty: 1, note: "" })} className="dark:border-zinc-800 dark:text-zinc-400">ยกเลิก</Button>
                                                  <Button disabled={saving} onClick={handleEditSave} className="bg-emerald-600 hover:bg-emerald-700">
                                                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                                                  </Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                            <Button size="icon" variant="ghost" disabled={isProcessing}
                                              className="h-8 w-8 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-zinc-900"
                                              onClick={() => handleDelete(item.orderItemId)}
                                            >
                                              <Trash2 size={14} />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentView === "server" && (
                <div className="space-y-8">
                  <Card className="border-t-4 border-blue-500 shadow-sm border-x-0 border-b-0 dark:bg-black dark:border-zinc-800">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-950">
                          <UtensilsCrossed className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-gray-800 dark:text-white">รายการรอเสิร์ฟ</CardTitle>
                        </div>
                      </div>
                      <Select value={serverCategory} onValueChange={setServerCategory}>
                        <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                          <SelectValue placeholder="หมวดหมู่" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-zinc-950 dark:border-zinc-800">
                          {categories.map((cat) => (
                            <SelectItem key={`s-${cat}`} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardHeader>
                    <CardContent className="p-0">
                      {readyToServe.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-700">
                          <div className="bg-gray-100 p-4 rounded-full mb-3 dark:bg-zinc-900">
                            <UtensilsCrossed className="h-8 w-8 opacity-40" />
                          </div>
                          <p>ยังไม่มีรายการที่พร้อมเสิร์ฟ</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-zinc-900/30">
                              <TableRow className="dark:border-zinc-800">
                                <TableHead className="w-[120px] text-center font-bold text-gray-700 dark:text-zinc-300">ที่มา</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-zinc-300">รายการ</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-zinc-300">ประเภท</TableHead>
                                <TableHead className="w-[100px] text-center font-bold text-gray-700 dark:text-zinc-300">จำนวน</TableHead>
                                <TableHead className="font-bold text-gray-700 dark:text-zinc-300">หมายเหตุ</TableHead>
                                <TableHead className="text-right font-bold text-gray-700 dark:text-zinc-300">สถานะ</TableHead>
                                <TableHead className="text-right font-bold text-gray-700 dark:text-zinc-300">จัดการ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {readyToServe.flatMap((order) =>
                                order.items.map((item) => (
                                  <TableRow key={`s-${item.orderItemId}`} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 dark:border-zinc-800">
                                    <TableCell className="text-center align-top pt-4">
                                      <OrderSourceBadge order={order} />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 text-base dark:text-zinc-100">{item.name}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-zinc-400">{item.category}</TableCell>
                                    <TableCell className="text-center font-bold text-lg dark:text-white">{item.qty}</TableCell>
                                    <TableCell className="text-red-500 dark:text-red-400">{item.note || "-"}</TableCell>
                                    <TableCell className="text-right">{statusChip(item)}</TableCell>
                                    <TableCell>
                                      <div className="flex justify-end gap-2 items-center">
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 dark:bg-blue-700 dark:hover:bg-blue-600"
                                          onClick={() => handleAction(item.orderItemId, "serve", "เสิร์ฟแล้ว")}
                                        >
                                          <BellRing className="w-4 h-4 mr-1" /> เสิร์ฟแล้ว
                                        </Button>

                                        <Button size="icon" variant="ghost"
                                          className="h-8 w-8 text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 dark:hover:bg-zinc-900"
                                          onClick={() => handleDelete(item.orderItemId)}
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-none bg-transparent">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-px bg-gray-200 flex-1 dark:bg-zinc-800"></div>
                      <span className="text-sm font-medium text-gray-400 dark:text-zinc-600">ประวัติรายการที่เสิร์ฟแล้ว</span>
                      <div className="h-px bg-gray-200 flex-1 dark:bg-zinc-800"></div>
                    </div>
                    <CardContent className="p-0">
                      {servedItems.length > 0 && (
                        <div className="rounded-lg border border-gray-100 overflow-hidden bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                          <Table>
                            <TableHeader className="bg-gray-50 dark:bg-zinc-900/50">
                              <TableRow className="dark:border-zinc-800">
                                <TableHead className="dark:text-zinc-400 text-center w-[120px]">ที่มา</TableHead>
                                <TableHead className="dark:text-zinc-400">รายการ</TableHead>
                                <TableHead className="dark:text-zinc-400">ประเภท</TableHead>
                                <TableHead className="dark:text-zinc-400 text-center">จำนวน</TableHead>
                                <TableHead className="dark:text-zinc-400">หมายเหตุ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {servedItems.map((item) => {
                                const order = orders.find((o) => (o.items || []).some((i) => i.orderItemId === item.orderItemId));
                                return (
                                  <TableRow key={`served-${item.orderItemId}`} className="opacity-60 bg-white hover:bg-gray-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/30 dark:border-zinc-800">
                                    <TableCell className="dark:text-zinc-500 text-center align-middle">
                                      {order?.orderType === 'TAKEAWAY' ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">สั่งกลับบ้าน</span>
                                          <span className="text-[10px] truncate max-w-[80px]">{order.customerName}</span>
                                        </div>
                                      ) : (
                                        <span className="font-bold text-gray-700 dark:text-zinc-400">โต๊ะ {order?.table ?? "-"}</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="dark:text-zinc-500">{item.name}</TableCell>
                                    <TableCell className="dark:text-zinc-500">{item.category}</TableCell>
                                    <TableCell className="dark:text-zinc-500 text-center">{item.qty}</TableCell>
                                    <TableCell className="dark:text-zinc-500">{item.note}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}