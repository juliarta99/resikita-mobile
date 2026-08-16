/** Marketplace: UMKM, produk, ulasan, keranjang, ongkir. Rujukan: §3.16, §8.5, §14–§16. */

import type {
  IsoDateTime,
  ParamsHalaman,
  ParamsLokasi,
  Rupiah,
} from "./api";
import type { PenggunaRingkas } from "./auth";
import type { StatusUmkm } from "./enums";
import type { Wilayah } from "./wilayah";

export type Umkm = {
  id: number;
  nama: string;
  deskripsi: string | null;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  /** Namanya `foto_url`, bukan `logo_url`. */
  foto_url: string | null;
  status: StatusUmkm;
  status_label: string;
  is_verified: boolean;
  wilayah?: Wilayah | null;
  jumlah_produk?: number;
  /** Satu desimal. */
  rating_rata?: number | null;
  jumlah_ulasan?: number;
  jarak_km?: number;
};

export type KategoriProduk = {
  id: number;
  nama: string;
  /** **Penyaring `GET /produk?kategori=` memakai slug, bukan id.** */
  slug: string;
  ikon?: string | null;
  jumlah_produk?: number;
};

export type FotoProduk = {
  id: number;
  url: string;
  is_utama: boolean;
};

export type Produk = {
  id: number;
  nama: string;
  /** Kunci rute — `GET /produk/{slug}`, bukan `{id}`. */
  slug: string;
  deskripsi: string | null;
  harga: Rupiah;
  stok: number;
  /**
   * `is_active && stok > 0`, dihitung peladen.
   *
   * **Dasar mengaktifkan tombol beli.** Menghitung `stok > 0` sendiri
   * melewatkan produk yang stoknya ada tapi sedang dinonaktifkan penjual.
   */
  tersedia: boolean;
  berat_gram: number;
  /** Asal bahan daur ulang — bagian dari nilai jual, bukan sekadar metadata. */
  bahan_baku: string | null;
  kategori?: KategoriProduk | null;
  umkm?: Umkm | null;
  /** Hanya pada daftar dan isi keranjang; **tidak ada** di detail produk. */
  foto_utama_url?: string | null;
  /** Hanya pada detail produk; ambil elemen `is_utama` sebagai foto sampul. */
  foto?: FotoProduk[];
  rating_rata?: number | null;
  jumlah_ulasan?: number;
};

export type ParamsProduk = ParamsHalaman & {
  /** **Slug** kategori, bukan id. */
  kategori?: string;
  umkm_id?: number;
  /** Dicocokkan ke `nama` atau `bahan_baku`. */
  cari?: string;
  harga_min?: Rupiah;
  harga_maks?: Rupiah;
  urut?: "termurah" | "termahal" | "terlaris";
};

export type ParamsUmkm = ParamsHalaman &
  ParamsLokasi & {
    cari?: string;
    wilayah_id?: number;
  };

export type Ulasan = {
  id: number;
  rating: number;
  komentar: string | null;
  foto_url: string | null;
  penulis?: PenggunaRingkas | null;
  produk_id: number | null;
  created_at: IsoDateTime | null;
};

// ---- Keranjang (§15) ----

export type ItemKeranjang = {
  /** Id baris keranjang. Untuk menghapus dipakai `produk.slug`, bukan ini. */
  id: number;
  qty: number;
  /** `harga × qty`. Pratinjau — total yang mengikat datang dari checkout. */
  subtotal: Rupiah;
  produk: Produk;
};

/**
 * Isi keranjang milik satu toko.
 *
 * Peladen mengelompokkan keranjang per toko sejak awal, supaya pengguna melihat
 * bahwa belanja dari tiga toko berarti tiga ongkos kirim — bukan terkejut di
 * layar pembayaran.
 */
export type KelompokKeranjang = {
  umkm: Umkm;
  subtotal: Rupiah;
  /** Total berat toko ini, dihitung peladen. Dasar hitung ongkir. */
  berat_gram: number;
  item: ItemKeranjang[];
};

export type Keranjang = {
  toko: KelompokKeranjang[];
  /** Jumlah **kuantitas**, bukan jumlah baris. */
  total_item: number;
  /** Jumlah seluruh subtotal, **tanpa ongkir**. */
  total_belanja: Rupiah;
};

/** Body `POST /keranjang` dan `PUT /keranjang` (§15.2–§15.3). */
export type PayloadKeranjang = {
  /** **Id produk**, bukan slug. */
  produk_id: number;
  /** 1–99. Pada `POST` ditambahkan, pada `PUT` menimpa. */
  qty: number;
};

/** `data` ringkas yang dikembalikan seluruh mutasi keranjang. */
export type RingkasKeranjang = {
  total_item: number;
};

// ---- Ongkir (§16.1–§16.2) ----

/**
 * Satu alamat tujuan dari RajaOngkir V2, diteruskan **apa adanya** oleh peladen.
 *
 * Bentuknya mengikuti penyedia, jadi kunci di luar yang disebut di sini bisa
 * berubah tanpa pemberitahuan. Yang boleh diandalkan hanya `id` dan `label`.
 */
export type TujuanOngkir = {
  /** **Inilah `destination_id`** yang dipakai di seluruh alur berikutnya. */
  id: number;
  /** Alamat lengkap siap tampil di pemilih. */
  label: string;
  subdistrict_name?: string;
  district_name?: string;
  city_name?: string;
  province_name?: string;
  zip_code?: string;
};

export type OpsiOngkir = {
  /** Kode kurir, mis. `jne`. */
  kurir: string;
  /** Kode layanan, mis. `REG`. */
  layanan: string;
  /** Nama layanan siap tampil. */
  deskripsi: string;
  biaya: Rupiah;
  /** Perkiraan hari, mis. `2-3` atau `-`. */
  estimasi: string;
};

/** Body `POST /ongkir/hitung` (§16.2). */
export type PayloadOngkir = {
  destination_id: number;
  /** 1–1.000.000. Peladen sudah membulatkan ke kilogram; jangan ikut menghitung. */
  berat_gram: number;
  /** Dipisah titik dua, mis. `jne:jnt`. Baku `jne:jnt:sicepat:pos`. */
  kurir?: string;
};
