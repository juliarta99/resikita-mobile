import { useQueries } from "@tanstack/react-query";

import { riwayatSetoran, saldoDompet } from "@/lib/api/dompet";
import { ringkasanKlasifikasi } from "@/lib/api/klasifikasi";
import { daftarLaporan } from "@/lib/api/laporan";
import { daftarPesanan } from "@/lib/api/pesanan";
import type { Rupiah } from "@/types/api";

export type StatistikSaya = {
  saldo: Rupiah;
  jumlahSetor: number;
  jumlahLaporan: number;
  jumlahPesanan: number;
  jumlahKlasifikasi: number;
  /** Estimasi nilai seluruh sampah yang pernah dikenali, dari peladen. */
  nilaiKlasifikasi: Rupiah;
  /**
   * Total berat sampah yang pernah disetor, dalam kilogram.
   *
   * **`null` berarti tidak diketahui, bukan nol.** Tidak ada endpoint yang
   * mengembalikan akumulasi berat setoran pengguna; `GET /dompet/setoran`
   * berhalaman, dan menjumlahkan halaman pertama saja menghasilkan angka yang
   * salah tapi tampak presisi, pengguna dengan 200 setoran akan melihat total
   * yang dihitung dari 15 di antaranya.
   */
  totalSetorKg: number | null;
  memuat: boolean;
};

/**
 * Angka ringkas milik pengguna untuk beranda, profil, dan pencapaian.
 *
 * Jumlah diambil dari `meta.total` pada respons berhalaman, bukan dari panjang
 * larik yang sudah diunduh. Bedanya bukan kosmetik: `meta.total` adalah jumlah
 * sebenarnya di peladen, sementara panjang larik hanya sebesar satu halaman.
 */
export function useStatistikSaya(aktif = true): StatistikSaya {
  const hasil = useQueries({
    queries: [
      {
        queryKey: ["dompet", "saldo"],
        queryFn: saldoDompet,
        enabled: aktif,
      },
      {
        // `per_page: 1`, yang dibutuhkan hanya `meta.total`, bukan isinya.
        queryKey: ["setoran", "jumlah"],
        queryFn: () => riwayatSetoran({ per_page: 1 }),
        enabled: aktif,
      },
      {
        queryKey: ["laporan", "jumlah"],
        queryFn: () => daftarLaporan({ per_page: 1 }),
        enabled: aktif,
      },
      {
        queryKey: ["pesanan", "jumlah"],
        queryFn: () => daftarPesanan({ per_page: 1 }),
        enabled: aktif,
      },
      {
        queryKey: ["klasifikasi", "ringkasan"],
        queryFn: ringkasanKlasifikasi,
        enabled: aktif,
      },
    ],
  });

  const [saldoQ, setoranQ, laporanQ, pesananQ, klasifikasiQ] = hasil;

  return {
    saldo: saldoQ.data?.saldo ?? 0,
    jumlahSetor: setoranQ.data?.meta.total ?? 0,
    jumlahLaporan: laporanQ.data?.meta.total ?? 0,
    jumlahPesanan: pesananQ.data?.meta.total ?? 0,
    // Peladen sudah menyediakan totalnya; menjumlahkan `per_kategori` sendiri
    // hanya menduplikasi hitungan yang sama dengan risiko berselisih.
    jumlahKlasifikasi: klasifikasiQ.data?.total ?? 0,
    nilaiKlasifikasi: klasifikasiQ.data?.estimasi_nilai_total ?? 0,
    totalSetorKg: null,
    memuat: hasil.some((q) => q.isLoading),
  };
}
