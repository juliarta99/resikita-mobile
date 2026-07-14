import { getProdukDetail } from "@/lib/api";
import { cart } from "@/lib/cart";

/** Tambahkan ulang item pesanan ke keranjang (ambil data produk terkini). Return jumlah yang berhasil ditambah. */
export async function reorderItems(
  items: { product_id?: number; qty: number }[],
): Promise<number> {
  let ditambah = 0;
  let pertama = true;
  for (const it of items ?? []) {
    if (!it.product_id) continue;
    try {
      const p = await getProdukDetail(it.product_id);
      if (!p || p.stok <= 0) continue;
      const ci = {
        product_id: p.id,
        nama: p.nama,
        harga: p.harga,
        gambar: p.gambar?.[0] ?? null,
        umkm_id: p.umkm?.id,
        umkm: p.umkm?.nama,
        stok: p.stok,
      };
      const qty = Math.min(it.qty, p.stok);
      if (pertama) {
        cart.replaceWith(ci, qty);
        pertama = false;
      } else {
        cart.add(ci, qty);
      }
      ditambah++;
    } catch {}
  }
  return ditambah;
}
