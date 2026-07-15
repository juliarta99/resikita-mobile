import { colors, spacing } from "@/constants/theme";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Wadah tombol melayang di dasar layar (CTA).
 *
 * Menggantikan pola lama yang harus ditambal di tiap layar:
 *   <View style={styles.cta}>...</View>
 *   cta: { position:'absolute', bottom:0, padding: spacing.lg }
 *
 * Otomatis menyisakan ruang setinggi tombol navigasi HP (3-tombol /
 * gesture bar / poni iPhone), sehingga isinya tidak tertimpa tombol back.
 *
 * Pemakaian dasar:
 *   <BottomBar>
 *     <Pressable style={styles.ctaBtn}>...</Pressable>
 *   </BottomBar>
 *
 * Beberapa tombol berjajar (atur padding lebih rapat):
 *   <BottomBar padH={spacing.md} padV={12}
 *              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
 *
 * Bar ikut alur konten (tidak melayang):
 *   <BottomBar static>...</BottomBar>
 */
export default function BottomBar({
  children,
  style,
  static: statis = false,
  border = true,
  padH = spacing.lg,
  padV = spacing.lg,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** true = ikut alur konten, tidak melayang di atas layar */
  static?: boolean;
  /** garis pemisah di sisi atas bar */
  border?: boolean;
  /** padding kiri-kanan */
  padH?: number;
  /** padding atas; padding bawah = nilai ini + tinggi nav bar HP */
  padV?: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        !statis && styles.floating,
        border && styles.border,
        {
          backgroundColor: colors.white,
          paddingHorizontal: padH,
          paddingTop: padV,
          // Inti komponen: ruang bawah = padding normal + tinggi nav bar HP.
          paddingBottom: padV + insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  border: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
