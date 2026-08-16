/** Checkout dan pesanan. Rujukan: API-DOCS.md §16.3–§16.10. */

import type {
  ParamsPesanan,
  ParamsPratinjau,
  PayloadCheckout,
  PayloadUlasan,
  PratinjauToko,
  Pesanan,
} from "@/types/pesanan";
import type { Ulasan } from "@/types/produk";
import {
  appendFoto,
  get,
  pastikanHalaman,
  pastikanLarik,
  post,
  postMultipart,
} from "./client";

/**
 * Rincian checkout per toko (§16.3).
 *
 * `data`-nya **array**, satu baris per toko, masing-masing dengan pilihan
 * ongkirnya sendiri. Total yang harus dibayar adalah jumlah seluruh `subtotal`
 * ditambah ongkir yang dipilih untuk **setiap** toko yang dikembalikan.
 *
 * `umkm_ids` menyaring ke toko tertentu dan diserialkan axios menjadi
 * `umkm_ids[]=5&umkm_ids[]=9`, bentuk yang diminta dokumen. Menyaring di sini
 * bukan sekadar kosmetik: ongkir toko yang tidak dipilih tidak perlu ditanyakan
 * ke penyedia sama sekali, dan pembersihan keranjang oleh endpoint ini ikut
 * terbatas pada toko yang diminta.
 *
 * **Array kosong bukan galat** — keranjangnya memang kosong, atau seluruh
 * `umkm_ids` yang diminta sudah tidak ada di sana.
 */
export const pratinjauPesanan = ({ destination_id, umkm_ids }: ParamsPratinjau) =>
  get<unknown>("/pesanan/pratinjau", {
    params: { destination_id, ...(umkm_ids?.length ? { umkm_ids } : {}) },
  }).then((d) => pastikanLarik<PratinjauToko>(d, "GET /pesanan/pratinjau"));

/**
 * Checkout (§16.4).
 *
 * Pathnya `POST /pesanan`, bukan `/checkout`, dan **kembaliannya array** —
 * belanja lintas toko dipecah menjadi beberapa pesanan, masing-masing dengan
 * ongkir dan snap token-nya sendiri. Bahkan untuk satu toko pun bentuknya tetap
 * array; memperlakukannya sebagai objek tunggal menghasilkan `undefined` di
 * setiap field.
 *
 * Keranjang dikosongkan **sebagian** — hanya toko yang benar-benar dipesan.
 * Muat ulang `GET /keranjang` sesudahnya; jangan asumsikan sudah kosong.
 *
 * Tidak ada percobaan ulang otomatis untuk pemanggilan ini — mengulanginya
 * berarti membuat dua pesanan untuk satu perintah pengguna.
 */
export const checkout = (body: PayloadCheckout) =>
  post<unknown>("/pesanan", body).then((d) =>
    pastikanLarik<Pesanan>(d, "POST /pesanan"),
  );

export const daftarPesanan = (params?: ParamsPesanan) =>
  get<unknown>("/pesanan", { params }).then((d) =>
    pastikanHalaman<Pesanan>(d, "GET /pesanan"),
  );

/** Dirujuk lewat `kode` (mis. `PSN-20260314-A7K3M`), bukan id numerik. */
export const detailPesanan = (kode: string) => get<Pesanan>(`/pesanan/${kode}`);

/** Periksa `bisa_dibatalkan` sebelum menampilkan tombolnya. */
export const batalkanPesanan = (kode: string, alasan?: string) =>
  post<Pesanan>(`/pesanan/${kode}/batal`, alasan ? { alasan } : {});

/**
 * Terbitkan snap token baru untuk pesanan yang token lamanya kedaluwarsa.
 *
 * `data` **hanya berisi `snap_token`**, bukan objek pesanan.
 */
export const bayarUlangPesanan = (kode: string) =>
  post<{ snap_token: string }>(`/pesanan/${kode}/bayar-ulang`);

/** Menutup pesanan dan meneruskan dana ke penjual. Hanya untuk status `dikirim`. */
export const terimaPesanan = (kode: string) =>
  post<Pesanan>(`/pesanan/${kode}/terima`);

/**
 * Tulis ulasan (§16.10). Foto opsional.
 *
 * Dikirim sebagai multipart bahkan tanpa foto — peladen menerima keduanya, dan
 * satu jalur lebih sedikit berarti satu bentuk galat lebih sedikit.
 */
export async function kirimUlasan(
  kode: string,
  body: PayloadUlasan,
  fotoUri?: string,
) {
  const form = new FormData();
  form.append("rating", String(body.rating));
  if (body.produk_id != null) form.append("produk_id", String(body.produk_id));
  if (body.komentar) form.append("komentar", body.komentar);
  if (fotoUri) await appendFoto(form, "foto", fotoUri, "ulasan.jpg");
  return postMultipart<Ulasan>(`/pesanan/${kode}/ulasan`, form);
}
