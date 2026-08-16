/** Artikel edukasi dan pemutar suaranya. Rujukan: API-DOCS.md §3.18 dan §7. */

import type { IsoDateTime, ParamsHalaman } from "./api";
import type { PenggunaRingkas } from "./auth";
import type { TipeArtikel } from "./enums";

export type KategoriArtikel = {
  id: number;
  nama: string;
  /** Penyaring `GET /artikel?kategori=` memakai **slug**, bukan id. */
  slug: string;
  jumlah_artikel?: number;
};

/**
 * Kartu artikel untuk daftar (§3.18).
 *
 * Perhatikan `kategori` di sini berupa **string nama**, sementara pada detail
 * ia berupa objek. Bentuknya memang berbeda antar-endpoint.
 */
export type ArtikelRingkas = {
  id: number;
  judul: string;
  /** **Kunci URL detail.** */
  slug: string;
  tipe: TipeArtikel;
  tipe_label: string;
  /** Maks 160 karakter, sudah bersih dari markdown. */
  cuplikan: string;
  estimasi_baca_menit: number | null;
  thumbnail_url: string | null;
  dilihat: number;
  is_unggulan: boolean;
  kategori?: string | null;
  published_at: IsoDateTime | null;
};

/** Detail artikel (§7.3). */
export type Artikel = Omit<ArtikelRingkas, "cuplikan" | "kategori"> & {
  /**
   * Markdown penuh, menggantikan `cuplikan`.
   *
   * **Jangan lempar ini ke TTS** — pembaca akan mengucapkan pagar dan
   * bintangnya. Untuk dibacakan, ambil `TeksBaca` dari endpoint terpisah.
   */
  konten: string;
  video_url: string | null;
  /** Berapa kali pemutar suaranya dinyalakan. Metrik pilar inklusif. */
  didengarkan: number;
  kategori?: KategoriArtikel | null;
  penulis?: PenggunaRingkas | null;
};

/**
 * Respons `GET /artikel/{slug}/teks-baca` (§7.4).
 *
 * Sengaja tidak ikut pada detail artikel: isinya bisa sepanjang seluruh artikel
 * dan hanya dibutuhkan ketika pemutar benar-benar dinyalakan. Memanggilnya
 * sekaligus menaikkan penghitung `didengarkan` — tidak ada endpoint terpisah
 * untuk melaporkan pemakaian fitur suara.
 */
export type TeksBaca = {
  /** Bacakan lebih dulu sebelum isi. */
  judul: string;
  /** Sudah dibersihkan dari markdown di peladen, supaya web dan mobile identik. */
  teks_baca: string;
  estimasi_baca_menit: number | null;
  /** Selalu `id-ID`. Pakai apa adanya sebagai locale `speechSynthesis`. */
  bahasa: string;
};

export type ParamsArtikel = ParamsHalaman & {
  /** **Slug** kategori, bukan id. */
  kategori?: string;
  tipe?: TipeArtikel;
  unggulan?: boolean;
  /** Judul mengandung kata kunci. */
  cari?: string;
};
