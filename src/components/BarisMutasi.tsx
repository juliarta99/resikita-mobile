import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/constants/theme";
import { formatRupiah } from "@/lib/rupiah";
import type { DompetTransaksi } from "@/types/dompet";
import type { TipeTransaksiDompet } from "@/types/enums";

/** Ikon tiap tipe mutasi. Label dan arahnya datang dari peladen. */
const IKON_TIPE: Record<TipeTransaksiDompet, keyof typeof Feather.glyphMap> = {
  setor: "arrow-down-circle",
  refund: "corner-down-left",
  belanja: "shopping-bag",
  penarikan: "arrow-up-circle",
  iuran: "home",
};

export function BarisMutasi({ m }: { m: DompetTransaksi }) {
  /**
   * Arah uang datang dari `is_pemasukan`, bukan disimpulkan dari `tipe` maupun
   * dari tanda pada `jumlah`, `jumlah` selalu positif, dan aturan mana yang
   * dihitung sebagai pemasukan adalah milik peladen.
   */
  const masuk = m.is_pemasukan;
  const ikon = IKON_TIPE[m.tipe] ?? "circle";
  const tanggal = m.created_at
    ? new Date(m.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <View
      style={styles.mutasi}
      accessible
      accessibilityLabel={`${m.keterangan || m.tipe_label}, ${masuk ? "masuk" : "keluar"} ${formatRupiah(m.jumlah)}${tanggal ? `, ${tanggal}` : ""}`}
    >
      <View
        style={[
          styles.ikon,
          { backgroundColor: masuk ? "#DCF3EA" : "#FEE2E2" },
        ]}
      >
        <Feather
          name={ikon}
          size={18}
          color={masuk ? colors.brand : "#B91C1C"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>
          {m.keterangan || m.tipe_label}
        </Text>
        <Text style={styles.tanggal}>
          {[m.tipe_label, tanggal].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text
        style={[styles.nominal, { color: masuk ? colors.brand : "#B91C1C" }]}
      >
        {/* Tanda minus di sini adalah U+2212, bukan hyphen, pada angka ia
            sejajar tinggi digit dan tidak terbaca sebagai tanda hubung. */}
        {masuk ? "+" : "−"}
        {formatRupiah(m.jumlah)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mutasi: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  tanggal: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  nominal: { fontSize: 14, fontWeight: "700" },
});

export default BarisMutasi;
