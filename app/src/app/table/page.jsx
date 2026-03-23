"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw, Utensils, Receipt, Users, PlusCircle, CheckCircle2,
  ArrowRightLeft, Link as LinkIcon, Unlink, ShoppingBag, Bike,
  Clock, Phone, Loader2, XCircle, QrCode, Printer
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const STORE_BASE_URL = "http://192.168.1.XXX:3000";

const fetchTableData = async () => {
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

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [activeTakeaways, setActiveTakeaways] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isTakeoutOpen, setIsTakeoutOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [targetTableId, setTargetTableId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [takeoutName, setTakeoutName] = useState("");
  const [takeoutPhone, setTakeoutPhone] = useState("");

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchTableData();
      let currentTables = data.tables || (Array.isArray(data) ? data : []);
      setTables(currentTables);
      setActiveTakeaways(data.takeaways || []);
    } catch (error) {
      console.error("Error loading tables:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const revertTableId = searchParams.get('revert_table_id');
    if (revertTableId) {
      const doRevert = async () => {
        try {
          router.replace(pathname);
          const freshData = await fetchTableData();
          const freshTables = freshData.tables || (Array.isArray(freshData) ? freshData : []);
          const targetTable = freshTables.find(t => String(t.table_id) === revertTableId);

          if (targetTable && targetTable.group_id) {
            const groupTables = freshTables.filter(t => t.group_id === targetTable.group_id);
            await Promise.all(groupTables.map(t => updateTable(t.table_id, "changeStatus", { status: "มีลูกค้า" })));
          } else {
            await updateTable(revertTableId, "changeStatus", { status: "มีลูกค้า" });
          }
          loadData();
        } catch (e) { console.error(e); }
      };
      doRevert();
    }
  }, [searchParams, pathname, router, loadData]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAction = async (table, action, status = null) => {
    try {
      const isGrouped = table.group_id != null;
      let payload = { status };

      if (action === "changeStatus") {
        if (status === "มีลูกค้า") {
          payload.session_token = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        } else if (status === "ว่าง") {
          payload.session_token = null;
        }
      }

      if (action === "changeStatus" && status === "รอชำระ") {
        if (isGrouped) {
          const tablesInGroup = tables.filter(t => t.group_id === table.group_id);
          await Promise.all(tablesInGroup.map(t => updateTable(t.table_id, "changeStatus", { status: "รอชำระ" })));
        } else {
          await updateTable(table.table_id, "changeStatus", { status: "รอชำระ" });
        }
        router.push(`/billing?table_id=${table.table_id}`);
      } else {
        await updateTable(table.table_id, action, payload);
        if (action === "startOrder") {
          router.push(`/orders?table_id=${table.table_id}&token=${table.session_token || ''}`);
        } else {
          loadData();
        }
      }
    } catch (error) { console.error(error); }
  };

  const handleOpenTakeout = () => {
    setTakeoutName(""); setTakeoutPhone(""); setIsTakeoutOpen(true);
  };

  const handleConfirmTakeout = async () => {
    if (!takeoutName.trim()) return alert("กรุณาระบุชื่อลูกค้า");
    setIsTakeoutOpen(false);

    try {
      const res = await fetch("/api/takeaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: takeoutName, customerPhone: takeoutPhone })
      });

      if (res.ok) {
        setTimeout(() => { loadData(); }, 500);
        setTakeoutName("");
        setTakeoutPhone("");
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาดในการสร้างบิล");
      }
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const handleCancelTakeaway = async (orderId, customerName) => {
    if (!confirm(`ต้องการยกเลิกบิลสั่งกลับบ้านของ: ${customerName} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch("/api/takeaway", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });

      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "เกิดข้อผิดพลาดในการยกเลิกบิล");
      }
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  const handleUnmerge = async (table) => {
    if (!confirm(`ต้องการแยก "โต๊ะ ${table.number}" ออกจากกลุ่มใช่หรือไม่?`)) return;
    try {
      await updateTable(table.table_id, "unmergeTable");
      loadData();
    } catch (error) { console.error(error); }
  };

  const handleConfirmMove = async () => {
    if (!selectedTable || !targetTableId) return;
    try {
      setIsMoveOpen(false);
      await updateTable(selectedTable.table_id, "moveTable", { targetTableId });
      setTimeout(() => loadData(), 500);
    } catch (error) { alert("เกิดข้อผิดพลาด"); }
  };

  const handleConfirmMerge = async () => {
    if (!selectedTable || !mergeTargetId) return;
    const targetTableObj = tables.find(t => String(t.table_id) === String(mergeTargetId));
    if (!targetTableObj || selectedTable.status === "รอชำระ" || targetTableObj.status === "รอชำระ") {
      alert("ไม่สามารถรวมโต๊ะที่กำลังรอชำระเงินได้");
      return;
    }
    try {
      setIsMergeOpen(false);
      await updateTable(selectedTable.table_id, "mergeTable", { targetTableId: mergeTargetId });
      setTimeout(() => loadData(), 500);
    } catch (error) { alert("เกิดข้อผิดพลาดในการรวมโต๊ะ"); }
  };

  const handleResetAllTables = async () => {
    if (!confirm("ยืนยันการรีเซ็ต? โต๊ะและบิลสั่งกลับบ้านทั้งหมดจะถูกล้าง")) return;
    try {
      await updateTable(0, "resetAll");
      loadData();
    } catch (err) { 
      console.error(err); 
      alert("เกิดข้อผิดพลาดในการรีเซ็ตระบบ");
    }
  };

  const getLinkedTables = (currentTable) => {
    if (!currentTable.group_id) return [];
    return tables.filter(t => t.group_id === currentTable.group_id && t.table_id !== currentTable.table_id).sort((a, b) => Number(a.number) - Number(b.number));
  };

  const getCurrentBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return STORE_BASE_URL !== "http://192.168.1.XXX:3000" ? STORE_BASE_URL : window.location.origin;
    }
    return STORE_BASE_URL;
  };

  const handlePrintQR = () => {
    if (!qrTable) return;
    const baseUrl = getCurrentBaseUrl();
    let qrUrl = '';
    let titleStr = '';

    if (qrTable.isTakeout) {
      qrUrl = `${baseUrl}/orders?type=takeout&customerName=${encodeURIComponent(qrTable.customer_name)}`;
      titleStr = `สั่งกลับบ้าน: ${qrTable.customer_name}`;
    } else {
      qrUrl = `${baseUrl}/orders?table_id=${qrTable.table_id}&token=${qrTable.session_token || ''}`;
      titleStr = `โต๊ะ ${qrTable.number}`;
    }

    const qrImageApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR ${titleStr}</title>
            <style>
              body { text-align: center; font-family: sans-serif; margin-top: 30px; }
              h2 { font-size: 22px; margin-bottom: 5px; }
              h1 { font-size: 32px; margin-top: 0; margin-bottom: 20px; }
              p { font-size: 14px; color: #555; }
              img { width: 220px; height: 220px; margin: 10px 0; border: 2px solid #000; padding: 10px; border-radius: 10px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <h2>สแกนสั่งอาหาร</h2>
            <h1>${titleStr}</h1>
            <img src="${qrImageApi}" alt="QR" />
            <p>ร้านตำลืมผัว</p>
            <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; cursor: pointer;">พิมพ์ QR Code</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const getQrImageSrc = () => {
    const baseUrl = getCurrentBaseUrl();
    let qrUrl = '';
    if (qrTable?.isTakeout) {
      qrUrl = `${baseUrl}/orders?type=takeout&customerName=${encodeURIComponent(qrTable.customer_name)}`;
    } else {
      qrUrl = `${baseUrl}/orders?table_id=${qrTable?.table_id}&token=${qrTable?.session_token || ''}`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;
  };

  const getThaiTime = (dateString) => {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    return dateObj.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Asia/Bangkok' 
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b bg-white/95 backdrop-blur dark:bg-black/95 dark:border-zinc-900">
          <div className="flex items-center gap-4"><SidebarTrigger /><h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">จัดการโต๊ะอาหาร</h1></div>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="destructive" size="icon" onClick={handleResetAllTables} className="h-9 w-9 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-950/30 dark:text-red-500"><RefreshCcw className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>รีเซ็ตระบบ</TooltipContent></Tooltip></TooltipProvider>
        </header>

        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] dark:bg-black">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 className="h-10 w-10 animate-spin text-orange-600" /><p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูล...</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

              <Card className="flex flex-col border-2 border-dashed border-purple-300 hover:border-purple-500 cursor-pointer group bg-purple-50/30 dark:bg-purple-900/10" onClick={handleOpenTakeout}>
                <CardContent className="flex-1 py-8 flex flex-col items-center justify-center text-purple-500">
                  <div className="bg-purple-100 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform dark:bg-purple-900/30"><PlusCircle className="w-8 h-8" /></div>
                  <span className="font-bold text-lg">สั่งกลับบ้าน</span>
                </CardContent>
              </Card>

              {activeTakeaways.map((takeout) => (
                <Card key={`takeout-${takeout.order_id}`} className="flex flex-col border-t-4 border-t-purple-500 bg-white dark:bg-black dark:border-zinc-900 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between border-b dark:border-zinc-900">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <CardTitle className="text-lg font-bold dark:text-zinc-50 truncate max-w-[120px]">
                          {takeout.customer_name}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-purple-500 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30"
                              onClick={() => { setQrTable({ ...takeout, isTakeout: true }); setQrModalOpen(true); }}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>สแกนสั่งอาหาร</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge className="bg-purple-500 text-white border-none">
                        {Number(takeout.total_price).toLocaleString()} ฿
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 py-4 flex flex-col items-center justify-center">
                    <div className="w-full text-center">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-1 text-purple-300" />
                      <span className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mt-2">
                        <Clock className="w-3.5 h-3.5" /> เวลา {getThaiTime(takeout.created_at)}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 flex flex-col gap-2">
                    <div className="w-full space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/orders?type=takeout&customerName=${takeout.customer_name}`)}>
                          <PlusCircle className="mr-1 h-3 w-3 text-purple-500" /> สั่งอาหาร
                        </Button>
                        <Button size="sm" className="bg-purple-600 text-white hover:bg-purple-700" onClick={() => router.push(`/billing?type=takeout&customerName=${takeout.customer_name}`)}>
                          <Receipt className="mr-1 h-3 w-3" /> เช็คบิล
                        </Button>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/30" 
                        onClick={() => handleCancelTakeaway(takeout.order_id, takeout.customer_name)}
                      >
                        <XCircle className="mr-1 h-3 w-3" /> ยกเลิกบิล
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}

              {tables.map((table) => {
                const rawStatus = (table.status || "").trim();
                const isMerged = !!table.group_id;

                const isLocked = rawStatus === "รอชำระ" ||
                  (isMerged && tables.some(t => t.group_id === table.group_id && (t.status || "").trim() === "รอชำระ"));

                const displayStatus = isLocked ? "รอชำระ" : rawStatus;
                const displayStatusText = displayStatus === "รอชำระ" ? "รอชำระเงิน" : displayStatus;

                const linkedTables = getLinkedTables(table);
                const hasOrders = table.order_count > 0 || Number(table.total_price) > 0 || table.has_orders;

                return (
                  <Card key={table.table_id} className={`flex flex-col border-t-4 ${displayStatus === "ว่าง" ? "border-t-emerald-500" : displayStatus === "มีลูกค้า" ? "border-t-orange-500" : "border-t-red-500"} bg-white dark:bg-black dark:border-zinc-900 shadow-sm`}>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between border-b dark:border-zinc-900">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg"><Users className="w-5 h-5 text-gray-500" /></div>
                        <CardTitle className="text-lg font-bold dark:text-zinc-50">โต๊ะ {table.number}</CardTitle>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {displayStatus === "มีลูกค้า" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-blue-500 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  onClick={() => { setQrTable({ ...table, isTakeout: false }); setQrModalOpen(true); }}
                                >
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>สแกนสั่งอาหาร</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Badge className={`${displayStatus === "ว่าง" ? "bg-emerald-500" : displayStatus === "มีลูกค้า" ? "bg-orange-500" : "bg-red-500"} text-white border-none`}>
                          {displayStatusText}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 py-4 flex flex-col items-center justify-center">
                      {displayStatus === "ว่าง" ? (
                        <div className="text-emerald-400 opacity-50 flex flex-col items-center"><Utensils className="w-8 h-8 mb-1" /><span className="text-xs">พร้อมให้บริการ</span></div>
                      ) : (
                        <div className="w-full text-center">
                          {isMerged && linkedTables.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1"><span className="text-[10px] w-full text-blue-500 font-bold mb-1">รวมโต๊ะ:</span>{linkedTables.map(t => <Badge key={t.table_id} variant="outline" className="text-[9px] h-5">{t.number}</Badge>)}</div>
                          ) : (
                            <Users className={`w-8 h-8 mx-auto mb-1 ${isLocked ? "text-red-300" : "text-orange-300"}`} />
                          )}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-4 flex flex-col gap-2">
                      {displayStatus === "ว่าง" && (
                        <Button className="w-full bg-gray-900 text-white dark:bg-zinc-100 dark:text-black" onClick={() => handleAction(table, "changeStatus", "มีลูกค้า")}>
                          <Utensils className="mr-2 h-4 w-4" /> เปิดโต๊ะ
                        </Button>
                      )}

                      {(displayStatus === "มีลูกค้า" || displayStatus === "รอชำระ") && (
                        <div className="w-full space-y-2">
                          <div className={`grid ${hasOrders || isLocked ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                            <Button
                              variant="outline" size="sm" disabled={isLocked}
                              onClick={() => router.push(`/orders?table_id=${table.table_id}&token=${table.session_token || ''}`)}
                              className={isLocked ? "opacity-40" : ""}
                            >
                              <PlusCircle className="mr-1 h-3 w-3 text-blue-500" /> สั่งอาหาร
                            </Button>
                            {(hasOrders || isLocked) ? (
                              <Button
                                size="sm" disabled={isLocked}
                                className={`text-white ${isLocked ? "bg-orange-300 opacity-50 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"}`}
                                onClick={() => handleAction(table, "changeStatus", "รอชำระ")}
                              >
                                <Receipt className="mr-1 h-3 w-3" /> เช็คบิล
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/30"
                                onClick={() => {
                                  if (confirm(`ต้องการยกเลิกการเปิดโต๊ะ ${table.number} และเปลี่ยนเป็นโต๊ะว่าง ใช่หรือไม่?`)) {
                                    handleAction(table, "changeStatus", "ว่าง");
                                  }
                                }}
                              >
                                <XCircle className="mr-1 h-3 w-3" /> ปิดโต๊ะ
                              </Button>
                            )}
                          </div>

                          <div className={`grid ${isMerged ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                            <Button
                              variant="secondary" size="sm" disabled={isLocked}
                              className={`h-7 text-[10px] ${isLocked ? "opacity-40" : ""}`}
                              onClick={() => { setSelectedTable(table); setTargetTableId(""); setIsMoveOpen(true); }}
                            >
                              <ArrowRightLeft className="mr-1 h-3 w-3" /> ย้าย
                            </Button>
                            <Button
                              variant="secondary" size="sm" disabled={isLocked}
                              className={`h-7 text-[10px] ${isLocked ? "opacity-40" : ""}`}
                              onClick={() => { setSelectedTable(table); setMergeTargetId(""); setIsMergeOpen(true); }}
                            >
                              <LinkIcon className="mr-1 h-3 w-3" /> รวม
                            </Button>

                            {isMerged && (
                              <Button
                                variant="secondary" size="sm" disabled={isLocked}
                                className={`h-7 text-[10px] ${isLocked ? "opacity-40" : "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"}`}
                                onClick={() => handleUnmerge(table)}
                              >
                                <Unlink className="mr-1 h-3 w-3" /> แยก
                              </Button>
                            )}
                          </div>

                          {isLocked && (
                            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-100 dark:border-red-900/50 mt-1">
                              <p className="text-[10px] text-center text-red-600 dark:text-red-400 font-bold animate-pulse uppercase tracking-tight">
                                รอชำระเงิน (โต๊ะถูกล็อค)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        <Dialog open={isTakeoutOpen} onOpenChange={setIsTakeoutOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader><DialogTitle>สั่งกลับบ้าน</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1"><Label>ชื่อลูกค้า*</Label><Input value={takeoutName} onChange={(e) => setTakeoutName(e.target.value)} /></div>
              <div className="space-y-1"><Label>เบอร์โทรศัพท์</Label><Input type="tel" value={takeoutPhone} onChange={(e) => setTakeoutPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleConfirmTakeout()} /></div>
            </div>
            <DialogFooter><Button onClick={handleConfirmTakeout} disabled={!takeoutName.trim()} className="w-full bg-purple-600 text-white hover:bg-purple-700">เปิดบิลกลับบ้าน</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader><DialogTitle>ย้ายโต๊ะ {selectedTable?.number}</DialogTitle></DialogHeader>
            <div className="py-2"><Label>เลือกโต๊ะปลายทาง</Label><select className="w-full h-10 rounded-md border px-3 mt-2 dark:bg-zinc-900" value={targetTableId} onChange={(e) => setTargetTableId(e.target.value)}><option value="">-- เลือกโต๊ะ --</option>{tables.filter(t => (t.status || "").trim() === "ว่าง").map(t => <option key={t.table_id} value={t.table_id}>โต๊ะ {t.number}</option>)}</select></div>
            <DialogFooter><Button onClick={handleConfirmMove} disabled={!targetTableId} className="w-full">ยืนยันการย้าย</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
          <DialogContent className="dark:bg-black dark:border-zinc-900">
            <DialogHeader><DialogTitle>รวมโต๊ะ {selectedTable?.number}</DialogTitle></DialogHeader>
            <div className="py-2"><Label>เลือกโต๊ะที่จะนำมารวม</Label><select className="w-full h-10 rounded-md border px-3 mt-2 dark:bg-zinc-900" value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}><option value="">-- เลือกโต๊ะ --</option>{tables.filter(t => t.table_id !== selectedTable?.table_id && t.status !== "รอชำระ").map(t => <option key={t.table_id} value={t.table_id}>โต๊ะ {t.number} ({t.status})</option>)}</select></div>
            <DialogFooter><Button onClick={handleConfirmMerge} disabled={!mergeTargetId} className="w-full">ยืนยันการรวมโต๊ะ</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="sm:max-w-sm dark:bg-black dark:border-zinc-900 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl text-blue-600 dark:text-blue-400 font-bold">QR Code สั่งอาหาร</DialogTitle>
              <DialogDescription className="text-center text-zinc-500">
                {qrTable?.isTakeout ? `สั่งกลับบ้าน: ${qrTable?.customer_name}` : `สำหรับโต๊ะ ${qrTable?.number}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-slate-100 dark:border-zinc-800">
                <img src={getQrImageSrc()} alt={qrTable?.isTakeout ? `QR กลับบ้าน: ${qrTable?.customer_name}` : `QR โต๊ะ ${qrTable?.number}`} className="w-48 h-48 object-contain" />
              </div>
              <p className="text-xs font-medium text-zinc-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-center">
                ให้ลูกค้าสแกนเพื่อเข้าสู่เมนูสั่งอาหาร
              </p>
            </div>
            <DialogFooter className="sm:justify-center flex-row gap-2 pt-0">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setQrModalOpen(false)}>ปิด</Button>
              <Button className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePrintQR}><Printer className="w-4 h-4 mr-2" /> พิมพ์ QR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
    </SidebarProvider>
  );
}