import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import {
  hapusDariKeranjang,
  keranjang as ambilKeranjang,
  kosongkanKeranjang,
  tambahKeKeranjang,
  ubahQtyKeranjang,
} from "@/lib/api/produk";
import type { KelompokKeranjang, PayloadKeranjang } from "@/types/produk";

export const KUNCI_KERANJANG = ["keranjang"] as const;

/**
 * Keranjang belanja, disimpan di peladen dan **dikelompokkan per toko**.
 *
 * Versi sebelumnya menyimpan keranjang di perangkat beserta salinan harga dan
 * stok — harga yang tersalin bisa berbeda dari harga saat checkout, dan
 * keranjangnya hilang begitu pengguna berganti perangkat.
 *
 * Pengelompokan per toko datang dari peladen, dan itu memperbaiki satu hal yang
 * sebelumnya saya rancang keliru: karena satu pesanan hanya boleh berisi produk
 * dari satu UMKM, versi sebelumnya memaksa pengguna **mengosongkan keranjang**
 * setiap kali menambah produk dari toko lain. Sekarang tidak perlu — semuanya
 * boleh menumpuk, dan checkout dilakukan satu toko pada satu waktu.
 */
export function useKeranjang() {
  const qc = useQueryClient();
  const { user } = useAuth();

  /**
   * Hanya dipanggil ketika ada sesi.
   *
   * `/keranjang` menuntut token. Tanpa penjaga ini, tab Pasar yang dibuka
   * pengunjung belum masuk langsung memicu `401` — dan penanganan 401 di
   * `lib/api/client.ts` membuang token lalu mengalihkan ke layar masuk.
   */
  const q = useQuery({
    queryKey: KUNCI_KERANJANG,
    queryFn: ambilKeranjang,
    enabled: !!user,
  });

  const segarkan = () => qc.invalidateQueries({ queryKey: KUNCI_KERANJANG });

  const tambah = useMutation({
    mutationFn: (v: PayloadKeranjang) => tambahKeKeranjang(v),
    onSuccess: segarkan,
  });

  /**
   * Ubah kuantitas.
   *
   * Dikunci `produk_id`, bukan id baris keranjang: itu yang diterima peladen.
   * Ketiganya — id baris, id produk, dan slug — hidup berdampingan di objek yang
   * sama, dan salah pilih di sini dulu menghasilkan `404` yang terbaca seperti
   * "produk sudah dihapus".
   */
  const ubahQty = useMutation({
    mutationFn: (v: PayloadKeranjang) => ubahQtyKeranjang(v),
    onSuccess: segarkan,
  });

  /** Kuncinya **slug produk**, bukan id baris keranjang. */
  const hapus = useMutation({
    mutationFn: (slug: string) => hapusDariKeranjang(slug),
    onSuccess: segarkan,
  });

  const kosongkan = useMutation({
    mutationFn: kosongkanKeranjang,
    onSuccess: segarkan,
  });

  const toko: KelompokKeranjang[] = q.data?.toko ?? [];

  return {
    query: q,
    toko,
    /** Ambil satu kelompok toko, mis. saat checkout. */
    kelompok: (umkmId: number) =>
      toko.find((t) => t.umkm?.id === umkmId) ?? null,
    /** Jumlah barang di seluruh toko — angka untuk lencana keranjang. */
    jumlahItem: q.data?.total_item ?? 0,
    /**
     * Total seluruh keranjang, dari peladen.
     *
     * Tetap pratinjau: angka yang mengikat datang dari respons `POST /pesanan`.
     */
    totalBelanja: q.data?.total_belanja ?? 0,
    tambah,
    ubahQty,
    hapus,
    kosongkan,
    sedangUbah:
      tambah.isPending ||
      ubahQty.isPending ||
      hapus.isPending ||
      kosongkan.isPending,
  };
}
