/** Pelaporan sampah. Rujukan: API-DOCS.md §3.4–§3.8 dan §9. */

import type { IsoDateTime, ParamsHalaman } from "./api";
import type { PenggunaRingkas } from "./auth";
import type {
    AlasanRouting,
    StatusLaporan,
    StatusPenugasan,
    StatusProgres,
    SumberInput,
    TipePenanggungJawab,
} from "./enums";
import type { WilayahBertingkat } from "./wilayah";

export type KategoriLaporan = {
  id: number;
  nama: string;
  deskripsi: string | null;
  ikon: string | null;
};

export type FotoLaporan = {
  id: number;
  url: string;
  urutan: number;
};

/**
 * Jejak audit routing. **Selalu hadir sebagai objek**, tapi isinya boleh `null`.
 *
 * Ditentukan peladen dengan urutan tetap, kabupaten terverifikasi → provinsi
 * terverifikasi → desa terverifikasi → fasilitator wilayah. Klien tidak pernah
 * mengirimnya dan tidak boleh menghitung ulang urutannya.
 */
export type PenanggungJawab = {
  tipe: TipePenanggungJawab | null;
  tipe_label: string | null;
  alasan: AlasanRouting | null;
  alasan_label: string | null;
  /** `true` = wilayah pelapor belum bergabung, ditangani fasilitator. */
  butuh_pendampingan: boolean;
};

export type LaporanProgres = {
  id: number;
  catatan: string | null;
  foto_bukti_url: string | null;
  status_progres: StatusProgres;
  status_label: string;
  petugas?: PenggunaRingkas | null;
  created_at: IsoDateTime | null;
};

export type LaporanPenugasan = {
  id: number;
  status: StatusPenugasan;
  status_label: string;
  catatan: string | null;
  ditugaskan_at: IsoDateTime | null;
  petugas?: PenggunaRingkas | null;
  /** Relasi, dimuat pada daftar penugasan petugas (§19.1). */
  laporan?: LaporanRingkas | null;
};

/**
 * Kartu untuk daftar (§3.5).
 *
 * Deskripsi lengkap, riwayat progres, dan rantai wilayah sengaja tidak ikut
 * agar daftar tetap ringan di jaringan seluler. Perhatikan `desa` dan
 * `kabupaten` di sini berupa **nama saja**, bukan objek Wilayah.
 */
export type LaporanRingkas = {
  id: number;
  /** Format `RSK-YYYYMM-XXXXX`. */
  tiket: string;
  judul: string;
  status: StatusLaporan;
  status_label: string;
  status_warna: string;
  latitude: number;
  longitude: number;
  alamat: string | null;
  kategori?: KategoriLaporan | null;
  pelapor?: PenggunaRingkas | null;
  desa?: string | null;
  kabupaten?: string | null;
  /** URL foto pertama. */
  foto_utama?: string | null;
  created_at: IsoDateTime | null;
};

/** Bentuk lengkap (§3.6). */
export type Laporan = {
  id: number;
  tiket: string;
  judul: string;
  deskripsi: string;
  /** Menandai laporan yang didiktekan. */
  deskripsi_sumber: SumberInput;
  status: StatusLaporan;
  status_label: string;
  status_warna: string;
  latitude: number;
  longitude: number;
  alamat: string | null;
  kategori?: KategoriLaporan | null;
  pelapor?: PenggunaRingkas | null;
  /**
   * Selalu ada sebagai objek, tapi **kunci di dalamnya bisa kosong seluruhnya**
   * (`{}`) kalau endpoint tidak memuat satu pun relasi wilayah.
   */
  wilayah: WilayahBertingkat;
  penanggung_jawab: PenanggungJawab;
  is_duplikat: boolean;
  duplikat_of_id: number | null;
  /** Bersyarat, hanya bila endpoint menghitungnya. */
  jumlah_gabungan?: number;
  foto?: FotoLaporan[];
  progres?: LaporanProgres[];
  penugasan?: LaporanPenugasan[];
  /** Bersyarat, hanya setelah `selesai_at` terisi. */
  waktu_respons_jam?: number | null;
  diverifikasi_at: IsoDateTime | null;
  selesai_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
};

/** Body `POST /laporan/cek-duplikat` (§9.4). */
export type PayloadCekDuplikat = {
  latitude: number;
  longitude: number;
  /** Mempersempit kandidat ke kategori yang sama. */
  kategori_id?: number;
};

export type HasilCekDuplikat = {
  ada_kandidat: boolean;
  /** Radius yang dipakai peladen, baku 50 meter. Tampilkan apa adanya. */
  radius_meter: number;
  kandidat: LaporanRingkas[];
};

/**
 * Field `multipart/form-data` untuk `POST /laporan` (§9.5).
 *
 * Bukan tipe body JSON, ia mendokumentasikan nama field yang harus di-`append`
 * ke `FormData`, karena salah nama field di sini menghasilkan galat 422 yang
 * membingungkan. Foto ditangani terpisah oleh pemanggil.
 */
export type FieldBuatLaporan = {
  kategori_id: number;
  /** 5–191 karakter. */
  judul: string;
  /** 10–5000 karakter. */
  deskripsi: string;
  /** Baku `ketik`. Kirim `suara` bila didiktekan. */
  deskripsi_sumber?: SumberInput;
  latitude: number;
  longitude: number;
  /** Hasil reverse geocoding di klien; opsional, maks 255. */
  alamat?: string;
  /** Diisi hanya bila pengguna memilih menggabungkan (§9.4). */
  gabung_ke_id?: number;
};

export type ParamsLaporan = ParamsHalaman & {
  status?: StatusLaporan;
  /** Dicocokkan ke `judul` atau `tiket`. */
  cari?: string;
};
