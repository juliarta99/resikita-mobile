/**
 * Area petugas lapangan. Rujukan: API-DOCS.md §19.
 *
 * Seluruh endpoint menuntut role `petugas`. Peladen tetap memeriksanya; gerbang
 * di klien hanya menentukan apa yang tampak, bukan apa yang diizinkan.
 */

import type {
    Laporan,
    LaporanPenugasan,
    LaporanProgres,
} from "@/types/laporan";
import type { FieldProgresPenugasan, ParamsPenugasan } from "@/types/petugas";
import { appendFoto, get, pastikanHalaman, postMultipart } from "./client";

/**
 * Daftar penugasan saya (§19.1).
 *
 * `hanya_aktif` baku `true` di peladen. Untuk melihat riwayat lengkap, kirim
 * `0`, nilai boolean JavaScript diserialkan axios sebagai `true`/`false`, yang
 * juga diterima Laravel, tapi angka lebih aman lintas versi.
 */
export const daftarPenugasan = (params?: ParamsPenugasan) =>
  get<unknown>("/petugas/penugasan", {
    params: {
      ...params,
      hanya_aktif:
        params?.hanya_aktif === undefined
          ? undefined
          : params.hanya_aktif
            ? 1
            : 0,
    },
  }).then((d) =>
    pastikanHalaman<LaporanPenugasan>(d, "GET /petugas/penugasan"),
  );

/**
 * Detail laporan yang ditugaskan (§19.2).
 *
 * **Kuncinya id laporan, bukan id penugasan**, ambil dari `laporan.id` pada
 * daftar. Keduanya angka, jadi salah pilih menghasilkan `403` yang terbaca
 * seperti masalah izin padahal cuma salah nomor.
 */
export const detailPenugasan = (laporanId: number) =>
  get<Laporan>(`/petugas/penugasan/${laporanId}`);

/**
 * Catat progres (§19.3).
 *
 * Satu endpoint untuk dua peristiwa. `status_progres: "selesai"` **mengubah
 * status laporan induk menjadi selesai** sekaligus, jadi tidak ada endpoint
 * `/mulai` atau `/selesai` terpisah, muat ulang detail laporan sesudahnya.
 *
 * Foto bukti wajib saat menyelesaikan, dan peladen memvalidasinya dua kali.
 */
export async function kirimProgresPenugasan(
  laporanId: number,
  field: FieldProgresPenugasan,
  fotoUri?: string,
) {
  const form = new FormData();
  form.append("status_progres", field.status_progres);
  if (field.catatan) form.append("catatan", field.catatan);
  if (field.latitude != null) form.append("latitude", String(field.latitude));
  if (field.longitude != null)
    form.append("longitude", String(field.longitude));
  if (fotoUri) await appendFoto(form, "foto_bukti", fotoUri, "bukti.jpg");
  return postMultipart<LaporanProgres>(
    `/petugas/penugasan/${laporanId}/progres`,
    form,
  );
}
