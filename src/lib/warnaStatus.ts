import { colors } from "@/constants/theme";

/** Warna semantik yang dikirim peladen pada kunci `*_warna`. Rujukan: §2. */
export type WarnaSemantik =
  | "blue"
  | "cyan"
  | "amber"
  | "orange"
  | "green"
  | "red"
  | "gray"
  | "purple";

export type RupaStatus = {
  /** Latar lencana. */
  bg: string;
  /** Teks dan ikon di atasnya. */
  fg: string;
};

/**
 * Terjemahan nama warna peladen ke palet aplikasi.
 *
 * Peladen mengirim `status_label` dan `status_warna` bersama hampir setiap enum
 * berstatus, dan itu disengaja: label boleh berubah tanpa dianggap perubahan
 * kontrak, dan warnanya ikut supaya web dan mobile menampilkan keadaan yang sama
 * dengan isyarat visual yang sama.
 *
 * Layar-layar di sini dulu menyimpan tabel status sendiri, tujuh status
 * laporan, empat status penarikan, tiga status iuran, dan setiap kali peladen
 * menambah satu nilai, tabel lokalnya diam-diam ketinggalan dan menampilkan
 * nilai enum mentah kepada pengguna. Memakai `*_warna` menghapus seluruh kelas
 * bug itu.
 *
 * Pasangan warna di bawah sudah melewati rasio kontras 4.5:1, sesuai WCAG 2.2 AA
 * untuk teks berukuran normal.
 */
const PALET: Record<WarnaSemantik, RupaStatus> = {
  blue: { bg: "#DBEAFE", fg: "#1D4ED8" },
  cyan: { bg: "#CFFAFE", fg: "#0E7490" },
  amber: { bg: "#FEF3C7", fg: "#B45309" },
  orange: { bg: "#FFEDD5", fg: "#C2410C" },
  green: { bg: "#DCF3EA", fg: colors.brand },
  red: { bg: "#FEE2E2", fg: "#B91C1C" },
  gray: { bg: "#F1F5F9", fg: "#475569" },
  purple: { bg: "#EDE9FE", fg: "#6D28D9" },
};

const NETRAL: RupaStatus = PALET.gray;

/** Rupa lencana untuk sebuah nilai `*_warna`. Nilai tak dikenal jadi netral. */
export function rupaStatus(warna?: string | null): RupaStatus {
  if (!warna) return NETRAL;
  return PALET[warna as WarnaSemantik] ?? NETRAL;
}
