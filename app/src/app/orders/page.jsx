// app/order/page.jsx
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
import { Search, ShoppingCart, Plus, Minus, UtensilsCrossed } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function OrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- 1. รับค่า Params ---
  const tableParam = useMemo(
    () => searchParams.get("table") ?? searchParams.get("table_id"),
    [searchParams]
  );
  const selectedTable = tableParam || "";

  // รับค่า type, customerName และ customerPhone
  const orderType = searchParams.get("type");
  const customerName = searchParams.get("customerName");
  const customerPhone = searchParams.get("customerPhone"); // ✅ จุดแก้ไข 1: รับเบอร์โทรศัพท์

  const [menus, setMenus] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

  const [showDialog, setShowDialog] = useState(false);
  const [note, setNote] = useState("");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const categories = useMemo(() => {
    const set = new Set();
    for (const m of menus) {
      const cat = (m?.category ?? "").toString().trim();
      if (cat) set.add(cat);
    }
    const priorityList = [
      "ส้มตำ", "ตำ", "ยำ", "ลาบ", "น้ำตก", "ต้ม", "แกง",
      "ทอด", "ย่าง", "เผา", "นึ่ง", "ผัด", "อาหารจานเดียว", "กับข้าว"
    ];
    const sortedCats = Array.from(set).sort((a, b) => {
      const idxA = priorityList.findIndex(p => a.includes(p));
      const idxB = priorityList.findIndex(p => b.includes(p));
      if (idxA !== -1 && idxB !== -1) {
        if (idxA === idxB) return a.localeCompare(b, "th");
        return idxA - idxB;
      }
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "th");
    });
    return ["ทั้งหมด", ...sortedCats];
  }, [menus]);

  // --- 2. Logic การ Redirect ---
  useEffect(() => {
    // ถ้าไม่มีเลขโต๊ะ "และ" ไม่ใช่ Takeout ถึงจะดีดกลับ
    if (!tableParam && orderType !== 'takeout') {
      router.replace("/table-status-dashboard");
    }
  }, [tableParam, orderType, router]);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data = await res.json();
        setMenus(Array.isArray(data) ? data : []);
      } catch (error) { console.error(error); }
    }
    fetchMenus();
  }, []);

  // --- 3. Key ของ LocalStorage ---
  const getCartKey = () => {
    if (selectedTable) return `cart_${selectedTable}`;
    if (orderType === 'takeout') return `cart_takeout`;
    return null;
  };

  useEffect(() => {
    const key = getCartKey();
    if (key) {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      setCart(saved);
    } else {
      setCart([]);
    }
  }, [selectedTable, orderType]);

  function addToCart(item, noteText, qty = 1) {
    if (!selectedTable && orderType !== 'takeout') { alert("ไม่พบเลขโต๊ะ"); return; }

    const menuId = item.menu_id ?? item.id;
    const existingIndex = cart.findIndex(
      (p) => (p.menu_id ?? p.id) === menuId && (p.note ?? "") === (noteText ?? "")
    );
    let updatedCart = [...cart];
    if (existingIndex > -1) {
      updatedCart[existingIndex].qty += qty;
    } else {
      updatedCart.push({ ...item, qty, note: noteText, menu_id: menuId });
    }
    setCart(updatedCart);

    const key = getCartKey();
    if (key) localStorage.setItem(key, JSON.stringify(updatedCart));
  }

  function decreaseFromCart(item) {
    const menuId = item.menu_id ?? item.id;
    const existingIndex = cart.findIndex((p) => (p.menu_id ?? p.id) === menuId);
    if (existingIndex > -1) {
      let updatedCart = [...cart];
      if (updatedCart[existingIndex].qty > 1) {
        updatedCart[existingIndex].qty -= 1;
      } else { updatedCart.splice(existingIndex, 1); }
      setCart(updatedCart);

      const key = getCartKey();
      if (key) localStorage.setItem(key, JSON.stringify(updatedCart));
    }
  }

  function getMenuQtyInCart(menuId) {
    return cart
      .filter((item) => (item.menu_id ?? item.id) === menuId)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  const filteredMenus = useMemo(() => {
    const norm = (s) => (s ?? "").toString();
    const q = searchQuery.toLowerCase();
    const filtered = menus.filter((menu) => {
      const name = norm(menu.name).toLowerCase();
      const matchSearch = name.includes(q);
      const matchCategory = selectedCategory === "ทั้งหมด" || norm(menu.category).trim() === selectedCategory;
      return matchSearch && matchCategory;
    });
    return filtered.sort((a, b) => {
      const catA = norm(a.category).trim();
      const catB = norm(b.category).trim();
      const idxA = categories.indexOf(catA);
      const idxB = categories.indexOf(catB);
      if (idxA !== idxB) return idxA - idxB;
      return norm(a.name).localeCompare(norm(b.name), "th");
    });
  }, [menus, searchQuery, selectedCategory, categories]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // ✅ จุดแก้ไข 2: ส่ง customerPhone ต่อไปที่ Cart URL
  const cartUrl = orderType === 'takeout'
    ? `/cart?type=takeout&customerName=${encodeURIComponent(customerName || '')}&customerPhone=${encodeURIComponent(customerPhone || '')}`
    : `/cart?table=${selectedTable}`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b 
            bg-white/95 backdrop-blur shadow-sm
            dark:bg-black/95 dark:border-zinc-900 dark:shadow-none"
        >
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">สั่งอาหาร</h1>
              {/* แสดงชื่อลูกค้าและเบอร์โทร */}
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {orderType === 'takeout'
                  ? `Takeout: ${customerName || 'ลูกค้าทั่วไป'} ${customerPhone ? `(${customerPhone})` : ''}`
                  : `โต๊ะ: ${selectedTable || "-"}`
                }
              </p>
            </div>
          </div>

          <Button
            className="relative bg-gray-900 hover:bg-gray-800 text-white shadow-md dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-50"
            onClick={() => router.push(cartUrl)}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            ตะกร้า
            {totalCartItems > 0 && (
              <Badge
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 rounded-full border-2 border-white dark:bg-red-700 dark:hover:bg-red-800 dark:border-black"
              >
                {totalCartItems}
              </Badge>
            )}
          </Button>
        </header>

        {/* Main Content */}
        <main className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] flex flex-col gap-6 dark:bg-black">

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row items-center gap-4 w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:bg-black dark:border-zinc-800">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-zinc-600" />
              <Input
                placeholder="ค้นหาเมนูอาหาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-gray-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-600"
              />
            </div>
            <div className="w-full md:w-56 flex-shrink-0">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger
                  className="w-full bg-gray-50 border-gray-200 focus:ring-gray-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                >
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMenus.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 dark:text-zinc-800">
                <UtensilsCrossed className="h-12 w-12 mb-2 opacity-20" />
                <p>ไม่พบเมนูที่ค้นหา</p>
              </div>
            ) : (
              filteredMenus.map((menu) => {
                const qtyInCart = getMenuQtyInCart(menu.menu_id ?? menu.id);
                const isReadyType = menu.type === "ready";

                return (
                  <Card
                    key={menu.menu_id ?? menu.id}
                    className="flex flex-row overflow-hidden h-36 border border-gray-100 shadow-sm hover:shadow-md transition-all group bg-white relative dark:bg-black dark:border-zinc-900 dark:shadow-none"
                  >
                    {/* Image Section */}
                    <div className="w-36 h-full flex-shrink-0 relative p-3">
                      <div className="w-full h-full relative overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-zinc-900">
                        {menu.image ? (
                          <img
                            src={menu.image}
                            alt={menu.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-700">
                            <UtensilsCrossed className="h-6 w-6 mb-1 opacity-50" />
                            <span className="text-[10px]">ไม่มีรูป</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-between flex-1 p-4 pl-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-800 line-clamp-1 text-sm dark:text-zinc-50" title={menu.name}>
                            {menu.name}
                          </h3>
                          {qtyInCart > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-1.5 h-5 dark:bg-orange-950/50 dark:text-orange-400">
                              x{qtyInCart}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 dark:text-zinc-500">{menu.category || "ทั่วไป"}</p>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-base text-gray-900 dark:text-zinc-50">
                          {Number(menu.price).toLocaleString()} <span className="text-[10px] font-normal text-gray-500 dark:text-zinc-500">บ.</span>
                        </span>

                        <div onClick={(e) => e.stopPropagation()}>
                          {isReadyType && qtyInCart > 0 ? (
                            <div className="flex items-center bg-gray-100 rounded-full p-1 h-8 shadow-inner dark:bg-zinc-900 dark:border dark:border-zinc-800">
                              <Button
                                size="icon"
                                className="h-6 w-6 rounded-full bg-white text-gray-700 shadow-sm hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                                onClick={() => decreaseFromCart(menu)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-zinc-50">{qtyInCart}</span>
                              <Button
                                size="icon"
                                className="h-6 w-6 rounded-full bg-orange-600 text-white shadow-sm hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
                                onClick={() => addToCart(menu, "", 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              className={`h-8 w-8 rounded-full transition-colors 
                                ${!isReadyType && qtyInCart > 0
                                  ? "bg-orange-600 text-white hover:bg-orange-700 ring-2 ring-orange-100 dark:bg-orange-700 dark:ring-orange-950"
                                  : "bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white dark:bg-orange-950/30 dark:text-orange-400 dark:hover:bg-orange-700 dark:hover:text-white"
                                }`}
                              onClick={() => {
                                if (isReadyType) { addToCart(menu, "", 1); }
                                else {
                                  setSelectedMenu(menu);
                                  setNote("");
                                  setQuantity(1);
                                  setShowDialog(true);
                                }
                              }}
                            >
                              <Plus className="h-5 w-5" />
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
        </main>

        {/* Dialog (Popup) */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md dark:bg-black dark:border-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50">
                {selectedMenu?.name}
              </DialogTitle>
              <DialogDescription className="dark:text-zinc-500">
                ระบุรายละเอียดเพิ่มเติมและจำนวนที่ต้องการ
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="note" className="text-gray-700 dark:text-zinc-300">รายละเอียดเพิ่มเติม (ถ้ามี)</Label>
                <Input
                  id="note"
                  placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-gray-50 border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-base font-medium dark:text-zinc-300">จำนวน</Label>
                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md dark:hover:bg-zinc-800 dark:text-zinc-300"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold w-6 text-center dark:text-zinc-50">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md dark:hover:bg-zinc-800 dark:text-zinc-300"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="sm:justify-between gap-2 border-t pt-4 dark:border-zinc-900">
              <div className="hidden sm:block text-sm text-gray-500 content-center dark:text-zinc-500">
                รวม: {selectedMenu ? (selectedMenu.price * quantity).toLocaleString() : 0} ฿
              </div>
              <Button
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold dark:bg-orange-700 dark:hover:bg-orange-600"
                onClick={() => {
                  addToCart(selectedMenu, note, quantity);
                  setShowDialog(false);
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