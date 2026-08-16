/** Bank sampah, TPS, dan iuran. Rujukan: API-DOCS.md §3.14, §3.15, §8, §13. */

import type { IsoDateTime, ParamsHalaman, ParamsLokasi, Rupiah } from "./api";
import type {
  JenisTps,
  KategoriSampah,
  MetodeBayar,
  StatusIuran,
} from "./enums";
import type { Wilayah } from "./wilayah";

/**
 * Jenis titik pada `GET /publik/peta` (§6.2).
 *
 * Satu kunci untuk dua sumber berbeda: `tps` dan `tps3r` berasal dari tabel
 * TPS, `bank_sampah` dari tabel bank sampah. Cukup untuk memilih ikon peta,
 * tapi **bukan** penanda tabel asal — jangan memakainya untuk memilih endpoint
 * detail.
 */
export const JENIS_FASILITAS = ["bank_sampah", "tps", "tps3r"] as const;
export type JenisFasilitas = (typeof JENIS_FASILITAS)[number];

/** Penyaring yang berlaku sama untuk TPS, bank sampah, dan UMKM (§8). */
export type ParamsDirektori = ParamsHalaman &
  ParamsLokasi & {
    cari?: string;
    wilayah_id?: number;
  };

export type ParamsTps = ParamsDirektori & {
  jenis?: JenisTps;
};

export type BankSampah = {
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  foto_url: string | null;
  /** JSON bebas dari peladen, mis. `{ "senin": "08:00-15:00" }`. */
  jam_operasional: Record<string, string> | null;
  status: "aktif" | "nonaktif";
  status_label: string;
  is_verified: boolean;
  wilayah?: Wilayah | null;
  /** Bersyarat — hanya pada daftar. */
  jumlah_jenis_harga?: number;
  /** Bersyarat — hanya bila permintaan mengirim koordinat. */
  jarak_km?: number;
};

/**
 * Satu baris katalog harga sebuah bank sampah.
 *
 * Katalog ini **per unit, bukan global.** Dua bank sampah boleh menghargai
 * jenis yang sama dengan angka berbeda, jadi layar mana pun yang menampilkan
 * harga harus lebih dulu tahu unit mana yang sedang dirujuk — menampilkan angka
 * dari unit lain sama saja menjanjikan harga yang tidak akan pengguna terima.
 */
export type BankSampahHarga = {
  id: number;
  bank_sampah_id: number;
  jenis_sampah: string;
  kategori: KategoriSampah;
  kategori_label: string;
  /** Baku `kg`. */
  satuan: string;
  harga_per_satuan: Rupiah;
  is_active: boolean;
  /** Relasi — dimuat pada `/harga-sampah`, tidak pada detail bank sampah. */
  bank_sampah?: BankSampah | null;
};

/** Bentuk `data` pada `GET /direktori/bank-sampah/{id}` (§8.4). */
export type DetailBankSampah = {
  bank_sampah: BankSampah;
  /** Hanya harga aktif, terurut `jenis_sampah`. */
  harga: BankSampahHarga[];
};

/** Query `GET /harga-sampah` (§8.7). */
export type ParamsHargaSampah = ParamsHalaman & {
  kategori?: KategoriSampah;
  /** Wilayah **bank sampahnya**, bukan wilayah pengguna. */
  wilayah_id?: number;
};

export type Tps = {
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  foto_url: string | null;
  jenis: JenisTps;
  jenis_label: string;
  /** Penjelasan siap tampil bagi warga. */
  jenis_deskripsi: string;
  /** `true` hanya untuk `tps3r`. */
  mengolah_di_tempat: boolean;
  is_berbayar: boolean;
  tarif_bulanan: Rupiah | null;
  kapasitas_ton: number | null;
  wilayah?: Wilayah | null;
  jumlah_anggota?: number;
  jarak_km?: number;
};

export type TpsIuran = {
  id: number;
  /** `YYYY-MM`. */
  periode: string;
  jumlah: Rupiah;
  status: StatusIuran;
  status_label: string;
  status_warna: string;
  /**
   * Dasar mengaktifkan tombol bayar. Datang dari peladen supaya klien tidak
   * menghitung ulang aturan transisi sendiri.
   */
  bisa_dibayar: boolean;
  metode_bayar: MetodeBayar | null;
  dibayar_at: IsoDateTime | null;
  tps?: Tps | null;
};

/**
 * Bentuk `data` pada `GET /tps/keanggotaan-saya` (§13.1).
 *
 * `null` berarti pengguna belum menjadi anggota TPS mana pun — itu keadaan
 * normal, **bukan** galat. Bedakan dari `404` dengan memeriksa `success`, bukan
 * keberadaan `data`.
 */
export type KeanggotaanTps = {
  tps: Tps;
  bergabung_at: IsoDateTime | null;
  /** 12 periode terakhir, terbaru dulu. */
  tagihan: TpsIuran[];
};
