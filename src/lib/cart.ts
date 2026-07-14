import { storage } from "@/lib/storage";
import { useSyncExternalStore } from "react";

export type CartItem = {
  product_id: number;
  nama: string;
  harga: number;
  gambar: string | null;
  umkm_id: number;
  umkm: string;
  stok: number;
  qty: number;
};

const KEY = "cart_v1";
let items: CartItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const persist = () => {
  storage.set(KEY, JSON.stringify(items)).catch(() => {});
};
const emit = () => {
  items = [...items];
  persist();
  listeners.forEach((l) => l());
};

// Muat keranjang tersimpan sekali di awal (async, aman untuk web reload & native).
(async () => {
  try {
    const raw = await storage.get(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) items = p;
    }
  } catch {}
  hydrated = true;
  items = [...items];
  listeners.forEach((l) => l());
})();

export const cart = {
  /** Tambah produk. Return 'ok' | 'different_umkm' (keranjang hanya untuk satu toko). */
  add(p: Omit<CartItem, "qty">, qty = 1): "ok" | "different_umkm" {
    if (items.length > 0 && items[0].umkm_id !== p.umkm_id)
      return "different_umkm";
    const ex = items.find((i) => i.product_id === p.product_id);
    if (ex) ex.qty = Math.min(ex.qty + qty, p.stok || 999);
    else items.push({ ...p, qty: Math.min(qty, p.stok || 999) });
    emit();
    return "ok";
  },
  replaceWith(p: Omit<CartItem, "qty">, qty = 1) {
    items = [{ ...p, qty }];
    emit();
  },
  setQty(id: number, qty: number) {
    const i = items.find((x) => x.product_id === id);
    if (i) {
      i.qty = Math.max(1, Math.min(qty, i.stok || 999));
      emit();
    }
  },
  remove(id: number) {
    items = items.filter((i) => i.product_id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  get() {
    return items;
  },
  count() {
    return items.reduce((n, i) => n + i.qty, 0);
  },
  subtotal() {
    return items.reduce((n, i) => n + i.harga * i.qty, 0);
  },
  isHydrated() {
    return hydrated;
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(cart.subscribe, cart.get, cart.get);
}
