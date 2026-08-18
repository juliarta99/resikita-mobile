/** Dompet, penarikan, dan setoran. Rujukan: API-DOCS.md §3.11–§3.13 dan §12. */

import type { IsoDateTime, ParamsHalaman, Rupiah } from "./api";
import type { PenggunaRingkas } from "./auth";
import type {
    StatusPenarikan,
    StatusSetoran,
    TipeTransaksiDompet,
} from "./enums";
import type { BankSampah } from "./fasilitas";

/** Respons `GET /dompet/saldo` (§12.1). */
export type Dompet = {
  saldo: Rupiah;
  /**
   * ULID 26 karakter, **dibuat otomatis bila belum ada**.
   *
   * Karena itu endpoint ini aman dipanggil sebagai penjamin ketersediaan QR,
   * tidak ada endpoint terpisah untuk menerbitkannya. Isinya acak, bukan NIK.
   */
  kode_qr: string;
  ringkasan_bulan_ini: {
    masuk: Rupiah;
    keluar: Rupiah;
    saldo: Rupiah;
  };
  /** Batas minimum pengajuan penarikan, baku 10.000. */
  penarikan_minimum: Rupiah;
};

export type DompetTransaksi = {
  id: number;
  tipe: TipeTransaksiDompet;
  tipe_label: string;
  /** **Pakai ini untuk tanda + / −**, bukan tanda pada `jumlah`. */
  is_pemasukan: boolean;
  /** Selalu positif; arah ditentukan `is_pemasukan`. */
  jumlah: Rupiah;
  saldo_sebelum: Rupiah;
  saldo_sesudah: Rupiah;
  keterangan: string | null;
  created_at: IsoDateTime | null;
};

export type PenarikanSaldo = {
  id: number;
  jumlah: Rupiah;
  /** Baku `transfer_bank`. */
  metode: string;
  nama_bank: string | null;
  /** **Disamarkan peladen**, mis. `**********4521`. */
  no_rekening: string;
  atas_nama: string;
  status: StatusPenarikan;
  status_label: string;
  status_warna: string;
  /** Alasan penolakan bila ditolak. */
  catatan: string | null;
  created_at: IsoDateTime | null;
};

/** Body `POST /dompet/penarikan` (§12.5). */
export type PayloadPenarikan = {
  /** Rupiah penuh. Batas nyata 10.000–10.000.000 diperiksa peladen. */
  jumlah: Rupiah;
  metode?: string;
  nama_bank?: string;
  /** Hanya angka, 6–25 digit. */
  no_rekening: string;
  atas_nama: string;
};

export type ItemSetoran = {
  id: number;
  jenis: string;
  /** Kilogram. */
  berat: number;
  harga_per_satuan: Rupiah;
  subtotal: Rupiah;
};

/**
 * Riwayat setoran sebagai nasabah (§3.13).
 *
 * Seluruh nilainya **snapshot saat transaksi**. Perubahan katalog harga
 * sesudahnya tidak mengubah riwayat ini.
 */
export type SetoranSampah = {
  id: number;
  kode_setoran: string;
  /** Kilogram. */
  total_berat: number;
  total_nilai: Rupiah;
  status: StatusSetoran;
  status_label: string;
  catatan: string | null;
  bank_sampah?: BankSampah | null;
  nasabah?: PenggunaRingkas | null;
  petugas?: PenggunaRingkas | null;
  item?: ItemSetoran[];
  created_at: IsoDateTime | null;
};

export type ParamsTransaksi = ParamsHalaman & {
  tipe?: TipeTransaksiDompet;
};
