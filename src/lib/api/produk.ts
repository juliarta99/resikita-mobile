/** Marketplace: UMKM, katalog, keranjang, ongkir. Rujukan: API-DOCS.md §8.5, §14–§16. */

import type { ParamsHalaman } from "@/types/api";
import type {
    KategoriProduk,
    Keranjang,
    OpsiOngkir,
    ParamsProduk,
    ParamsUmkm,
    PayloadKeranjang,
    PayloadOngkir,
    Produk,
    RingkasKeranjang,
    TujuanOngkir,
    Ulasan,
    Umkm,
} from "@/types/produk";
import { del, get, pastikanHalaman, pastikanLarik, post, put } from "./client";

// ---- Direktori UMKM (§8.5–§8.6) ----

/**
 * Daftar UMKM.
 *
 * Pathnya di bawah prefix `/direktori`, sama seperti TPS dan bank sampah,
 * `/umkm` telanjang tidak pernah ada dan menjawab `404`, yang di layar tampak
 * seperti "belum ada UMKM terdaftar" alih-alih seperti salah alamat.
 */
export const daftarUmkm = (params?: ParamsUmkm) =>
  get<unknown>("/direktori/umkm", { params }).then((d) =>
    pastikanHalaman<Umkm>(d, "GET /direktori/umkm"),
  );

/** Detail UMKM. Untuk daftar produknya, panggil `daftarProduk({ umkm_id })`. */
export const detailUmkm = (id: number) => get<Umkm>(`/direktori/umkm/${id}`);

// ---- Katalog (§14) ----

export const daftarProduk = (params?: ParamsProduk) =>
  get<unknown>("/produk", { params }).then((d) =>
    pastikanHalaman<Produk>(d, "GET /produk"),
  );

/** Kunci rutenya `slug`, bukan `id`. */
export const detailProduk = (slug: string) => get<Produk>(`/produk/${slug}`);

export const kategoriProduk = () =>
  get<unknown>("/produk/kategori").then((d) =>
    pastikanLarik<KategoriProduk>(d, "GET /produk/kategori"),
  );

export const ulasanProduk = (slug: string, params?: ParamsHalaman) =>
  get<unknown>(`/produk/${slug}/ulasan`, { params }).then((d) =>
    pastikanHalaman<Ulasan>(d, "GET /produk/{slug}/ulasan"),
  );

// ---- Keranjang (§15) ----

/**
 * Isi keranjang, sudah dikelompokkan per toko oleh peladen.
 *
 * Tiap pemanggilan membersihkan lebih dulu baris yang produknya dinonaktifkan
 * atau kehabisan stok, jadi isinya bisa berubah tanpa pengguna melakukan apa
 * pun. Nilai cadangan di bawah menjaga layar tetap hidup bila keranjangnya
 * kosong dan peladen mengirim `data: null`.
 */
export const keranjang = () =>
  get<Partial<Keranjang> | null>("/keranjang").then(
    (d): Keranjang => ({
      toko: pastikanLarik(d?.toko, "GET /keranjang.toko"),
      total_item: d?.total_item ?? 0,
      total_belanja: d?.total_belanja ?? 0,
    }),
  );

/** Kuantitas **ditambahkan** ke yang sudah ada, bukan menimpa. */
export const tambahKeKeranjang = (body: PayloadKeranjang) =>
  post<RingkasKeranjang>("/keranjang", body);

/**
 * Ubah kuantitas, `qty` **menimpa** nilai lama.
 *
 * Dikirim ke `/keranjang` tanpa id di path: yang dipakai peladen untuk mencari
 * barisnya adalah `produk_id` di badan, bukan id baris keranjang.
 */
export const ubahQtyKeranjang = (body: PayloadKeranjang) =>
  put<RingkasKeranjang>("/keranjang", body);

/**
 * Keluarkan satu produk.
 *
 * **Kunci URL-nya slug produk**, bukan id baris keranjang, bukan id produk.
 * Ketiganya angka atau teks yang mirip, dan salah satu di antaranya menghasilkan
 * `404` yang tampak seperti "produk sudah terhapus".
 */
export const hapusDariKeranjang = (slug: string) =>
  del<RingkasKeranjang>(`/keranjang/${slug}`);

export const kosongkanKeranjang = () => del<null>("/keranjang");

// ---- Ongkir (§16.1–§16.2) ----

/**
 * Cari alamat tujuan pengiriman.
 *
 * Query-nya bernama `cari`, minimal 3 huruf. Nama query yang keliru tidak
 * ditolak peladen, ia hanya diabaikan, pencariannya berjalan tanpa kata kunci,
 * dan hasilnya kosong. Itulah yang dulu tampil sebagai "lokasi tidak ditemukan"
 * untuk kata kunci yang sebenarnya benar.
 *
 * Hasilnya diteruskan apa adanya dari RajaOngkir V2 dan di-cache satu hari di
 * peladen. `503` berarti penyedianya sedang mati, bukan alamatnya tidak ada,
 * bedakan keduanya saat menampilkan pesan.
 */
export const cariTujuanOngkir = (cari: string) =>
  get<unknown>("/ongkir/tujuan", { params: { cari } }).then((d) =>
    pastikanLarik<TujuanOngkir>(d, "GET /ongkir/tujuan"),
  );

/**
 * Hitung ongkir satu paket.
 *
 * Jalur pintas untuk tombol "cek ongkir" di halaman produk; **tidak wajib**
 * dalam alur checkout, yang memakai `GET /pesanan/pratinjau` supaya tiap toko
 * mendapat pilihan ongkirnya sendiri.
 */
export const hitungOngkir = (body: PayloadOngkir) =>
  post<unknown>("/ongkir/hitung", body).then((d) =>
    pastikanLarik<OpsiOngkir>(d, "POST /ongkir/hitung"),
  );
