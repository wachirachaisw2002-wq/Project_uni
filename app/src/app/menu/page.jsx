"use client";

import { useState, useEffect, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Edit2, Trash2, Plus, Search, Utensils, ImageIcon, ChefHat, Package, X } from "lucide-react";

export default function MenuPage() {
  const API_BASE = "/api/menu";
  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);

  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [activeType, setActiveType] = useState("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [menuType, setMenuType] = useState("cooked");

  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const menuTypes = useMemo(() => [
    { key: "cooked", name: "ปรุงสด" },
    { key: "ready", name: "สำเร็จรูป" },
  ], []);

  function deriveCategories(list) {
    const uniq = Array.from(
      new Set(
        list
          .map((m) => (m?.category ?? "").toString().trim())
          .filter((c) => c.length > 0)
      )
    );
    return uniq.sort((a, b) => b.localeCompare(a, "th"));
  }

  async function fetchMenus() {
    try {
      const res = await fetch(API_BASE, { cache: "no-store" });
      if (!res.ok) throw new Error("โหลดข้อมูลเมนูล้มเหลว");
      const data = await res.json();
      const safe = Array.isArray(data) ? data : [];
      setMenus(safe);
      setCategories(deriveCategories(safe));
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchMenus();
  }, []);

  const catOrder = (cat) => {
    const idx = categories.indexOf(cat);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };

  const filteredMenus = useMemo(() => {
    let list = menus;
    if (activeCategory !== "ทั้งหมด") {
      list = list.filter(menu => (menu.category || "") === activeCategory);
    }
    if (activeType !== "ทั้งหมด") {
      list = list.filter(menu => (menu.type || "cooked") === activeType);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(menu => (menu.name || "").toLowerCase().includes(query));
    }
    return list.sort((a, b) => {
      const catCompare = catOrder(a?.category || "") - catOrder(b?.category || "");
      if (catCompare !== 0) return catCompare;
      return (a.name || "").localeCompare(b.name || "", "th");
    });
  }, [menus, activeCategory, activeType, searchQuery, categories]);

  function openAddDialog() {
    setEditingMenu(null);
    setName("");
    setPrice("");
    setCategory(categories[0] || "");
    setImage("");
    setMenuType("cooked");
    setOpen(true);
  }

  function openEditDialog(menu) {
    setEditingMenu(menu);
    setName(menu.name || "");
    setPrice(String(menu.price ?? ""));
    setCategory(menu.category || categories[0] || "");
    setImage(menu.image || "");
    setMenuType(menu.type || "cooked");
    setOpen(true);
  }

  async function deleteMenu(menu_id) {
    if (!menu_id) return;
    if (confirm("คุณต้องการลบเมนูนี้หรือไม่?")) {
      try {
        const res = await fetch(`${API_BASE}?menu_id=${menu_id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("ลบไม่สำเร็จ");
        await fetchMenus();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  async function saveMenu() {
    if (!name || !price || !category) return alert("กรุณากรอกข้อมูลให้ครบ");
    try {
      const body = { name, price: Number(price), category, image, type: menuType };
      let res;
      if (editingMenu) {
        res = await fetch(API_BASE, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, menu_id: editingMenu.menu_id }),
        });
      } else {
        res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error("เกิดข้อผิดพลาด");
      setOpen(false);
      await fetchMenus();
    } catch (error) {
      alert(error.message);
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
        const height = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function addCategory() {
    const c = (newCategory || "").trim();
    if (!c) return;
    if (categories.includes(c)) return alert("มีประเภทนี้อยู่แล้ว");
    setCategories((prev) => [...prev, c].sort((a, b) => a.localeCompare(b, "th")));
    setCategory(c);
    setNewCategory("");
    setOpenCategoryDialog(false);
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="dark:bg-black">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b 
          bg-white/90 backdrop-blur-md dark:bg-zinc-950/80 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">จัดการเมนูอาหาร</h1>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/20 transition-all hover:scale-105"
          >
            <Plus className="mr-2 h-4 w-4" /> เพิ่มเมนูใหม่
          </Button>
        </header>

        <main className="p-6 min-h-[calc(100vh-4rem)] space-y-6 bg-zinc-50/30 dark:bg-black">

          <Card className="border-none shadow-sm dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="ค้นหาชื่อเมนูอาหาร..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1 h-8 w-8 text-zinc-400 hover:text-zinc-200">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 border-zinc-100 dark:border-zinc-800/60">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">หมวดหมู่</Label>
                  <Select value={activeCategory} onValueChange={setActiveCategory}>
                    {/* ✅ เพิ่ม w-full */}
                    <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      <SelectItem value="ทั้งหมด">ทั้งหมด</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">ประเภทการปรุง</Label>
                  <Select value={activeType} onValueChange={setActiveType}>
                    {/* ✅ เพิ่ม w-full */}
                    <SelectTrigger className="w-full dark:bg-zinc-950 dark:border-zinc-800">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                      <SelectItem value="ทั้งหมด">ทั้งหมด</SelectItem>
                      {menuTypes.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          <div className="flex items-center gap-2">
                            {type.key === 'cooked' ? <ChefHat className="h-4 w-4 text-orange-500" /> : <Package className="h-4 w-4 text-blue-500" />}
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/*Table Card */}
          <Card className="border-none shadow-sm overflow-hidden dark:bg-zinc-900/40 dark:ring-1 dark:ring-zinc-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                  <TableRow className="dark:border-zinc-800">
                    <TableHead className="w-[100px] text-center dark:text-zinc-400">รูปภาพ</TableHead>
                    <TableHead className="dark:text-zinc-400">ชื่อเมนู</TableHead>
                    <TableHead className="dark:text-zinc-400">หมวดหมู่ / ประเภท</TableHead>
                    <TableHead className="text-right dark:text-zinc-400">ราคา</TableHead>
                    <TableHead className="text-right w-[120px] dark:text-zinc-400">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMenus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-zinc-500 italic">
                        <Utensils className="h-10 w-10 opacity-20 mx-auto mb-3" />
                        ไม่พบเมนูที่ต้องการ
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMenus.map((menu, idx) => (
                      <TableRow key={menu?.menu_id ?? idx} className="dark:border-zinc-800 dark:hover:bg-zinc-800/30 transition-colors group">
                        <TableCell className="text-center p-2">
                          <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border dark:bg-zinc-950 dark:border-zinc-800">
                            {menu.image ? (
                              <img src={menu.image} alt={menu.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <ImageIcon className="h-6 w-6 opacity-30" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-normal text-zinc-800 dark:text-zinc-100 text-base">{menu.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="font-normal dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800">
                              {menu.category}
                            </Badge>
                            {menu.type === "ready" ? (
                              <div className="flex items-center gap-1 text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                <Package className="h-3 w-3" /> สำเร็จรูป
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                <ChefHat className="h-3 w-3" /> ปรุงสด
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {Number(menu.price).toLocaleString("th-TH")} ฿
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(menu)} className="h-8 w-8 text-blue-500 hover:text-blue-400 dark:hover:bg-blue-500/10">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMenu(menu.menu_id)} className="h-8 w-8 text-rose-500 hover:text-rose-400 dark:hover:bg-rose-500/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md dark:bg-zinc-950 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="dark:text-zinc-100">{editingMenu ? "แก้ไขเมนูอาหาร" : "เพิ่มเมนูอาหาร"}</DialogTitle>
                <DialogDescription className="dark:text-zinc-500">กรอกข้อมูลรายละเอียดเมนูอาหารให้ครบถ้วน</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <div className="flex flex-col items-center gap-4">
                  <label className="w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden relative cursor-pointer hover:bg-zinc-900 transition-colors group dark:border-zinc-800 dark:bg-zinc-950">
                    {image ? (
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-zinc-500">
                        <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                        <span className="text-xs">เลือกรูปภาพ</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="text-white h-6 w-6" />
                    </div>
                  </label>
                  <Label className="text-[10px] text-zinc-500 uppercase tracking-widest">คลิกที่รูปเพื่อเปลี่ยน</Label>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-zinc-400">ชื่อเมนู</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ระบุชื่อเมนู..." className="dark:bg-zinc-900 dark:border-zinc-800" />
                  </div>

                  <div className="space-y-2">
                    <Label className="dark:text-zinc-400">ประเภทการปรุง</Label>
                    <Select value={menuType} onValueChange={setMenuType}>
                      {/* ✅ เพิ่ม w-full */}
                      <SelectTrigger className="w-full dark:bg-zinc-900 dark:border-zinc-800">
                        <SelectValue placeholder="เลือกประเภท" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                        <SelectItem value="cooked">อาหารทำใหม่</SelectItem>
                        <SelectItem value="ready">สำเร็จรูป</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">ราคา (บาท)</Label>
                      <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="dark:bg-zinc-900 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-zinc-400">หมวดหมู่</Label>
                      <Select value={category} onValueChange={setCategory}>
                        {/* ✅ เพิ่ม w-full */}
                        <SelectTrigger className="w-full dark:bg-zinc-900 dark:border-zinc-800">
                          <SelectValue placeholder="เลือกหมวดหมู่" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <div className="p-1 border-t dark:border-zinc-800 mt-1">
                            <Button variant="ghost" size="sm" className="w-full justify-start text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                              onClick={() => { setNewCategory(""); setOpenCategoryDialog(true); }}>
                              <Plus className="mr-2 h-3 w-3" /> เพิ่มใหม่
                            </Button>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t dark:border-zinc-800 pt-4">
                <Button variant="ghost" onClick={() => setOpen(false)} className="dark:text-zinc-400">ยกเลิก</Button>
                <Button onClick={saveMenu} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
                  {editingMenu ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
            <DialogContent className="max-w-xs dark:bg-zinc-950 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="dark:text-zinc-100">เพิ่มหมวดหมู่</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="ชื่อหมวดหมู่..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="dark:bg-zinc-900 dark:border-zinc-800"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setOpenCategoryDialog(false)}>ยกเลิก</Button>
                <Button size="sm" onClick={addCategory} className="bg-orange-600 hover:bg-orange-700">บันทึก</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}