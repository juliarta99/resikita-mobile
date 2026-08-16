/** Data publik tanpa autentikasi. Rujukan: API-DOCS.md §13. */

import type { StatistikPublik, TitikPeta } from "@/types/publik";
import type { Wilayah } from "@/types/wilayah";
import { get, pastikanLarik } from "./client";

/**
 * Ringkasan nasional untuk beranda.
 *
 * Di-cache 15 menit di peladen, jadi `staleTime` di sisi klien sebaiknya
 * mengikuti angka yang sama — memanggil lebih sering hanya menghabiskan kuota
 * untuk jawaban yang identik.
 */
export const statistikPublik = () => get<StatistikPublik>("/publik/statistik");

/**
 * Titik fasilitas untuk peta.
 *
 * Hanya bank sampah, TPS, dan TPS3R. Titik laporan sengaja tidak ada di sini:
 * koordinat laporan menunjuk tempat yang bisa jadi halaman rumah seseorang.
 */
export const titikPeta = () =>
  get<{ titik?: TitikPeta[] }>("/publik/peta").then((d) =>
    pastikanLarik<TitikPeta>(d?.titik ?? d, "GET /publik/peta"),
  );

/** Wilayah yang pemerintahnya sudah bergabung. */
export const wilayahTerdaftar = () =>
  get<unknown>("/publik/wilayah-terdaftar").then((d) =>
    pastikanLarik<Wilayah>(d, "GET /publik/wilayah-terdaftar"),
  );
