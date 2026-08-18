import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radius } from "@/constants/theme";
import { metaKategori } from "@/lib/kategoriSampah";

type Props = {
  kategori: string;
  /** Label yang sudah dirangkai peladen. Dipakai bila ada, supaya sebutannya seragam dengan web. */
  label?: string;
  ukuran?: "kecil" | "sedang";
};

/**
 * Lencana kategori sampah.
 *
 * Ikonnya bukan hiasan: kategori dibedakan warna, dan warna saja tidak cukup
 * bagi pengguna yang buta warna. WCAG 2.2 melarang warna menjadi satu-satunya
 * pembawa makna, jadi bentuk ikonnya ikut membedakan.
 */
export function KategoriBadge({ kategori, label, ukuran = "sedang" }: Props) {
  const meta = metaKategori(kategori);
  const teks = label ?? meta.label;
  const kecil = ukuran === "kecil";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.bg },
        kecil && styles.badgeKecil,
      ]}
      // Pembaca layar cukup mengucapkan "Kategori Organik" sekali; ikon dan
      // teks di dalamnya disembunyikan supaya tidak terbaca dua kali.
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Kategori ${teks}`}
    >
      <Feather
        name={meta.icon}
        size={kecil ? 11 : 13}
        color={meta.fg}
        importantForAccessibility="no"
      />
      <Text
        style={[styles.teks, { color: meta.fg }, kecil && styles.teksKecil]}
        importantForAccessibility="no-hide-descendants"
      >
        {teks}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeKecil: { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  teks: { fontSize: 12, fontWeight: "700" },
  teksKecil: { fontSize: 11 },
});

export default KategoriBadge;
