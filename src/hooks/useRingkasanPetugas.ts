import { useQueries } from "@tanstack/react-query";

import { daftarPenugasan } from "@/lib/api/petugas";

/**
 * Jumlah penugasan yang menunggu tindakan petugas.
 *
 * Dipakai untuk pintasan di beranda. Memakai `per_page: 1` karena yang
 * dibutuhkan hanya `meta.total`, jumlah sebenarnya di peladen, bukan panjang
 * halaman pertama.
 *
 * Penyaringnya `hanya_aktif`, bukan `status`: endpoint penugasan tidak menerima
 * status sama sekali (§19.1), dan query yang tidak dikenali diabaikan diam-diam
 *, versi sebelumnya karena itu menghitung seluruh penugasan dua kali dan
 * menampilkan lencana bernilai dua kali lipat.
 */
export function useRingkasanPetugas(aktif: boolean) {
  const hasil = useQueries({
    queries: [
      {
        queryKey: ["petugas", "jumlah", "aktif"],
        queryFn: () => daftarPenugasan({ hanya_aktif: true, per_page: 1 }),
        enabled: aktif,
      },
      {
        queryKey: ["petugas", "jumlah", "semua"],
        queryFn: () => daftarPenugasan({ hanya_aktif: false, per_page: 1 }),
        enabled: aktif,
      },
    ],
  });

  const [aktifQ, semuaQ] = hasil;
  const perluDitangani = aktifQ.data?.meta.total ?? 0;
  const semua = semuaQ.data?.meta.total ?? 0;

  return {
    /** Yang berstatus `ditugaskan` atau `dikerjakan`, angka untuk lencana. */
    perluDitangani,
    /** Seluruh penugasan sepanjang waktu, termasuk yang sudah tuntas. */
    semua,
    selesai: Math.max(0, semua - perluDitangani),
    memuat: hasil.some((q) => q.isLoading),
  };
}
