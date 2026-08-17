/** Checkout dan pesanan. Rujukan: API-DOCS.md §3.17 dan §16. */

import type { IsoDateTime, ParamsHalaman, Rupiah } from "./api";
import type { MetodeBayar, StatusPesanan } from "./enums";
import type { OpsiOngkir, Produk, Umkm } from "./produk";

/** Satu baris pesanan. Seluruh nilainya **snapshot** saat pesanan dibuat. */
export type ItemPesanan = {
  id: number;
  produk_id: number;
  /** Nama saat dibeli, bukan nama produk hari ini. */
  nama: string;
  harga: Rupiah;
  qty: number;
  subtotal: Rupiah;
  /** Relasi, dimuat pada detail pesanan. */
  produk?: Produk | null;
};

export type Pesanan = {
  id: number;
  /** **Kunci URL pesanan**, mis. `PSN-20260314-A7K3M`. Bukan id numerik. */
  kode: string;
  subtotal: Rupiah;
  ongkir: Rupiah;
  total: Rupiah;
  metode_bayar: MetodeBayar;
  metode_bayar_label: string;
  status: StatusPesanan;
  status_label: string;
  status_warna: string;
  /** Aturan transisi dari peladen. **Pakai ini, jangan hardcode daftar status.** */
  bisa_dibatalkan: boolean;
  bisa_diulas: boolean;
  nama_penerima: string;
  phone_penerima: string;
  alamat_kirim: string;
  kurir: string | null;
  layanan_kurir: string | null;
  no_resi: string | null;
  /** Bersyarat, **hanya saat `status === "menunggu_bayar"`**. */
  snap_token?: string | null;
  umkm?: Umkm | null;
  item?: ItemPesanan[];
  dibayar_at: IsoDateTime | null;
  dikirim_at: IsoDateTime | null;
  selesai_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
};

export type ParamsPesanan = ParamsHalaman & {
  status?: StatusPesanan;
};

/**
 * Titik keberangkatan paket sebuah toko (§16.3).
 *
 * Ongkir dihitung dari sini, bukan dari satu titik milik platform, dua toko
 * dengan berat paket sama bisa menghasilkan tarif berbeda, dan itu benar.
 * Ditampilkan sebagai "Dikirim dari …" supaya selisihnya terbaca sebagai jarak,
 * bukan sebagai kekeliruan hitung.
 */
export type AsalKirim = {
  destination_id: number | null;
  alamat: string | null;
};

/** Satu baris `GET /pesanan/pratinjau` (§16.3). `data`-nya **array**. */
export type PratinjauToko = {
  /** **Kunci yang dipakai menyusun `pengiriman` saat checkout.** */
  umkm_id: number;
  umkm_nama: string;
  subtotal: Rupiah;
  berat_gram: number;
  asal?: AsalKirim | null;
  pilihan_ongkir: OpsiOngkir[];
};

/**
 * Query `GET /pesanan/pratinjau` (§16.3).
 *
 * `umkm_ids` opsional. Tanpa itu hasilnya seluruh isi keranjang; dengan itu
 * hanya toko yang diminta, dan nilainya **wajib sama** dengan kunci
 * `pengiriman` yang nanti dikirim saat checkout, kalau tidak angka yang dilihat
 * pembeli bukan angka yang ditagihkan.
 */
export type ParamsPratinjau = {
  destination_id: number;
  umkm_ids?: number[];
};

/**
 * Body `POST /pesanan` (§16.4).
 *
 * `pengiriman` adalah **objek yang dikunci `umkm_id`, bukan array**, dan
 * **kuncinya adalah pilihan tokonya**. Arah pemeriksaan peladen adalah *setiap
 * kunci wajib ada di keranjang*, bukan sebaliknya: toko yang tidak disebut
 * tidak menggagalkan checkout, ia hanya tetap tinggal di keranjang.
 */
export type PayloadCheckout = {
  nama_penerima: string;
  phone_penerima: string;
  alamat_kirim: string;
  destination_id: number;
  metode_bayar: MetodeBayar;
  pengiriman: Record<string, { kurir: string; layanan: string }>;
};

/** Body `POST /pesanan/{kode}/ulasan` (§16.10). Foto dikirim terpisah. */
export type PayloadUlasan = {
  rating: number;
  /** Produk tertentu di dalam pesanan. Bila kosong, ulasan ditujukan ke toko. */
  produk_id?: number;
  komentar?: string;
};
