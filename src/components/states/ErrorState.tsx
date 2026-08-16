import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/lib/api/error";

type Props = {
  /** Galat apa adanya dari TanStack Query. */
  error: unknown;
  onCobaLagi?: () => void;
};

type Tampilan = {
  icon: keyof typeof Feather.glyphMap;
  judul: string;
  pesan: string;
  /** Mencoba ulang tidak masuk akal untuk sebagian galat. */
  bolehCobaLagi: boolean;
};

/**
 * Terjemahkan galat menjadi kalimat yang bisa ditindaklanjuti.
 *
 * Kode status yang berbeda menuntut tindakan yang berbeda: koneksi mati minta
 * pengguna memeriksa jaringan, 403 minta pengguna berhenti mencoba, 429 minta
 * pengguna menunggu. Menampilkan satu kalimat "Terjadi kesalahan" untuk
 * semuanya membuat pengguna mengulang hal yang tidak akan pernah berhasil.
 */
function tampilan(error: unknown): Tampilan {
  if (error instanceof ApiError) {
    if (error.offline) {
      return {
        icon: "wifi-off",
        judul: "Tidak ada koneksi",
        pesan: "Periksa sambungan internet Anda, lalu coba lagi.",
        bolehCobaLagi: true,
      };
    }
    if (error.layananAiMati) {
      return {
        icon: "cloud-off",
        judul: "Layanan sedang sibuk",
        pesan: "Layanan kecerdasan buatan tidak dapat dihubungi. Coba beberapa saat lagi.",
        bolehCobaLagi: true,
      };
    }
    if (error.status === 403) {
      return {
        icon: "lock",
        judul: "Tidak berwenang",
        pesan: error.pesanUntukPengguna,
        bolehCobaLagi: false,
      };
    }
    if (error.status === 404) {
      return {
        icon: "search",
        judul: "Tidak ditemukan",
        pesan: error.pesanUntukPengguna,
        bolehCobaLagi: false,
      };
    }
    if (error.status === 429) {
      const jeda = error.retryAfter
        ? ` Coba lagi dalam ${error.retryAfter} detik.`
        : "";
      return {
        icon: "clock",
        judul: "Terlalu sering",
        pesan: `Permintaan Anda terlalu banyak dalam waktu singkat.${jeda}`,
        bolehCobaLagi: false,
      };
    }
    return {
      icon: "alert-circle",
      judul: "Gagal memuat",
      pesan: error.pesanUntukPengguna,
      bolehCobaLagi: true,
    };
  }

  return {
    icon: "alert-circle",
    judul: "Gagal memuat",
    pesan: "Terjadi kesalahan yang tidak terduga.",
    bolehCobaLagi: true,
  };
}

/** Keadaan galat baku. */
export function ErrorState({ error, onCobaLagi }: Props) {
  const t = tampilan(error);

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.ikonBulat}>
        <Feather name={t.icon} size={28} color={colors.danger} />
      </View>
      <Text style={styles.judul}>{t.judul}</Text>
      <Text style={styles.pesan}>{t.pesan}</Text>
      {t.bolehCobaLagi && !!onCobaLagi && (
        <Pressable
          onPress={onCobaLagi}
          style={styles.tombol}
          accessibilityRole="button"
          accessibilityLabel="Coba lagi"
        >
          <Feather name="refresh-cw" size={16} color={colors.white} />
          <Text style={styles.tombolTeks}>Coba Lagi</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  ikonBulat: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  judul: { fontSize: 16, fontWeight: "700", color: colors.text },
  pesan: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 21,
  },
  tombol: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolTeks: { color: colors.white, fontWeight: "700", fontSize: 14 },
});

export default ErrorState;
