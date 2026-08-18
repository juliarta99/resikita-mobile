/** Klasifikasi sampah AI. Rujukan: API-DOCS.md §3.9 dan §10. */

import type { IsoDateTime, ParamsHalaman, Rupiah } from "./api";
import type { KategoriSampah } from "./enums";

export type HasilKlasifikasi = {
  id: number;
  foto_url: string;
  /** Nama spesifik benda, mis. "Botol PET bening". */
  jenis: string;
  kategori: KategoriSampah;
  kategori_label: string;
  /** Penjelasan satu kalimat, siap tampil. */
  kategori_deskripsi: string;
  /** Nama warna semantik dari peladen, mis. `"blue"`. */
  kategori_warna: string;
  /** `true` untuk `b3` dan `elektronik`. */
  butuh_penanganan_khusus: boolean;
  material: string | null;
  /** Persen, 0–100. */
  confidence: number;
  /**
   * `true` bila `confidence < 60`. **Ambangnya ditentukan peladen.**
   *
   * Kalau tiap klien memilih ambangnya sendiri, hasil yang sama tampil sebagai
   * kepastian di satu tempat dan sebagai dugaan di tempat lain. Saat `true`,
   * sampaikan sebagai dugaan dan tawarkan memotret ulang.
   */
  keyakinan_rendah: boolean;
  dapat_didaur_ulang: boolean;
  /** Kilogram. */
  estimasi_berat_kg: number | null;
  estimasi_nilai: Rupiah | null;
  /** Array langkah berurutan, siap ditampilkan sebagai daftar bernomor. */
  langkah_pengolahan: string[];
  rekomendasi_daur_ulang: string | null;
  catatan: string | null;
  created_at: IsoDateTime | null;
};

export type ParamsRiwayatKlasifikasi = ParamsHalaman & {
  kategori?: KategoriSampah;
};

/**
 * `GET /klasifikasi/ringkasan` (§10.3).
 *
 * **Kelima kategori selalu dikembalikan**, termasuk yang jumlahnya nol, supaya
 * grafik di klien tidak berubah bentuk dari satu pemuatan ke pemuatan lain.
 */
export type RingkasanKlasifikasi = {
  total: number;
  estimasi_nilai_total: Rupiah;
  per_kategori: {
    kategori: KategoriSampah;
    label: string;
    warna: string;
    jumlah: number;
  }[];
};
