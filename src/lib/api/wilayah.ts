/**
 * Wilayah dan pengajuan wilayah. Rujukan: API-DOCS.md §5.
 *
 * Seluruh endpoint di sini terbuka tanpa token, layar pendaftaran perlu
 * memilih domisili sebelum akunnya ada, dan formulir pengajuan wilayah dipakai
 * pejabat daerah yang justru belum punya akun.
 */

import type {
    ParamsCariWilayah,
    ParamsWilayah,
    ParamsWilayahTerdekat,
    ResolusiWilayah,
    Wilayah,
} from "@/types/wilayah";
import { get, pastikanHalaman, pastikanLarik, post } from "./client";

/** Tingkat teratas pemilih bertingkat empat. Tidak berhalaman. */
export const daftarProvinsi = () =>
  get<unknown>("/wilayah/provinsi").then((d) =>
    pastikanLarik<Wilayah>(d, "GET /wilayah/provinsi"),
  );

/**
 * Anak langsung dari satu wilayah.
 *
 * Inilah satu-satunya cara memuat tingkat di bawahnya. Data desa seluruh
 * Indonesia sekitar 84.000 baris, memuatnya sekaligus bukan sekadar lambat,
 * ia akan menghabiskan memori perangkat kelas bawah.
 */
export const anakWilayah = (id: number) =>
  get<unknown>(`/wilayah/${id}/anak`).then((d) =>
    pastikanLarik<Wilayah>(d, "GET /wilayah/{id}/anak"),
  );

/** Detail satu wilayah, dengan `parent` dua tingkat ke atas. */
export const detailWilayah = (id: number) => get<Wilayah>(`/wilayah/${id}`);

/** `q` 3–100 karakter. Melintasi seluruh tingkat, maksimal 30 hasil. */
export const cariWilayah = (params: ParamsCariWilayah) =>
  get<unknown>("/wilayah/cari", { params }).then((d) =>
    pastikanLarik<Wilayah>(d, "GET /wilayah/cari"),
  );

/** Sepuluh wilayah terdekat dari sebuah koordinat. Usulan, bukan keputusan. */
export const wilayahTerdekat = (params: ParamsWilayahTerdekat) =>
  get<unknown>("/wilayah/terdekat", { params }).then((d) =>
    pastikanLarik<Wilayah>(d, "GET /wilayah/terdekat"),
  );

/**
 * Terjemahkan koordinat menjadi empat tingkat wilayah.
 *
 * Panggil ini **sebelum** mengirim laporan supaya pelapor bisa membetulkan
 * titiknya kalau meleset. Logikanya sama persis dengan yang dipakai peladen
 * saat laporan disimpan, jadi apa yang diperlihatkan tidak mungkin berbeda
 * dari apa yang tersimpan.
 *
 * `ditemukan: false` dengan keempat kunci `null` berarti titik itu di luar
 * jangkauan data wilayah. Laporan dari sana tetap boleh dikirim, penanganannya
 * jatuh ke fasilitator wilayah.
 */
export const resolusiWilayah = (latitude: number, longitude: number) =>
  post<ResolusiWilayah>("/wilayah/resolusi", { latitude, longitude });

export const daftarWilayah = (params?: ParamsWilayah) =>
  get<unknown>("/wilayah", { params }).then((d) =>
    pastikanHalaman<Wilayah>(d, "GET /wilayah"),
  );
