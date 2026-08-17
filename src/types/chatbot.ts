/** Chatbot literasi lingkungan. Rujukan: API-DOCS.md §3.10 dan §11. */

import type { IsoDateTime, ParamsHalaman } from "./api";
import type { PeranChat, SumberInput } from "./enums";

export type PesanChat = {
  id: number;
  /** `model` adalah balasan asisten. */
  role: PeranChat;
  /**
   * Teks polos. Tanpa judul markdown, tabel, atau blok kode, sengaja, supaya
   * aman langsung disuapkan ke TTS tanpa pembersihan tambahan.
   */
  konten: string;
  /** `null` pada balasan model, hanya pesan pengguna yang punya asal masukan. */
  sumber_input: SumberInput | null;
  dibacakan: boolean;
  created_at: IsoDateTime | null;
};

export type SesiChat = {
  id: number;
  /** Baku `Percakapan Baru`, diperbarui otomatis dari pertanyaan pertama. */
  judul: string;
  /** Nama lengkap wilayah yang jadi konteks jawaban. */
  wilayah_konteks?: string | null;
  /** Bersyarat, hanya pada daftar sesi. */
  jumlah_pesan?: number;
  /** Relasi, hanya pada detail sesi, terurut dari yang terlama. */
  pesan?: PesanChat[];
  terakhir_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
};

/**
 * Body `POST /chatbot/pesan` (§11.1).
 *
 * `sesi_id` **dikosongkan pada pesan pertama**, sesinya dibuat peladen dan
 * id-nya ikut di balasan, jadi layar percakapan baru tidak perlu dua
 * pemanggilan untuk mulai.
 *
 * Riwayat percakapan tidak dikirim dari klien, begitu pula konteks wilayah dan
 * instruksi sistem: seluruhnya ditentukan peladen.
 */
export type PayloadPesanChat = {
  /** 2–2000 karakter. */
  pesan: string;
  sesi_id?: number;
  /** Baku `ketik`. Kirim `suara` bila pesan berasal dari dikte. */
  sumber_input?: SumberInput;
};

export type HasilPesanChat = {
  /** **Simpan dan kirim balik pada pesan berikutnya.** */
  sesi_id: number;
  judul_sesi: string;
  /**
   * **Hanya balasan asisten.** Pesan pengguna tidak dikembalikan, tampilkan
   * dari state lokal.
   */
  pesan: PesanChat;
};

export type ParamsSesiChat = ParamsHalaman;
