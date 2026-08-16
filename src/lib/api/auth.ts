/** Autentikasi, profil, dan perangkat. Rujukan: API-DOCS.md §4 dan §18.5–§18.6. */

import type {
  HasilAuth,
  KanalVerifikasi,
  PayloadDaftar,
  PayloadMasuk,
  PayloadPerangkat,
  PayloadResetPassword,
  PayloadUbahPassword,
  PayloadUbahProfil,
  User,
} from "@/types/auth";
import { appendFoto, del, get, post, postMultipart, put } from "./client";

/** §4.1. Pathnya `/auth/daftar` — bukan `/auth/register`. */
export const daftar = (body: PayloadDaftar) =>
  post<HasilAuth>("/auth/daftar", body);

export const masuk = (body: PayloadMasuk) =>
  post<HasilAuth>("/auth/login", body);

/** Mencabut hanya token yang sedang dipakai; sesi di perangkat lain tetap hidup. */
export const keluar = () => post<null>("/auth/logout");

export const profilSaya = () => get<User>("/auth/me");

/**
 * Minta kode verifikasi 6 angka (§4.5).
 *
 * Email dan WhatsApp punya sepasang endpoint sendiri-sendiri; tidak ada
 * endpoint OTP generik dengan field `tujuan`. Keduanya dibatasi 6 permintaan
 * per menit karena tiap panggilan mengirim pesan sungguhan yang berbiaya.
 */
export const kirimKodeVerifikasi = (kanal: KanalVerifikasi) =>
  post<null>(`/auth/verifikasi-${kanal}/kirim`);

/**
 * Kirim kode verifikasi (§4.5).
 *
 * Gagalnya punya dua bentuk 422: bentuk yang salah menyertakan `errors.kode`,
 * sedangkan kode yang keliru atau kedaluwarsa **hanya** menyertakan `message`.
 * Pemanggil harus menangani keduanya.
 */
export const verifikasiKode = (kanal: KanalVerifikasi, kode: string) =>
  post<null>(`/auth/verifikasi-${kanal}`, { kode });

/**
 * Minta kode pemulihan (§4.6).
 *
 * **Selalu 200, termasuk untuk email yang tidak terdaftar.** Membedakan
 * keduanya akan mengubah endpoint ini menjadi alat pemeriksa siapa saja yang
 * punya akun. Tampilkan pesannya apa adanya dan langsung buka layar isi kode.
 */
export const lupaPassword = (email: string) =>
  post<null>("/auth/lupa-password", { email });

/** Seluruh token lama dicabut setelah berhasil — pengguna harus masuk ulang. */
export const resetPassword = (body: PayloadResetPassword) =>
  post<null>("/auth/reset-password", body);

export const ubahProfil = (body: PayloadUbahProfil) =>
  put<User>("/profil", body);

export const ubahPassword = (body: PayloadUbahPassword) =>
  put<null>("/profil/password", body);

/**
 * Perbarui profil beserta avatar (§4.8).
 *
 * Dikirim sebagai `POST` dengan `_method=PUT`, bukan `PUT` sungguhan: PHP tidak
 * mem-parse berkas pada permintaan `PUT`, sehingga avatarnya akan sampai
 * sebagai badan kosong tanpa satu pun galat yang menjelaskan kenapa.
 *
 * Tidak ada endpoint `/profil/avatar` terpisah — avatar adalah salah satu field
 * profil, jadi field lain boleh ikut dikirim dalam permintaan yang sama.
 */
export async function ubahProfilDenganAvatar(
  body: PayloadUbahProfil,
  avatarUri?: string,
) {
  const form = new FormData();
  form.append("_method", "PUT");
  for (const [kunci, nilai] of Object.entries(body)) {
    if (nilai === undefined) continue;
    form.append(kunci, nilai === null ? "" : String(nilai));
  }
  if (avatarUri) await appendFoto(form, "avatar", avatarUri, "avatar.jpg");
  return postMultipart<User>("/profil", form);
}

/** §18.5. Aman dipanggil berulang: token yang sudah ada diperbarui pemiliknya. */
export const daftarkanPerangkat = (body: PayloadPerangkat) =>
  post<null>("/perangkat", body);

/**
 * §18.6. `DELETE` **dengan badan JSON** — axios mengirimkannya lewat `data`.
 *
 * Panggil sebelum `POST /auth/logout`, supaya perangkat berhenti menerima
 * notifikasi milik akun itu.
 */
export const cabutPerangkat = (token: string) =>
  del<null>("/perangkat", { data: { token } });
