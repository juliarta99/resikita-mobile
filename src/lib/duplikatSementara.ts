import type { LaporanRingkas } from "@/types/laporan";

/**
 * Titipan sementara antara layar Lapor dan layar konfirmasi duplikat.
 *
 * Memakai penampung tingkat modul, bukan params router, karena alasan yang sama
 * dengan `fotoSementara`: params expo-router adalah string URL, dan mengirim
 * larik objek lewat sana berarti merangkai lalu mengurai JSON di dua tempat,
 * satu lagi kesempatan untuk rusak diam-diam, demi data yang toh hanya perlu
 * hidup beberapa detik di dalam satu proses.
 */
let kandidat: LaporanRingkas[] = [];
let dipilih: LaporanRingkas | null = null;
let radiusMeter = 50;

export const duplikatSementara = {
  simpanKandidat: (daftar: LaporanRingkas[], radius = 50) => {
    kandidat = daftar;
    radiusMeter = radius;
  },
  ambilKandidat: (): LaporanRingkas[] => kandidat,

  /** Radius yang dipakai peladen saat mencari, untuk ditampilkan apa adanya. */
  ambilRadius: (): number => radiusMeter,

  /** Dipanggil layar duplikat saat pengguna memilih menggabungkan. */
  pilih: (laporan: LaporanRingkas | null) => {
    dipilih = laporan;
  },
  yangDipilih: (): LaporanRingkas | null => dipilih,

  bersihkan: () => {
    kandidat = [];
    dipilih = null;
    radiusMeter = 50;
  },
};
