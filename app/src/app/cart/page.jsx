"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Utensils, UtensilsCrossed, Loader2 } from "lucide-react";

export default function CartPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const table = useMemo(() => searchParams.get("table") ?? "", [searchParams]);
    const type = searchParams.get("type");
    const customerName = searchParams.get("customerName");
    const customerPhone = searchParams.get("customerPhone");

    const [cart, setCart] = useState([]);
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsClient(true);
        if (!table && type !== 'takeout') {
            router.replace("/table-status-dashboard");
        }
    }, [table, type, router]);

    const cartKey = useMemo(() => {
        if (table) return `cart_${table}`;
        if (type === 'takeout') return `cart_takeout`;
        return null;
    }, [table, type]);

    useEffect(() => {
        if (!cartKey) return;
        setIsLoading(true);
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || "[]");
        setCart(Array.isArray(savedCart) ? savedCart : []);
        setIsLoading(false);
    }, [cartKey]);

    function updateCart(newCart) {
        setCart(newCart);
        if (cartKey) {
            localStorage.setItem(cartKey, JSON.stringify(newCart));
        }
    }

    const keyOf = (item) => (item.menu_id ?? item.id);

    function increaseQty(item) {
        const k = keyOf(item);
        const updated = cart.map((p) =>
            keyOf(p) === k && (p.note || "") === (item.note || "")
                ? { ...p, qty: Number(p.qty || 0) + 1 }
                : p
        );
        updateCart(updated);
    }

    function decreaseQty(item) {
        const k = keyOf(item);
        const found = cart.find((p) => keyOf(p) === k && (p.note || "") === (item.note || ""));
        if (!found) return;
        const currentQty = Number(found.qty || 0);
        if (currentQty <= 1) {
            removeItem(item);
        } else {
            const updated = cart.map((p) =>
                keyOf(p) === k && (p.note || "") === (item.note || "")
                    ? { ...p, qty: currentQty - 1 }
                    : p
            );
            updateCart(updated);
        }
    }

    function removeItem(item) {
        const k = keyOf(item);
        const confirmed = window.confirm(`คุณต้องการลบ ${item.name} ออกจากตะกร้าหรือไม่?`);
        if (!confirmed) return;
        updateCart(cart.filter((p) => !(keyOf(p) === k && (p.note || "") === (item.note || ""))));
    }

    const totalPrice = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
                0
            ),
        [cart]
    );

    async function confirmOrder() {
        if (!table && type !== 'takeout') return;
        if (cart.length === 0) {
            alert("ตะกร้าว่าง ไม่สามารถสั่งอาหารได้");
            return;
        }
        const isConfirmed = window.confirm(
            `ยืนยันสั่งอาหารยอดรวม ${totalPrice.toLocaleString("th-TH")} บาท ใช่หรือไม่?`
        );
        if (!isConfirmed) return;

        try {
            const payloadItems = cart.map((item) => {
                const menuId = keyOf(item);
                return {
                    id: menuId,
                    menu_id: menuId,
                    qty: Number(item.qty || 0),
                    price: Number(item.price || 0),
                    note: item.note || "",
                };
            });

            const body = {
                items: payloadItems,
                type: type || 'dine_in',
                customerName: customerName || null,
                customerPhone: customerPhone || null,
                table_number: table ? Number(table) : null
            };

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                if (cartKey) localStorage.removeItem(cartKey);
                setCart([]);
                router.push("/table");
            } else {
                alert(data.message || "เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ");
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        }
    }

    const backUrl = type === 'takeout'
        ? `/orders?type=takeout&customerName=${encodeURIComponent(customerName || '')}&customerPhone=${encodeURIComponent(customerPhone || '')}`
        : `/orders?table=${table}`;

    if (!isClient) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between px-6 border-b 
                    bg-white/95 backdrop-blur shadow-sm
                    dark:bg-black/95 dark:border-zinc-900 dark:shadow-none"
                >
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                        <div>
                            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">สรุปรายการสั่งซื้อ</h1>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">
                                {type === 'takeout'
                                    ? `สั่งกลับบ้าน: ${customerName || '-'} ${customerPhone ? `(${customerPhone})` : ''}`
                                    : `โต๊ะ: ${table || "-"}`
                                }
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(backUrl)}
                        className="text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        เลือกเมนูเพิ่ม
                    </Button>
                </header>

                <main className="p-4 sm:p-6 bg-gray-50/50 min-h-[calc(100vh-4rem-5rem)] flex flex-col gap-4 pb-32 dark:bg-black">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
                            <p className="text-sm font-medium animate-pulse text-orange-600">กำลังโหลดตะกร้า...</p>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 gap-4">
                            <div className="bg-gray-100 p-6 rounded-full dark:bg-zinc-900">
                                <ShoppingBag className="h-10 w-10 opacity-30 dark:text-zinc-500" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-gray-600 dark:text-zinc-400">ตะกร้าของคุณว่างเปล่า</h3>
                                <p className="text-xs text-gray-400 dark:text-zinc-600">เลือกเมนูอาหารที่ต้องการเพื่อเปิดโต๊ะ</p>
                            </div>
                            <Button
                                className="bg-orange-600 hover:bg-orange-700 mt-2"
                                onClick={() => router.push(backUrl)}
                            >
                                <Utensils className="mr-2 h-4 w-4" />
                                ไปหน้าสั่งอาหาร
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 max-w-5xl mx-auto w-full">
                            {cart.map((item) => {
                                const k = keyOf(item);
                                const compositeKey = `${k}-${item.note || ""}`;
                                const lineTotal = Number(item.price || 0) * Number(item.qty || 0);

                                return (
                                    <Card
                                        key={compositeKey}
                                        className="flex flex-row overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow bg-white h-28 sm:h-32 dark:bg-black dark:border-zinc-900 dark:shadow-none"
                                    >
                                        <div className="h-full aspect-square p-2 flex-shrink-0">
                                            <div
                                                className="w-full h-full relative overflow-hidden rounded-lg bg-gray-100 shadow-sm border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800"
                                            >
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover object-center"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-700">
                                                        <UtensilsCrossed className="h-6 w-6 mb-1 opacity-50" />
                                                        <span className="text-[10px]">ไม่มีรูป</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col flex-1 py-3 pr-3 pl-0 justify-between">
                                            <div className="flex justify-between items-start gap-1">
                                                <div className="overflow-hidden">
                                                    <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-zinc-50 line-clamp-1">{item.name}</h3>
                                                    {item.note && (
                                                        <p className="text-[10px] text-orange-600 truncate max-w-[150px] mt-1 bg-orange-50 px-2 py-0.5 rounded inline-block dark:bg-orange-950/40 dark:text-orange-400">
                                                            * {item.note}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    className="text-gray-400 hover:text-red-600 p-1 -mt-1 -mr-1 dark:text-zinc-600 dark:hover:text-red-500 transition-colors"
                                                    onClick={() => removeItem(item)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-end justify-between mt-1">
                                                <div className="text-xs text-gray-500 dark:text-zinc-500">
                                                    {Number(item.price).toLocaleString()} บ.
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex items-center bg-gray-50 rounded border border-gray-200 h-6 dark:bg-zinc-900 dark:border-zinc-800"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-l hover:bg-white dark:hover:bg-zinc-800 dark:text-zinc-400"
                                                            onClick={() => decreaseQty(item)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-6 text-center font-bold text-xs dark:text-zinc-50">{item.qty}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-r hover:bg-white dark:hover:bg-zinc-800 dark:text-zinc-400"
                                                            onClick={() => increaseQty(item)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    <div className="text-right min-w-[60px]">
                                                        <span className="block font-bold text-sm sm:text-base text-gray-900 dark:text-zinc-50">
                                                            {lineTotal.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </main>

                {cart.length > 0 && (
                    <div className="fixed bottom-0 right-0 w-full md:pl-64 z-20">
                        <div
                            className="bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-3 px-6 flex items-center justify-between gap-4 max-w-screen-2xl mx-auto
                            dark:bg-black dark:border-zinc-900 dark:shadow-none"
                        >
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 dark:text-zinc-500">ยอดรวม ({cart.reduce((a, b) => a + b.qty, 0)} ชิ้น)</span>
                                <span className="text-xl font-bold text-orange-600 leading-tight dark:text-orange-500">
                                    {totalPrice.toLocaleString("th-TH")} <span className="text-xs text-gray-800 font-normal dark:text-zinc-400">บาท</span>
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(backUrl)}
                                    className="dark:border-zinc-800 dark:hover:bg-zinc-900 dark:text-zinc-300"
                                >
                                    สั่งเพิ่ม
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md px-6 dark:bg-orange-700 dark:hover:bg-orange-600"
                                    onClick={confirmOrder}
                                >
                                    ยืนยัน
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </SidebarInset>
        </SidebarProvider>
    );
}