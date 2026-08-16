import type { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { KategoriSampah } from "@/types/enums";

export type MetaKategori = {
  label: string;
  /** Warna latar lencana. */
  bg: string;
  /** Warna teks di atasnya. */
  fg: string;
  icon: keyof typeof Feather.glyphMap;
};

/**
 * Rupa kelima kategori sampah.
 *
 * Dikunci pada nilai enum, **bukan** pada `kategori_warna` yang ikut di respons
 * klasifikasi. Alasannya praktis: `kategori_warna` hanya ada di respons
 * klasifikasi, sementara kategori yang sama juga muncul di riwayat setoran,
 * katalog harga, dan penyaring — kalau warnanya bergantung pada field yang
 * tidak selalu ada, benda yang sama akan berganti warna dari satu layar ke
 * layar lain.
 *
 * Seluruh pasangan warna di bawah sudah melewati rasio kontras 4.5:1 terhadap
 * teks putihnya, sesuai WCAG 2.2 AA untuk teks berukuran normal. Nilai yang
 * lebih terang tampak lebih segar tapi tidak terbaca di layar ponsel di bawah
 * matahari — yang justru kondisi memilah sampah yang sebenarnya.
 */
export const META_KATEGORI: Record<KategoriSampah, MetaKategori> = {
  organik: {
    label: "Organik",
    bg: "#15803D",
    fg: colors.white,
    icon: "feather",
  },
  anorganik: {
    label: "Anorganik",
    bg: colors.brand,
    fg: colors.white,
    icon: "package",
  },
  b3: {
    label: "B3",
    bg: "#B91C1C",
    fg: colors.white,
    icon: "alert-triangle",
  },
  residu: {
    label: "Residu",
    bg: "#475569",
    fg: colors.white,
    icon: "trash-2",
  },
  elektronik: {
    label: "Elektronik",
    bg: "#6D28D9",
    fg: colors.white,
    icon: "cpu",
  },
};

/**
 * Rupa untuk kategori yang tidak dikenali.
 *
 * API-DOCS.md §15 menyatakan nilai di luar lima enum itu adalah bug peladen
 * yang harus dilaporkan. Cadangan ini ada supaya layar tidak kosong sementara
 * bug-nya ditelusuri — bukan supaya kategori keenam bisa masuk diam-diam.
 */
const CADANGAN: MetaKategori = {
  label: "Lainnya",
  bg: "#475569",
  fg: colors.white,
  icon: "help-circle",
};

export function metaKategori(kategori: string): MetaKategori {
  const meta = META_KATEGORI[kategori as KategoriSampah];
  if (!meta && __DEV__) {
    console.warn(
      `Kategori sampah tidak dikenal: "${kategori}". Hanya lima nilai enum yang sah — laporkan ini sebagai bug peladen.`,
    );
  }
  return meta ?? CADANGAN;
}
