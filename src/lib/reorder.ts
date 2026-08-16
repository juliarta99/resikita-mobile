import { kosongkanKeranjang, tambahKeKeranjang } from "@/lib/api/produk";
import type { ItemPesanan } from "@/types/pesanan";

export type HasilReorder = {
  ditambah: number;
  dilewati: number;
};

/**
 * Isi ulang keranjang dari sebuah pesanan lama.
 *
 * Keranjang dikosongkan lebih dulu supaya isinya persis pesanan yang diulang,
 * bukan campuran dengan apa pun yang tertinggal dari sesi belanja sebelumnya.
 * Pengosongannya satu permintaan (`DELETE /keranjang`), bukan menghapus baris
 * satu per satu — versi sebelumnya melakukan itu dan mengirim sebanyak jumlah
 * item, masing-masing dengan kunci yang keliru pula.
 *
 * Kuantitas dikirim apa adanya. Stok dan harga terkini adalah urusan peladen;
 * item yang tidak lagi tersedia akan ditolak dan dihitung sebagai `dilewati`,
 * sehingga pemanggil bisa memberi tahu pengguna berapa yang tidak bisa dibawa
 * kembali.
 */
export async function reorderItems(
  items: ItemPesanan[],
): Promise<HasilReorder> {
  await kosongkanKeranjang();

  let ditambah = 0;
  let dilewati = 0;

  for (const it of items) {
    try {
      // `produk_id` ada langsung di baris pesanan sebagai snapshot; relasi
      // `produk` hanya dimuat pada endpoint detail dan tidak selalu ada.
      await tambahKeKeranjang({ produk_id: it.produk_id, qty: it.qty });
      ditambah++;
    } catch {
      // Produk sudah tidak dijual, stoknya habis, atau tokonya nonaktif.
      // Bukan alasan menghentikan sisa item — pengguna diberi tahu jumlahnya.
      dilewati++;
    }
  }

  return { ditambah, dilewati };
}
