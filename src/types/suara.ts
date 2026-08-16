/** Kontrak fitur suara. Rujukan: CLAUDE.md §9. */

/** Bahasa pengenalan ucapan. Sama dengan bahasa TTS supaya keduanya sepadan. */
export const BAHASA_STT = "id-ID";

export type HasilVoiceInput = {
  /**
   * Perangkat ini bisa mengenali ucapan.
   *
   * Ketika `false`, **sembunyikan tombol mikrofonnya** — jangan tampilkan galat.
   * Pengguna yang perangkatnya tidak mendukung tidak melakukan kesalahan apa
   * pun, dan memberitahunya soal fitur yang tidak bisa ia pakai hanya
   * menambah kebisingan.
   */
  didukung: boolean;
  merekam: boolean;
  /**
   * Transkrip berjalan, termasuk hasil sementara.
   *
   * Ini yang ditampilkan ke pengguna untuk diperiksa dan disunting sebelum
   * dikirim — inti arsitektur cascaded di CLAUDE.md §9.
   */
  teks: string;
  /** Pesan siap tampil. `null` bila tidak ada masalah. */
  galat: string | null;
  mulai: () => Promise<void>;
  berhenti: () => void;
  bersihkan: () => void;
};
