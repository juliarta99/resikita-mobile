/** Pelaporan sampah. Rujukan: API-DOCS.md §9. */

import type {
  FieldBuatLaporan,
  HasilCekDuplikat,
  KategoriLaporan,
  Laporan,
  LaporanRingkas,
  ParamsLaporan,
  PayloadCekDuplikat,
} from "@/types/laporan";
import {
  appendFoto,
  get,
  pastikanHalaman,
  pastikanLarik,
  post,
  postMultipart,
} from "./client";

export const kategoriLaporan = () =>
  get<unknown>("/laporan/kategori").then((d) =>
    pastikanLarik<KategoriLaporan>(d, "GET /laporan/kategori"),
  );

/**
 * Cari laporan kembar sebelum menyimpan (§9.4).
 *
 * Sistem tidak pernah menolak laporan kedua — ia menawarkan penggabungan, dan
 * pengguna yang memutuskan. Menyertakan `kategori_id` mempersempit kandidat ke
 * masalah yang benar-benar sejenis.
 */
export const cekDuplikat = (body: PayloadCekDuplikat) =>
  post<HasilCekDuplikat>("/laporan/cek-duplikat", body);

/**
 * Kirim laporan baru (§9.5).
 *
 * Seluruh nilai diubah jadi string karena `FormData` memang hanya mengenal
 * string — termasuk koordinat, yang di versi lama sempat dikirim sebagai `lat`
 * dan `lng` dan ditolak peladen tanpa penjelasan yang jelas.
 *
 * Fotonya opsional di kontrak, maksimal 5 berkas, dan field-nya bernama
 * `foto[]`.
 */
export async function buatLaporan(field: FieldBuatLaporan, fotos: string[]) {
  const form = new FormData();
  for (const [kunci, nilai] of Object.entries(field)) {
    if (nilai !== undefined && nilai !== null) form.append(kunci, String(nilai));
  }
  for (let i = 0; i < fotos.length; i++) {
    await appendFoto(form, "foto[]", fotos[i], `foto${i}.jpg`);
  }
  return postMultipart<Laporan>("/laporan", form);
}

/**
 * Daftar laporan sesuai cakupan pemanggil (§9.3).
 *
 * Cakupannya ditentukan peladen dari role dan wilayah pengguna, **bukan** dari
 * parameter: untuk `masyarakat` ia berisi laporan miliknya sendiri, untuk
 * `petugas` hanya yang ditugaskan padanya. Tidak ada `/laporan/saya` maupun
 * `/laporan/publik` — satu endpoint ini melayani semuanya.
 */
export const daftarLaporan = (params?: ParamsLaporan) =>
  get<unknown>("/laporan", { params }).then((d) =>
    pastikanHalaman<LaporanRingkas>(d, "GET /laporan"),
  );

/**
 * Detail laporan (§9.2).
 *
 * **Terbuka tanpa token.** Siapa pun boleh melihat laporan warga lain — itu
 * bagian dari transparansi yang membuat penanganan yang mandek terlihat publik.
 */
export const detailLaporan = (id: number) => get<Laporan>(`/laporan/${id}`);
