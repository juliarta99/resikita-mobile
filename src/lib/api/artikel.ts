/** Artikel edukasi. Rujukan: API-DOCS.md §7. */

import type {
  Artikel,
  ArtikelRingkas,
  KategoriArtikel,
  ParamsArtikel,
  TeksBaca,
} from "@/types/artikel";
import { get, pastikanHalaman, pastikanLarik } from "./client";

/**
 * Daftar artikel terbit.
 *
 * Yang dikembalikan adalah bentuk **ringkas**: `cuplikan` menggantikan `konten`,
 * dan `kategori` berupa nama saja. Kalau layar butuh isi lengkapnya, ia harus
 * membuka detail — daftar sengaja dibuat ringan untuk jaringan seluler.
 */
export const daftarArtikel = (params?: ParamsArtikel) =>
  get<unknown>("/artikel", {
    params: params?.unggulan ? { ...params, unggulan: 1 } : params,
  }).then((d) => pastikanHalaman<ArtikelRingkas>(d, "GET /artikel"));

export const kategoriArtikel = () =>
  get<unknown>("/artikel/kategori").then((d) =>
    pastikanLarik<KategoriArtikel>(d, "GET /artikel/kategori"),
  );

/** Kunci URL-nya `slug`. Memanggilnya menaikkan penghitung `dilihat`. */
export const detailArtikel = (slug: string) => get<Artikel>(`/artikel/${slug}`);

/**
 * Teks bersih untuk dibacakan TTS.
 *
 * Panggil hanya saat pemutar suara benar-benar dinyalakan — pemanggilannya
 * sekaligus mencatat pemakaian fitur suara, jadi memuatnya di awal bersama
 * detail artikel akan menggelembungkan metrik dengan pengguna yang tidak pernah
 * menekan tombol putar.
 */
export const teksBacaArtikel = (slug: string) =>
  get<TeksBaca>(`/artikel/${slug}/teks-baca`);
