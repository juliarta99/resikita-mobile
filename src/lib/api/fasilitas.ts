/** Direktori fasilitas, TPS, dan iuran. Rujukan: API-DOCS.md §8 dan §13. */

import type {
    BankSampah,
    BankSampahHarga,
    DetailBankSampah,
    KeanggotaanTps,
    ParamsDirektori,
    ParamsHargaSampah,
    ParamsTps,
    Tps,
    TpsIuran,
} from "@/types/fasilitas";
import { get, pastikanHalaman, post } from "./client";

/**
 * Daftar bank sampah (§8.3).
 *
 * Tidak ada endpoint `/terdekat` terpisah: kirim `latitude` dan `longitude` ke
 * endpoint yang sama, dan peladen mengurutkan dari yang terdekat sekaligus
 * memunculkan kunci `jarak_km`. Tanpa koordinat, `jarak_km` **tidak ada sama
 * sekali**, bukan `null`.
 */
export const daftarBankSampah = (params?: ParamsDirektori) =>
  get<unknown>("/direktori/bank-sampah", { params }).then((d) =>
    pastikanHalaman<BankSampah>(d, "GET /direktori/bank-sampah"),
  );

/**
 * Detail bank sampah beserta katalog harganya (§8.4).
 *
 * Bentuk `data`-nya berbeda dari endpoint detail lain: ia membungkus dua kunci,
 * `bank_sampah` dan `harga`. Katalog harga **tidak punya endpoint sendiri**,
 * ia datang sekaligus di sini. Jangan menambahkan panggilan kedua untuk harga;
 * ketiadaan endpoint itulah yang dulu membuat layar detail selalu melaporkan
 * "katalog harga gagal dimuat".
 *
 * Kembaliannya dinormalkan supaya pemanggil selalu menerima dua kunci itu,
 * termasuk ketika peladen mengirim objek bank sampah telanjang tanpa bungkus.
 */
export const detailBankSampah = (id: number) =>
  get<unknown>(`/direktori/bank-sampah/${id}`).then(normalkanDetail);

function normalkanDetail(muatan: unknown): DetailBankSampah {
  const objek = (muatan ?? {}) as Record<string, unknown>;
  const bungkus = objek.bank_sampah as BankSampah | undefined;
  return {
    bank_sampah: bungkus ?? (objek as unknown as BankSampah),
    harga: Array.isArray(objek.harga) ? (objek.harga as BankSampahHarga[]) : [],
  };
}

/**
 * Perbandingan harga lintas bank sampah (§8.7).
 *
 * Berbeda dari §8.4, di sini relasi `bank_sampah` ikut dimuat pada tiap baris,
 * satu daftar memuat harga dari banyak unit sekaligus.
 */
export const hargaSampah = (params?: ParamsHargaSampah) =>
  get<unknown>("/harga-sampah", { params }).then((d) =>
    pastikanHalaman<BankSampahHarga>(d, "GET /harga-sampah"),
  );

export const daftarTps = (params?: ParamsTps) =>
  get<unknown>("/direktori/tps", { params }).then((d) =>
    pastikanHalaman<Tps>(d, "GET /direktori/tps"),
  );

export const detailTps = (id: number) => get<Tps>(`/direktori/tps/${id}`);

/**
 * Keanggotaan TPS beserta 12 tagihan terakhir (§13.1).
 *
 * `null` berarti belum menjadi anggota, keadaan normal, bukan galat. Peladen
 * tetap menjawab `200`, jadi periksa nilainya, jangan menangkapnya sebagai
 * kegagalan permintaan.
 */
export const keanggotaanTps = () =>
  get<KeanggotaanTps | null>("/tps/keanggotaan-saya");

/** §13.2. `data` membungkus kunci `tps`, bukan objek TPS langsung. */
export const gabungTps = (id: number) =>
  post<{ tps: Tps }>(`/tps/${id}/gabung`);

export const keluarTps = () => post<null>("/tps/keluar");

/**
 * Bayar iuran (§13.4).
 *
 * Tanpa badan permintaan, dan **selalu memotong saldo Resikita**, endpoint ini
 * tidak menerbitkan snap token Midtrans, jadi tidak ada pilihan metode yang
 * bisa dikirim. Segarkan saldo dan keanggotaan setelah berhasil.
 */
export const bayarIuran = (id: number) =>
  post<TpsIuran>(`/tps/iuran/${id}/bayar`);

/** Dipakai layar peta yang butuh larik telanjang, bukan halaman. */
export const bankSampahSekitar = (params: ParamsDirektori) =>
  daftarBankSampah(params).then((h) => h.data);

export const tpsSekitar = (params: ParamsTps) =>
  daftarTps(params).then((h) => h.data);
