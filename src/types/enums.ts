/**
 * Enum yang dipakai lintas endpoint. Rujukan: API-DOCS.md §2.
 *
 * Ditulis sebagai larik `as const` lalu diturunkan jadi union literal, bukan
 * `enum` TypeScript. Alasannya: larik ini juga dibutuhkan saat *runtime* untuk
 * merender daftar chip penyaring dan memvalidasi nilai yang datang dari API.
 * Kalau union-nya ditulis terpisah dari daftarnya, keduanya akan menyimpang.
 *
 * **Keputusan tampilan diambil dari nilai enum, bukan dari `*_label`.** Label
 * boleh berubah kapan saja tanpa dianggap perubahan kontrak (§2).
 */

export const KATEGORI_SAMPAH = [
  "organik",
  "anorganik",
  "b3",
  "residu",
  "elektronik",
] as const;
export type KategoriSampah = (typeof KATEGORI_SAMPAH)[number];

export const STATUS_LAPORAN = [
  "baru",
  "diverifikasi",
  "ditugaskan",
  "dikerjakan",
  "selesai",
  "ditolak",
  "digabung",
] as const;
export type StatusLaporan = (typeof STATUS_LAPORAN)[number];

/** Status yang ikut diperiksa saat mencari laporan kembar (§2.2). */
export const STATUS_LAPORAN_AKTIF: StatusLaporan[] = [
  "baru",
  "diverifikasi",
  "ditugaskan",
  "dikerjakan",
];

export const ALASAN_ROUTING = [
  "kabupaten_terverifikasi",
  "provinsi_terverifikasi",
  "desa_terverifikasi",
  "wilayah_belum_terjangkau",
] as const;
export type AlasanRouting = (typeof ALASAN_ROUTING)[number];

export const TIPE_PENANGGUNG_JAWAB = [
  "admin_kabupaten",
  "admin_provinsi",
  "kepala_desa",
  "fasilitator_wilayah",
] as const;
export type TipePenanggungJawab = (typeof TIPE_PENANGGUNG_JAWAB)[number];

export const TINGKAT_WILAYAH = [
  "provinsi",
  "kabupaten",
  "kecamatan",
  "desa",
] as const;
export type TingkatWilayah = (typeof TINGKAT_WILAYAH)[number];

export const STATUS_REGISTRASI_WILAYAH = [
  "belum_terjangkau",
  "diajukan",
  "terverifikasi",
  "ditolak",
] as const;
export type StatusRegistrasiWilayah =
  (typeof STATUS_REGISTRASI_WILAYAH)[number];

export const STATUS_PESANAN = [
  "menunggu_bayar",
  "dibayar",
  "dikemas",
  "dikirim",
  "selesai",
  "dibatalkan",
] as const;
export type StatusPesanan = (typeof STATUS_PESANAN)[number];

export const TIPE_TRANSAKSI_DOMPET = [
  "setor",
  "belanja",
  "penarikan",
  "refund",
  "iuran",
] as const;
export type TipeTransaksiDompet = (typeof TIPE_TRANSAKSI_DOMPET)[number];

export const METODE_BAYAR = ["saldo", "midtrans"] as const;
export type MetodeBayar = (typeof METODE_BAYAR)[number];

export const STATUS_SETORAN = ["proses", "selesai", "batal"] as const;
export type StatusSetoran = (typeof STATUS_SETORAN)[number];

export const STATUS_PENARIKAN = [
  "menunggu",
  "disetujui",
  "ditolak",
  "selesai",
] as const;
export type StatusPenarikan = (typeof STATUS_PENARIKAN)[number];

export const STATUS_IURAN = ["menunggu", "lunas", "gagal"] as const;
export type StatusIuran = (typeof STATUS_IURAN)[number];

export const STATUS_PENUGASAN = [
  "ditugaskan",
  "dikerjakan",
  "selesai",
  "dibatalkan",
] as const;
export type StatusPenugasan = (typeof STATUS_PENUGASAN)[number];

export const STATUS_PROGRES = ["dikerjakan", "selesai"] as const;
export type StatusProgres = (typeof STATUS_PROGRES)[number];

export const JENIS_TPS = ["tps", "tps3r"] as const;
export type JenisTps = (typeof JENIS_TPS)[number];

export const TIPE_ARTIKEL = [
  "artikel",
  "panduan",
  "tutorial",
  "jurnal",
] as const;
export type TipeArtikel = (typeof TIPE_ARTIKEL)[number];

export const SUMBER_INPUT = ["ketik", "suara"] as const;
export type SumberInput = (typeof SUMBER_INPUT)[number];

export const JENIS_KELAMIN = ["L", "P"] as const;
export type JenisKelamin = (typeof JENIS_KELAMIN)[number];

export const PERAN_CHAT = ["user", "model"] as const;
export type PeranChat = (typeof PERAN_CHAT)[number];

export const PLATFORM_PERANGKAT = ["android", "ios", "web"] as const;
export type PlatformPerangkat = (typeof PLATFORM_PERANGKAT)[number];

export const CHANNEL_NOTIFIKASI = ["inapp", "wa"] as const;
export type ChannelNotifikasi = (typeof CHANNEL_NOTIFIKASI)[number];

export const STATUS_NOTIFIKASI = ["terkirim", "gagal", "dibaca"] as const;
export type StatusNotifikasi = (typeof STATUS_NOTIFIKASI)[number];

export const STATUS_UMKM = ["menunggu", "aktif", "ditolak"] as const;
export type StatusUmkm = (typeof STATUS_UMKM)[number];

/**
 * Penjaga tipe untuk nilai yang datang dari API.
 *
 * Kategori di luar lima nilai itu adalah bug peladen yang harus dilaporkan,
 * **bukan** ditangani diam-diam di klien. Fungsi ini ada supaya lapis API bisa
 * mengenali kejadian itu dan berisik soal itu, bukan supaya layar bisa memilih
 * perilaku cadangannya sendiri.
 */
export function isKategoriSampah(nilai: string): nilai is KategoriSampah {
  return (KATEGORI_SAMPAH as readonly string[]).includes(nilai);
}
