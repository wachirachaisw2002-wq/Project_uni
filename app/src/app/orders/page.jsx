"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed, AlertCircle, Loader2, Trash2, Ban } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function OrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableParam = useMemo(() => searchParams.get("table") ?? searchParams.get("table_id"), [searchParams]);
  const selectedTable = tableParam || "";
  const token = searchParams.get("token") || "";
  const orderType = searchParams.get("type");

  // สร้าง State สำหรับเก็บข้อมูลลูกค้าที่ดึงมาจาก Database
  const [customerInfo, setCustomerInfo] = useState({
    name: searchParams.get("customerName") || "",
    phone: searchParams.get("customerPhone") || ""
  });

  const [menus, setMenus] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [modal, setModal] = useState({ open: false, menu: null, note: "", qty: 1 });

  const categories = useMemo(() => {
    const cats = [...new Set(menus.map(m => (m?.category ?? "").toString().trim()).filter(Boolean))];
    const priority = ["ส้มตำ", "ตำ", "ยำ", "ลาบ", "น้ำตก", "ต้ม", "แกง", "ทอด", "ย่าง", "เผา", "นึ่ง", "ผัด", "อาหารจานเดียว", "กับข้าว"];

    const sortedCats = cats.sort((a, b) => {
      const idxA = priority.findIndex(p => a.includes(p));
      const idxB = priority.findIndex(p => b.includes(p));
      if (idxA !== -1 && idxB !== -1) return idxA === idxB ? a.localeCompare(b, "th") : idxA - idxB;
      return idxA !== -1 ? -1 : idxB !== -1 ? 1 : a.localeCompare(b, "th");
    });
    return ["ทั้งหมด", ...sortedCats];
  }, [menus]);

  useEffect(() => {
    if (!tableParam && orderType !== 'takeout') router.replace("/table-status-dashboard");
  }, [tableParam, orderType, router]);

  useEffect(() => {
    async function validateAndFetchData() {
      try {
        setIsLoading(true);
        setAuthError(null);

        // 1. ตรวจสอบกรณี สั่งทานที่ร้าน (Dine-in)
        if (selectedTable && orderType !== 'takeout') {
          const resTable = await fetch("/api/tables", { cache: "no-store" });
          if (!resTable.ok) throw new Error("Failed to fetch tables");
          const tableData = await resTable.json();
          const currentTable = (tableData.tables || (Array.isArray(tableData) ? tableData : [])).find(t => String(t.table_id) === String(selectedTable));

          if (!currentTable) return setAuthError("ไม่พบข้อมูลโต๊ะนี้ในระบบ");
          if (currentTable.status !== "มีลูกค้า") return setAuthError("ไม่สามารถสั่งอาหารได้ โต๊ะนี้อาจกำลังรอชำระเงิน หรือปิดโต๊ะไปแล้ว");
          if (currentTable.session_token && currentTable.session_token !== token) return setAuthError("QR Code นี้หมดอายุแล้ว หรือไม่ถูกต้อง กรุณาติดต่อพนักงาน");
        }
        // 2. ตรวจสอบกรณี สั่งกลับบ้าน (Takeout) โดยเช็คจาก session_token
        else if (orderType === 'takeout') {
          if (!token) return setAuthError("ไม่พบ Token สำหรับการสั่งกลับบ้าน (QR Code ไม่สมบูรณ์)");

          const resTakeaway = await fetch("/api/takeaway", { cache: "no-store" });
          if (!resTakeaway.ok) throw new Error("Failed to fetch takeaways");

          const takeawayData = await resTakeaway.json();
          const takeawaysArray = takeawayData.takeaways || (Array.isArray(takeawayData) ? takeawayData : []);
          const currentTakeaway = takeawaysArray.find(t => String(t.session_token) === String(token));

          if (!currentTakeaway) return setAuthError("ไม่พบข้อมูลการสั่งกลับบ้านในระบบ หรือ QR Code ไม่ถูกต้อง");
          if (currentTakeaway.status !== "ACTIVE") return setAuthError("รายการสั่งกลับบ้านนี้หมดอายุ หรือถูกปิดการขายไปแล้ว");

          // ดึงข้อมูลลูกค้าจาก Database มาใช้เพื่อความชัวร์ (อ้างอิงจากตารางในภาพ)
          setCustomerInfo({
            name: currentTakeaway.customer_name,
            phone: currentTakeaway.customer_phone
          });
        }

        // ดึงข้อมูลเมนู
        const resMenu = await fetch("/api/menu", { cache: "no-store" });
        if (!resMenu.ok) throw new Error("Failed to fetch menu");
        const menuData = await resMenu.json();
        setMenus(Array.isArray(menuData) ? menuData : []);

      } catch (error) {
        console.error(error);
        setAuthError("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsLoading(false);
      }
    }
    if (selectedTable || orderType === 'takeout') validateAndFetchData();
  }, [selectedTable, orderType, token]);

  // ปรับ Cart Key ให้ผูกกับ Token เพื่อไม่ให้ตะกร้าของออเดอร์กลับบ้านชนกัน
  const getCartKey = () => selectedTable ? `cart_${selectedTable}` : (orderType === 'takeout' && token ? `cart_takeout_${token}` : null);

  useEffect(() => {
    const key = getCartKey();
    if (key) setCart(JSON.parse(localStorage.getItem(key) || "[]"));
  }, [selectedTable, orderType, token]);

  const updateCart = (newCart) => {
    setCart(newCart);
    const key = getCartKey();
    if (key) localStorage.setItem(key, JSON.stringify(newCart));
  };

  const addToCart = (item, noteText, qty = 1) => {
    if (!selectedTable && orderType !== 'takeout') return alert("ไม่พบเลขโต๊ะ");
    const menuId = item.menu_id ?? item.id;
    const existingIndex = cart.findIndex(p => (p.menu_id ?? p.id) === menuId && (p.note ?? "") === (noteText ?? ""));
    const updatedCart = [...cart];

    if (existingIndex > -1) updatedCart[existingIndex].qty += qty;
    else updatedCart.push({ ...item, qty, note: noteText, menu_id: menuId });

    updateCart(updatedCart);
  };

  const decreaseFromCart = (item) => {
    const menuId = item.menu_id ?? item.id;
    const existingIndex = cart.findLastIndex(p => (p.menu_id ?? p.id) === menuId);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].qty > 1) updatedCart[existingIndex].qty -= 1;
      else updatedCart.splice(existingIndex, 1);
      updateCart(updatedCart);
    }
  };

  const getMenuQtyInCart = (menuId) => cart.filter(item => (item.menu_id ?? item.id) === menuId).reduce((sum, item) => sum + item.qty, 0);

  const filteredMenus = useMemo(() => {
    const norm = (s) => (s ?? "").toString();
    const q = searchQuery.toLowerCase();
    return menus
      .filter(menu => norm(menu.name).toLowerCase().includes(q) && (selectedCategory === "ทั้งหมด" || norm(menu.category).trim() === selectedCategory))
      .sort((a, b) => {
        const idxA = categories.indexOf(norm(a.category).trim());
        const idxB = categories.indexOf(norm(b.category).trim());
        return idxA !== idxB ? idxA - idxB : norm(a.name).localeCompare(norm(b.name), "th");
      });
  }, [menus, searchQuery, selectedCategory, categories]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // ปรับการส่ง Parameter ไปหน้าตะกร้าให้รองรับ Token ด้วย
  const cartUrl = orderType === 'takeout'
    ? `/cart?type=takeout&token=${token}&customerName=${encodeURIComponent(customerInfo.name || '')}&customerPhone=${encodeURIComponent(customerInfo.phone || '')}`
    : `/cart?table=${selectedTable}&token=${token}`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b bg-white/95 backdrop-blur shadow-sm dark:bg-black/95 dark:border-zinc-900 dark:shadow-none">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">สั่งอาหาร</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {orderType === 'takeout' ? `สั่งกลับบ้าน: ${customerInfo.name || 'ลูกค้าทั่วไป'} ${customerInfo.phone ? `(${customerInfo.phone})` : ''}` : `โต๊ะ: ${selectedTable || "-"}`}
              </p>
            </div>
          </div>

          <Button className="relative bg-gray-900 hover:bg-gray-800 text-white shadow-md dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50" onClick={() => router.push(cartUrl)} disabled={!!authError}>
            <ShoppingCart className="mr-2 h-4 w-4" /> ตะกร้า
            {totalCartItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 rounded-full border-2 border-white dark:bg-red-700 dark:hover:bg-red-800 dark:border-black">
                {totalCartItems}
              </Badge>
            )}
          </Button>
        </header>

        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] flex flex-col gap-6 dark:bg-black">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : authError ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
              <div className="p-4 bg-red-50 rounded-full dark:bg-red-950/30"><AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400" /></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">ไม่สามารถดำเนินการได้</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">{authError}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:bg-black dark:border-zinc-800">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-zinc-600" />
                  <Input
                    placeholder="ค้นหาเมนูอาหาร..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-gray-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                  />
                </div>
                <div className="w-full md:w-56 flex-shrink-0">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200 focus:ring-gray-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50"><SelectValue placeholder="หมวดหมู่" /></SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMenus.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 dark:text-zinc-800">
                    <UtensilsCrossed className="h-12 w-12 mb-2 opacity-20" /><p>ไม่พบเมนูที่ค้นหา</p>
                  </div>
                ) : (
                  filteredMenus.map((menu) => {
                    const qtyInCart = getMenuQtyInCart(menu.menu_id ?? menu.id);
                    const isAvailable = menu.available !== false && menu.available !== 0;

                    return (
                      <Card key={menu.menu_id ?? menu.id} className={`flex flex-row overflow-hidden h-36 border border-gray-100 shadow-sm transition-all group bg-white relative dark:bg-black dark:border-zinc-900 dark:shadow-none ${!isAvailable ? 'opacity-80 grayscale-[0.8] bg-gray-50 dark:bg-zinc-900/50' : 'hover:shadow-md'}`}>
                        <div className="w-36 h-full flex-shrink-0 relative p-3">
                          <div className="w-full h-full relative overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-zinc-900">
                            {menu.image ? (
                              <img src={menu.image} alt={menu.name} className="w-full h-full object-cover transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-700"><UtensilsCrossed className="h-6 w-6 mb-1 opacity-50" /><span className="text-[10px]">ไม่มีรูป</span></div>
                            )}
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                <span className="text-white font-bold text-sm border-2 border-white px-2 py-1 rounded-md transform -rotate-12 tracking-widest whitespace-nowrap">สินค้าหมด</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between flex-1 p-4 pl-1">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className={`font-bold line-clamp-1 text-sm dark:text-zinc-50 ${!isAvailable ? 'text-gray-500 decoration-gray-400' : 'text-gray-800'}`} title={menu.name}>{menu.name}</h3>
                              {qtyInCart > 0 && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-1.5 h-5 dark:bg-orange-950/50 dark:text-orange-400">x{qtyInCart}</Badge>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 dark:text-zinc-500">{menu.category || "ทั่วไป"}</p>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <span className={`font-bold text-base dark:text-zinc-50 ${!isAvailable ? 'text-gray-400' : 'text-gray-900'}`}>
                              {Number(menu.price).toLocaleString()} <span className="text-[10px] font-normal text-gray-500 dark:text-zinc-500">บ.</span>
                            </span>

                            <div onClick={(e) => e.stopPropagation()}>
                              {qtyInCart > 0 ? (
                                <div className="flex items-center bg-gray-100 rounded-full p-1 h-8 shadow-inner dark:bg-zinc-900 dark:border dark:border-zinc-800">
                                  <Button size="icon" className="h-6 w-6 rounded-full bg-white text-gray-700 shadow-sm hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/50 dark:hover:text-red-400" onClick={() => decreaseFromCart(menu)}>
                                    {qtyInCart === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                  </Button>
                                  <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-zinc-50">{qtyInCart}</span>
                                  <Button size="icon" disabled={!isAvailable} className={`h-6 w-6 rounded-full shadow-sm text-white ${!isAvailable ? 'bg-gray-300 dark:bg-zinc-700 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600'}`} onClick={() => {
                                    if (isAvailable) {
                                      if (menu.type === "ready") addToCart(menu, "", 1);
                                      else setModal({ open: true, menu, note: "", qty: 1 });
                                    }
                                  }}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="icon" disabled={!isAvailable} className={`h-8 w-8 rounded-full transition-colors ${!isAvailable ? 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600' : 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-700 dark:hover:text-white'}`} onClick={() => {
                                  if (isAvailable) {
                                    if (menu.type === "ready") addToCart(menu, "", 1);
                                    else setModal({ open: true, menu, note: "", qty: 1 });
                                  }
                                }}>
                                  {!isAvailable ? <Ban className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </main>

        <Dialog open={modal.open} onOpenChange={(v) => !v && setModal(p => ({ ...p, open: false }))}>
          <DialogContent className="sm:max-w-md dark:bg-black dark:border-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50">{modal.menu?.name}</DialogTitle>
              <DialogDescription className="dark:text-zinc-500">ระบุรายละเอียดเพิ่มเติมและจำนวนที่ต้องการ</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="note" className="text-gray-700 dark:text-zinc-300">รายละเอียดเพิ่มเติม (ถ้ามี)</Label>
                <Input
                  id="note" value={modal.note} onChange={(e) => setModal(p => ({ ...p, note: e.target.value }))}
                  className="bg-gray-50 border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-base font-medium dark:text-zinc-300">จำนวน</Label>
                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
                  <Button variant="ghost" size="icon" disabled={modal.qty <= 1} className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md dark:hover:bg-zinc-800 dark:text-zinc-300" onClick={() => setModal(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-6 text-center dark:text-zinc-50">{modal.qty}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md dark:hover:bg-zinc-800 dark:text-zinc-300" onClick={() => setModal(p => ({ ...p, qty: p.qty + 1 }))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="sm:justify-between gap-2 border-t pt-4 dark:border-zinc-900">
              <div className="hidden sm:block text-sm text-gray-500 content-center dark:text-zinc-500">
                รวม: {modal.menu ? (modal.menu.price * modal.qty).toLocaleString() : 0} ฿
              </div>
              <Button
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold dark:bg-orange-700 dark:hover:bg-orange-600"
                onClick={() => {
                  addToCart(modal.menu, modal.note, modal.qty);
                  setModal(p => ({ ...p, open: false }));
                }}
              >
                เพิ่มลงตะกร้า
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}