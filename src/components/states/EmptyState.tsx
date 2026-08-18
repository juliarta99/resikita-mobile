import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";

type Props = {
  judul: string;
  /** Kalimat yang menjelaskan apa yang bisa dilakukan berikutnya. */
  pesan?: string;
  icon?: keyof typeof Feather.glyphMap;
  aksiLabel?: string;
  onAksi?: () => void;
};

/**
 * Keadaan kosong baku.
 *
 * Sengaja menuntut `judul` dan menganjurkan `pesan`: layar kosong yang hanya
 * berbunyi "Tidak ada data" membuat pengguna mengira aplikasinya rusak. Yang
 * menolong adalah menyebut apa yang belum ada dan apa langkah berikutnya.
 */
export function EmptyState({
  judul,
  pesan,
  icon = "inbox",
  aksiLabel,
  onAksi,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.ikonBulat}>
        <Feather name={icon} size={28} color={colors.subtext} />
      </View>
      <Text style={styles.judul}>{judul}</Text>
      {!!pesan && <Text style={styles.pesan}>{pesan}</Text>}
      {!!aksiLabel && !!onAksi && (
        <Pressable
          onPress={onAksi}
          style={styles.tombol}
          accessibilityRole="button"
          accessibilityLabel={aksiLabel}
        >
          <Text style={styles.tombolTeks}>{aksiLabel}</Text>
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
    backgroundColor: "#F1F5F9",
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
    // 44 adalah target sentuh minimum WCAG 2.2; jangan diperkecil demi tampilan.
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolTeks: { color: colors.white, fontWeight: "700", fontSize: 14 },
});

export default EmptyState;
