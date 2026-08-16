/**
 * Autentikasi dan profil. Rujukan: API-DOCS.md §3.1, §3.3, dan §4.
 *
 * **NIK tidak ada di sini dan tidak boleh ditambahkan.** Identitas utama adalah
 * email; identitas nasabah untuk setoran adalah `kode_qr`.
 */

import type { IsoDate, IsoDateTime } from "./api";
import type { JenisKelamin, PlatformPerangkat } from "./enums";
import type { Wilayah } from "./wilayah";

/** Profil pemilik akun sendiri (§3.1). */
export type User = {
  id: number;
  name: string;
  email: string;
  email_terverifikasi: boolean;
  /** Opsional; hanya dipakai untuk notifikasi WhatsApp. */
  phone: string | null;
  phone_terverifikasi: boolean;
  avatar_url: string | null;
  tanggal_lahir: IsoDate | null;
  jenis_kelamin: JenisKelamin | null;
  /**
   * ULID 26 karakter. Inilah yang dirender jadi QR nasabah di `dompet/qr` —
   * bukan NIK, bukan id, bukan nomor telepon. `null` sampai `GET /dompet/saldo`
   * membuatkannya.
   */
  kode_qr: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  /** Satu role utama, mis. `masyarakat`. */
  role: string | null;
  role_label: string | null;
  /**
   * Seluruh permission efektif. **Menu aplikasi dibangun dari larik ini**,
   * bukan dari daftar role yang ditulis ulang di klien (§2.7).
   */
  permissions: string[];
  /** Domisili. Relasi — hadir pada daftar, login, `/auth/me`, dan `PUT /profil`. */
  wilayah?: Wilayah | null;
  bank_sampah_id: number | null;
  umkm_id: number | null;
  created_at: IsoDateTime | null;
};

/** Pengguna dilihat orang lain (§3.3). Sengaja tipis. */
export type PenggunaRingkas = {
  id: number;
  name: string;
  avatar_url: string | null;
};

/** Respons `POST /auth/daftar` dan `POST /auth/login`. */
export type HasilAuth = {
  user: User;
  token: string;
};

export type PayloadDaftar = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  /** `^0[0-9]{8,13}$`. */
  phone?: string;
  /** Id wilayah, biasanya tingkat desa. Opsional saat mendaftar. */
  wilayah_id?: number;
  latitude?: number;
  longitude?: number;
  /** Muncul di daftar sesi aktif. Bila kosong, peladen memakai `mobile`. */
  nama_perangkat?: string;
};

export type PayloadMasuk = {
  email: string;
  password: string;
  /**
   * Nama perangkat, ikut tercatat pada token Sanctum.
   *
   * Namanya `nama_perangkat`, bukan `device_name`. Nama yang salah tidak
   * menghasilkan galat — peladen hanya mengabaikannya, dan seluruh sesi tampil
   * sebagai "mobile" tanpa ada yang tahu kenapa.
   */
  nama_perangkat?: string;
};

/** Kanal verifikasi. Keduanya punya sepasang endpoint sendiri (§4.5). */
export type KanalVerifikasi = "email" | "phone";

export type PayloadResetPassword = {
  email: string;
  /** Tepat 6 angka. */
  kode: string;
  password: string;
  password_confirmation: string;
};

/** Body `PUT /profil` (§4.8). Seluruh field opsional — kirim yang berubah saja. */
export type PayloadUbahProfil = {
  name?: string;
  email?: string;
  /** Kirim `null` untuk melepas nomor. */
  phone?: string | null;
  tanggal_lahir?: IsoDate | null;
  jenis_kelamin?: JenisKelamin | null;
  wilayah_id?: number | null;
};

export type PayloadUbahPassword = {
  password_lama: string;
  password: string;
  password_confirmation: string;
};

/** Body `POST /perangkat` dan `DELETE /perangkat` (§18.5–§18.6). */
export type PayloadPerangkat = {
  token: string;
  platform: PlatformPerangkat;
};
