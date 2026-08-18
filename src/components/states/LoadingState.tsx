import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/constants/theme";

type Props = {
  /** Kalimat singkat tentang apa yang sedang dimuat. */
  pesan?: string;
};

/**
 * Keadaan memuat baku.
 *
 * `accessibilityLiveRegion="polite"` membuat pembaca layar mengumumkan bahwa
 * ada proses berjalan tanpa memotong apa yang sedang dibacakan. Tanpa itu,
 * pengguna tunanetra hanya menemui layar yang mendadak sunyi dan tidak tahu
 * apakah aplikasinya bekerja atau menggantung.
 */
export function LoadingState({ pesan = "Memuat…" }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion="polite"
      accessibilityLabel={pesan}
    >
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.teks}>{pesan}</Text>
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
  teks: { color: colors.subtext, fontSize: 14 },
});

export default LoadingState;
