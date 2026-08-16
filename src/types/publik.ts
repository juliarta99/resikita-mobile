/** Data publik tanpa autentikasi. Rujukan: API-DOCS.md §13. */

import type { Rupiah } from "./api";
import type { JenisFasilitas } from "./fasilitas";

export type RingkasanNasional = {
  wilayah_bergabung: number;
  total_laporan: number;
  laporan_selesai: number;
  bank_sampah: number;
  tps: number;
  umkm: number;
  warga: number;
  /** Kilogram, boleh pecahan — ini berat, bukan uang. */
  berat_teralihkan_kg: number;
  nilai_ke_warga: Rupiah;
};

/** Metrik pemakaian fitur suara. Angka pilar Inklusif GEMASTIK. */
export type MetrikSuara = {
  laporan_suara: number;
  persen_laporan_suara: number;
  artikel_didengarkan: number;
};

/**
 * Respons `GET /publik/statistik`.
 *
 * Di-cache 15 menit di peladen. Jangan menjadwalkan pemanggilan ulang lebih
 * sering dari itu — jawabannya tidak akan berubah.
 */
export type StatistikPublik = {
  ringkasan: RingkasanNasional;
  fitur_suara: MetrikSuara;
};

/**
 * Satu titik pada `GET /publik/peta`.
 *
 * **Titik laporan tidak ada di sini, dan itu disengaja.** Koordinat laporan
 * menunjuk tempat yang bisa jadi halaman rumah seseorang; menyebarnya di peta
 * terbuka mengubah alat pelaporan menjadi alat menunjuk tetangga.
 *
 * Bentuk ini disusun dari respons nyata, bukan tebakan. Yang perlu diketahui:
 * **tidak ada `id`.** Endpoint ini murni untuk menggambar titik, sehingga dari
 * peta publik tidak ada jalan langsung ke halaman detail fasilitas — lihat
 * catatan T21.
 */
export type TitikPeta = {
  nama: string;
  jenis: JenisFasilitas;
  latitude: number;
  longitude: number;
  alamat: string | null;
  /** Nama wilayah siap tampil, mis. "Badung". */
  wilayah?: string | null;
  /** Belum dikirim peladen; disiapkan bila nanti ditambahkan. */
  id?: number;
};
