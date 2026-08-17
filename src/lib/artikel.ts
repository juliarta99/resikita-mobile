/** Penyeragam bentuk artikel. Rujukan: API-DOCS.md §3.18 dan §7. */

import type { KategoriArtikel } from "@/types/artikel";

/**
 * Nama kategori sebuah artikel, apa pun bentuk yang dikirim endpointnya.
 *
 * Daftar mengirim `kategori` sebagai **string nama**, detail mengirimnya
 * sebagai objek `{ id, nama, slug }`. Perbedaan itu memang disengaja peladen,
 * daftar dibuat seringan mungkin, tapi ia jadi jebakan di klien: kartu yang
 * ditulis untuk bentuk detail (`kategori.nama`) menghasilkan `undefined` di
 * atas data daftar, dan lencananya tampil sebagai kotak berwarna tanpa teks.
 * Bukan galat, bukan pula layar kosong: justru karena itu ia bertahan lama.
 *
 * Nilai kosong dikembalikan sebagai `null`, bukan string kosong, supaya
 * pemanggil bisa memilih menyembunyikan lencananya sama sekali.
 */
export function namaKategori(
  kategori: string | KategoriArtikel | null | undefined,
): string | null {
  if (!kategori) return null;
  if (typeof kategori === "string") return kategori.trim() || null;
  return kategori.nama?.trim() || null;
}

/**
 * Nama tampilan untuk tipe konten yang tidak dikirimi `tipe_label`.
 *
 * Hanya empat nilai enum §2 yang sah. Nilai di luar itu tetap ditampilkan apa
 * adanya, lebih baik pembaca melihat istilah asing daripada lencananya hilang
 * diam-diam saat peladen menambah tipe baru.
 */
const LABEL_TIPE: Record<string, string> = {
  artikel: "Artikel",
  panduan: "Panduan",
  tutorial: "Tutorial",
  jurnal: "Jurnal",
};

/**
 * Label tipe konten siap tampil.
 *
 * `tipe_label` dari peladen selalu didahulukan supaya sebutannya seragam
 * dengan web; peta lokal di atas hanya cadangan bila kuncinya tidak terkirim.
 */
export function labelTipe(a: {
  tipe?: string | null;
  tipe_label?: string | null;
}): string | null {
  const dariPeladen = a.tipe_label?.trim();
  if (dariPeladen) return dariPeladen;

  const tipe = a.tipe?.trim();
  if (!tipe) return null;
  return LABEL_TIPE[tipe.toLowerCase()] ?? tipe;
}
