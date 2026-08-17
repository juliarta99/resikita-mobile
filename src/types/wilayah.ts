/** Hierarki wilayah nasional. Rujukan: API-DOCS.md §3.2 dan §5. */

import type { StatusRegistrasiWilayah, TingkatWilayah } from "./enums";

/**
 * Objek wilayah, seperti dikembalikan seluruh endpoint `/wilayah/*`.
 *
 * `parent` adalah **relasi**: ia hadir hanya pada endpoint yang memuatnya
 * (`/wilayah/{id}`, `/wilayah/cari`, `/wilayah/terdekat`) dan tidak ada sama
 * sekali pada `/wilayah/provinsi` maupun `/wilayah/{id}/anak`. Jangan
 * memperlakukan ketiadaannya sebagai "wilayah tanpa induk", lihat §1.8.
 */
export type Wilayah = {
  id: number;
  kode: string;
  /**
   * **Tanpa sebutan tingkatnya.** Yang tersimpan "Badung", bukan "Kabupaten
   * Badung". Merangkai `tingkat_label + nama` sendiri menghasilkan "Kabupaten
   * Kabupaten Badung" untuk wilayah yang namanya memang memuat sebutan itu.
   * Pakai `nama_lengkap` bila butuh bentuk yang sudah dirangkai peladen.
   */
  nama: string;
  nama_lengkap: string;
  tingkat: TingkatWilayah;
  tingkat_label: string;
  status_registrasi: StatusRegistrasiWilayah;
  status_label: string;
  /** Pintasan `status_registrasi === "terverifikasi"`. */
  terverifikasi: boolean;
  latitude: number | null;
  longitude: number | null;
  parent?: Wilayah | null;
};

/** Empat tingkat wilayah sebuah laporan (§3.6) atau hasil resolusi (§5.6). */
export type WilayahBertingkat = {
  desa?: Wilayah | null;
  kecamatan?: Wilayah | null;
  kabupaten?: Wilayah | null;
  provinsi?: Wilayah | null;
};

/** Hasil `POST /wilayah/resolusi` (§5.6). */
export type ResolusiWilayah = WilayahBertingkat & {
  /**
   * `false` berarti koordinatnya tidak jatuh di wilayah terdaftar mana pun
   * dalam radius resolusi. Laporan tetap boleh dikirim, ia diteruskan ke
   * Fasilitator Wilayah.
   */
  ditemukan: boolean;
  jarak_km: number | null;
};

/** Query `GET /wilayah/cari` (§5.4). `q` 3–100 karakter. */
export type ParamsCariWilayah = {
  q: string;
  tingkat?: TingkatWilayah;
};

/** Query `GET /wilayah/terdekat` (§5.5). Mengembalikan sepuluh terdekat. */
export type ParamsWilayahTerdekat = {
  latitude: number;
  longitude: number;
  tingkat?: TingkatWilayah;
};

/** Query `GET /wilayah` (§5.7). */
export type ParamsWilayah = {
  tingkat?: TingkatWilayah;
  parent_id?: number;
  cari?: string;
  page?: number;
  per_page?: number;
};
