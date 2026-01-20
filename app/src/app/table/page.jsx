"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  Utensils,
  Receipt,
  Users,
  PlusCircle,
  CheckCircle2,
  ArrowRightLeft,
  Link as LinkIcon,
  Unlink,
  ShoppingBag,
  Bike,
  Clock,
  Phone,
  Loader2 // Import Loader2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// --- API Functions ---
const fetchDashboardData = async () => {
  const res = await fetch("/api/tables", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

const updateTable = async (tableId, action, payload = {}) => {
  const res = await fetch(`/api/tables/${tableId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error("Failed to update table");
  return res.json();
};

export default function TableStatusDashboard() {
  const [tables, setTables] = useState([]);
  const [activeTakeaways, setActiveTakeaways] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // เริ่มต้นเป็น true
  const router = useRouter();

  // Modal States
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isTakeoutOpen, setIsTakeoutOpen] = useState(false);

  // Data States
  const [selectedTable, setSelectedTable] = useState(null);
  const [targetTableId, setTargetTableId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");

  const [takeoutName, setTakeoutName] = useState("");
  const [takeoutPhone, setTakeoutPhone] = useState("");

  const loadData = async () => {
    try {
      const data = await fetchDashboardData();
      if (data.tables) {
        setTables(data.tables);
        setActiveTakeaways(data.takeaways || []);
      } else if (Array.isArray(data)) {
        setTables(data);
        setActiveTakeaways([]);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false); // ปิด Loading เมื่อโหลดเสร็จ
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (tableId, action, status = null) => {
    try {
      await updateTable(tableId, action, { status });
      if (action === "startOrder") {
        router.push(`/orders?table_id=${tableId}`);
      } else {
        loadData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- Functions สำหรับ Takeout ---
  const handleOpenTakeoutModal = () => {
    setTakeoutName("");
    setTakeoutPhone("");
    setIsTakeoutOpen(true);
  };

  const handleConfirmTakeout = () => {
    if (!takeoutName.trim()) {
      alert("กรุณาระบุชื่อลูกค้า หรือ หมายเลขคิว");
      return;
    }
    setIsTakeoutOpen(false);

    const params = new URLSearchParams({
      type: 'takeout',
      customerName: takeoutName,
      customerPhone: takeoutPhone
    });
    router.push(`/orders?${params.toString()}`);
  };

  const handleExistingTakeout = (takeout) => {
    const params = new URLSearchParams({
      type: 'takeout',
      customerName: takeout.customer_name,
      customerPhone: takeout.customer_phone || ""
    });
    router.push(`/orders?${params.toString()}`);
  };

  const handleBillingTakeout = (takeout) => {
    const params = new URLSearchParams({
      type: 'takeout',
      customerName: takeout.customer_name
    });
    router.push(`/billing?${params.toString()}`);
  };

  // --- Functions จัดการโต๊ะ ---
  const handleUnmerge = async (table) => {
    if (!confirm(`ต้องการแยก "โต๊ะ ${table.number}" ออกจากกลุ่มใช่หรือไม่?`)) return;
    try {
      await updateTable(table.table_id, "unmergeTable");
      loadData();
    } catch (error) {
      console.error(error);
      loadData();
    }
  };

  const openMoveModal = (table) => {
    setSelectedTable(table);
    setTargetTableId("");
    setIsMoveOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedTable || !targetTableId) return;
    try {
      setIsMoveOpen(false);
      await updateTable(selectedTable.table_id, "moveTable", { targetTableId });
      setTimeout(() => loadData(), 500);
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
      loadData();
    }
  };

  const openMergeModal = (table) => {
    setSelectedTable(table);
    setMergeTargetId("");
    setIsMergeOpen(true);
  };

  const handleConfirmMerge = async () => {
    if (!selectedTable || !mergeTargetId) return;
    const targetTableObj = tables.find(t => String(t.table_id) === String(mergeTargetId));
    if (!targetTableObj) return;

    let sourceId, masterId;
    if ((selectedTable.group_id || selectedTable.status === "มีลูกค้า") && !targetTableObj.group_id && targetTableObj.status === "ว่าง") {
      sourceId = targetTableObj.table_id;
      masterId = selectedTable.table_id;
    } else {
      sourceId = selectedTable.table_id;
      masterId = mergeTargetId;
    }

    try {
      setIsMergeOpen(false);
      await updateTable(sourceId, "mergeTable", { targetTableId: masterId });
      setTimeout(() => loadData(), 500);
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
      loadData();
    }
  };

  const handleResetAllTables = async () => {
    if (!confirm("⚠️ คำเตือน: รีเซ็ตโต๊ะทั้งหมด?")) return;
    try {
      const activeTables = tables.filter(t => (t.status || "").trim() !== "ว่าง");
      await Promise.all(activeTables.map(t => updateTable(t.table_id, "changeStatus", { status: "ว่าง" })));
      loadData();
    } catch (err) { console.error(err); }
  };

  const getLinkedTables = (currentTable) => {
    if (!currentTable.group_id) return [];
    return tables
      .filter(t => t.group_id === currentTable.group_id && t.table_id !== currentTable.table_id)
      .sort((a, b) => Number(a.number) - Number(b.number));
  };

  const getStatusColor = (status) => {
    switch ((status || "").trim()) {
      case "ว่าง": return "bg-emerald-500 border-emerald-500";
      case "มีลูกค้า": return "bg-orange-500 border-orange-500";
      case "รอชำระ": return "bg-red-500 border-red-500";
      default: return "bg-zinc-500";
    }
  };

  const getBorderColor = (status) => {
    switch ((status || "").trim()) {
      case "ว่าง": return "border-t-emerald-500";
      case "มีลูกค้า": return "border-t-orange-500";
      case "รอชำระ": return "border-t-red-500";
      default: return "border-t-zinc-300 dark:border-t-zinc-800";
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b bg-white/95 backdrop-blur shadow-sm dark:bg-black/95 dark:border-zinc-900 dark:shadow-none">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">จัดการโต๊ะอาหาร</h1>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={handleResetAllTables} className="h-9 w-9 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-950/30 dark:text-red-500 dark:hover:bg-red-900/50 dark:border-red-900/50">
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>รีเซ็ตระบบ</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </header>

        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] dark:bg-black">
          {/* ✅ ส่วน Loading State (เปลี่ยนเป็นสีส้ม) */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              {/* เปลี่ยนสี Spinner เป็นสีส้ม */}
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              {/* เปลี่ยนสีข้อความ เป็นสีส้ม */}
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

              {/* ปุ่มสร้างออเดอร์กลับบ้านใหม่ */}
              <Card
                className="flex flex-col border-2 border-dashed border-purple-300 shadow-sm hover:shadow-lg hover:border-purple-500 transition-all cursor-pointer group bg-purple-50/30 dark:bg-purple-900/10 dark:border-purple-800 dark:hover:border-purple-500"
                onClick={handleOpenTakeoutModal}
              >
                <CardContent className="flex-1 py-8 flex flex-col items-center justify-center text-purple-500 dark:text-purple-400">
                  <div className="bg-purple-100 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform dark:bg-purple-900/30">
                    <PlusCircle className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-lg">สั่งกลับบ้าน</span>
                </CardContent>
              </Card>

              {/* รายการสั่งกลับบ้านที่ค้างอยู่ */}
              {activeTakeaways.map((takeout) => (
                <Card key={`takeout-${takeout.order_id}`} className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-t-4 border-t-purple-500 bg-white relative dark:bg-black dark:border-zinc-900 dark:shadow-none">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-50 dark:border-zinc-900">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50 flex-shrink-0">
                        <Bike className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <CardTitle className="text-base font-bold text-gray-800 truncate dark:text-zinc-50" title={takeout.customer_name}>
                          {takeout.customer_name}
                        </CardTitle>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(takeout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {takeout.customer_phone && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1 dark:text-zinc-400">
                              <Phone className="w-3 h-3" /> {takeout.customer_phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 border-none whitespace-nowrap dark:bg-purple-900/50 dark:text-purple-300">
                      {Number(takeout.total_price).toLocaleString()} ฿
                    </Badge>
                  </CardHeader>

                  <CardContent className="flex-1 py-4 flex flex-col items-center justify-center bg-purple-50/5 dark:bg-purple-900/5">
                    <div className="text-center">
                      <ShoppingBag className="w-8 h-8 text-purple-300 mx-auto mb-2 dark:text-purple-800" />
                      <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">กำลังดำเนินการ</span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 flex flex-col gap-2 p-4 bg-gray-50/30 dark:bg-zinc-900/20">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button variant="outline" className="dark:border-zinc-800 dark:text-blue-400 dark:hover:bg-zinc-900" onClick={() => handleExistingTakeout(takeout)}>
                        <PlusCircle className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> สั่งเพิ่ม
                      </Button>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600" onClick={() => handleBillingTakeout(takeout)}>
                        <Receipt className="mr-2 h-4 w-4" /> เช็คบิล
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}

              {/* โต๊ะปกติ */}
              {tables.map((table) => {
                const status = (table.status || "").trim();
                const isMerged = table.group_id ? true : false;
                const linkedTables = getLinkedTables(table);

                return (
                  <Card key={table.table_id} className={`flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-t-4 ${getBorderColor(status)} bg-white relative dark:bg-black dark:border-zinc-900 dark:shadow-none`}>
                    {isMerged && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 gap-1 shadow-none dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                          <LinkIcon className="w-3 h-3" /> Group
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 border-b border-gray-50 dark:border-zinc-900">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
                          <Users className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                        </div>
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-zinc-50">โต๊ะ {table.number}</CardTitle>
                      </div>
                      {!isMerged && <Badge className={`${getStatusColor(status)} text-white border-none`}>{status}</Badge>}
                    </CardHeader>

                    <CardContent className="flex-1 py-4">
                      {status === "ว่าง" && (
                        <div className="h-24 flex flex-col items-center justify-center text-emerald-400 border-2 border-dashed border-emerald-50 rounded-lg bg-emerald-50/20 dark:text-emerald-500 dark:border-emerald-950 dark:bg-emerald-950/10">
                          <Utensils className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-sm font-medium">พร้อมให้บริการ</span>
                        </div>
                      )}
                      {status !== "ว่าง" && (
                        <div className={`h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg ${status === "รอชำระ" ? "text-red-400 border-red-100 bg-red-50/20 dark:text-red-500 dark:border-red-950 dark:bg-red-950/10" : "text-orange-400 border-orange-100 bg-orange-50/20 dark:text-orange-500 dark:border-orange-950 dark:bg-orange-950/10"}`}>
                          {isMerged && linkedTables.length > 0 ? (
                            <div className="text-center px-1 w-full max-h-20 overflow-y-auto custom-scrollbar">
                              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1.5 sticky top-0 bg-opacity-90 backdrop-blur-[1px] dark:text-blue-400 dark:bg-black">
                                <LinkIcon className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold">รวมกับ:</span>
                              </div>
                              <div className="flex flex-wrap justify-center gap-1.5 px-1">
                                {linkedTables.map(t => (
                                  <Badge key={t.table_id} variant="outline" className="bg-white text-gray-700 text-[10px] h-5 px-1.5 border-blue-300 shadow-sm dark:bg-zinc-900 dark:text-zinc-300 dark:border-blue-900">
                                    {t.number}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              <Users className="w-8 h-8 mb-2 opacity-50" />
                              <span className="text-sm font-medium">{status === "รอชำระ" ? "รอชำระเงิน" : "มีลูกค้า"}</span>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-0 flex flex-col gap-2 p-4 bg-gray-50/30 dark:bg-zinc-900/20">
                      {status === "ว่าง" && (
                        <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-black" onClick={() => handleAction(table.table_id, "startOrder")}>
                          <Utensils className="mr-2 h-4 w-4" /> เปิดโต๊ะ
                        </Button>
                      )}
                      {status === "มีลูกค้า" && (
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => router.push(`/orders?table_id=${table.table_id}`)} className="dark:border-zinc-800 dark:text-blue-400 dark:hover:bg-zinc-900">
                              <PlusCircle className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> สั่งเพิ่ม
                            </Button>
                            <Button onClick={() => router.push(`/billing?table_id=${table.table_id}`)} className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-600">
                              <Receipt className="mr-2 h-4 w-4" /> เช็คบิล
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button variant="secondary" size="sm" onClick={() => openMoveModal(table)} className="text-xs h-8 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50">
                              <ArrowRightLeft className="mr-1 h-3 w-3" /> ย้ายโต๊ะ
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => openMergeModal(table)} className="text-xs h-8 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-300 dark:border-blue-900/50">
                              <LinkIcon className="mr-1 h-3 w-3" /> รวมโต๊ะ
                            </Button>
                          </div>
                          {isMerged && (
                            <Button variant="destructive" size="sm" onClick={() => handleUnmerge(table)} className="w-full h-8 text-xs bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 shadow-none mt-1 dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-300 dark:border-red-900/50">
                              <Unlink className="mr-1 h-3 w-3" /> แยกโต๊ะ
                            </Button>
                          )}
                        </div>
                      )}
                      {status === "รอชำระ" && (
                        <Button variant="destructive" onClick={() => handleAction(table.table_id, "changeStatus", "ว่าง")} className="w-full">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> เคลียร์โต๊ะ
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* --- Modals ต่างๆ (Takeout, Move, Merge) คงเดิม --- */}
        <Dialog open={isTakeoutOpen} onOpenChange={setIsTakeoutOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader>
              <DialogTitle className="dark:text-zinc-50">สั่งกลับบ้าน</DialogTitle>
              <DialogDescription className="dark:text-zinc-400">กรุณาระบุข้อมูลลูกค้าเพื่อเปิดออเดอร์</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-zinc-300">ชื่อลูกค้า<span className="text-red-500">*</span></Label>
                <Input type="text" value={takeoutName} onChange={(e) => setTakeoutName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-zinc-300">เบอร์โทรศัพท์</Label>
                <Input type="tel" value={takeoutPhone} onChange={(e) => setTakeoutPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConfirmTakeout()} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTakeoutOpen(false)} className="dark:border-zinc-800 dark:hover:bg-zinc-900">ยกเลิก</Button>
              <Button onClick={handleConfirmTakeout} disabled={!takeoutName.trim()} className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white">ยืนยันเปิดบิล</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader>
              <DialogTitle className="dark:text-zinc-50">ย้ายโต๊ะ</DialogTitle>
              <DialogDescription className="dark:text-zinc-400">จาก <b className="dark:text-zinc-50">โต๊ะ {selectedTable?.number}</b> ไปยังโต๊ะใหม่</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="dark:text-zinc-300">เลือกโต๊ะปลายทาง (ว่าง)</Label>
              <select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 outline-none" value={targetTableId} onChange={(e) => setTargetTableId(e.target.value)}>
                <option value="" className="dark:text-zinc-500">-- เลือกโต๊ะ --</option>
                {tables.filter(t => (t.status || "").trim() === "ว่าง").map(t => (
                  <option key={t.table_id} value={t.table_id} className="text-emerald-600 dark:text-emerald-500">โต๊ะ {t.number}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMoveOpen(false)} className="dark:border-zinc-800 dark:hover:bg-zinc-900">ยกเลิก</Button>
              <Button onClick={handleConfirmMove} disabled={!targetTableId}>ยืนยัน</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader>
              <DialogTitle className="dark:text-zinc-50">รวมโต๊ะ</DialogTitle>
              <DialogDescription className="dark:text-zinc-400">
                {selectedTable?.group_id || selectedTable?.status === "มีลูกค้า"
                  ? <span>ดึงโต๊ะอื่นเข้ามารวมกับ <b className="dark:text-zinc-50">โต๊ะ {selectedTable?.number}</b></span>
                  : <span>รวม <b className="dark:text-zinc-50">โต๊ะ {selectedTable?.number}</b> เข้ากับโต๊ะอื่น</span>
                }
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="dark:text-zinc-300">เลือกโต๊ะเป้าหมาย</Label>
              <select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 outline-none" value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
                <option value="" className="dark:text-zinc-500">-- เลือกโต๊ะ --</option>
                {tables.filter(t => t.table_id !== selectedTable?.table_id).map(t => (
                  <option key={t.table_id} value={t.table_id} className={(t.status || "").trim() === "ว่าง" ? "text-emerald-600 dark:text-emerald-500" : "text-orange-600 dark:text-orange-500"}>
                    โต๊ะ {t.number} ({t.status}) {t.group_id ? `[Group]` : ''}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirmMerge} disabled={!mergeTargetId}>ยืนยัน</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}