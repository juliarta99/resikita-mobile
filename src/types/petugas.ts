/**
 * Area petugas lapangan. Rujukan: API-DOCS.md §19.
 *
 * Seluruh endpoint di sini dijaga middleware role `petugas`; role lain menerima
 * `403` tanpa perlu melihat isinya. Gerbang di klien hanya menentukan apa yang
 * tampak, bukan apa yang diizinkan, pakai `user.role === "petugas"`.
 *
 * Cakupan datanya otomatis terbatas pada penugasan milik petugas yang sedang
 * masuk. Klien tidak perlu, dan tidak bisa, mengirim `petugas_id`.
 */

import type { ParamsHalaman } from "./api";
import type { StatusProgres } from "./enums";

export type { LaporanPenugasan as Penugasan } from "./laporan";

export type ParamsPenugasan = ParamsHalaman & {
  /**
   * Baku `true` di peladen: hanya `ditugaskan` dan `dikerjakan`. Kirim `false`
   * untuk melihat riwayat lengkap.
   */
  hanya_aktif?: boolean;
};

/**
 * Field `multipart/form-data` untuk `POST /petugas/penugasan/{laporan_id}/progres`.
 *
 * Satu endpoint untuk dua peristiwa: `status_progres: "dikerjakan"` mencatat
 * kemajuan, `"selesai"` menutup laporan induknya sekaligus. Tidak ada endpoint
 * `/mulai` maupun `/selesai` terpisah.
 *
 * `foto_bukti` ditangani terpisah oleh pemanggil dan **wajib** saat
 * menyelesaikan, divalidasi dua kali di peladen, jadi mengirimkannya tanpa
 * foto akan gagal dengan pasti.
 */
export type FieldProgresPenugasan = {
  status_progres: StatusProgres;
  /** Maks 2000 karakter. */
  catatan?: string;
  /** Titik petugas saat mencatat. Opsional. */
  latitude?: number;
  longitude?: number;
};
