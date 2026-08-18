import { colors, radius, spacing } from "@/constants/theme";
import { evaluate, Stats } from "@/lib/achievements";
import { useStatistikSaya } from "@/hooks/useStatistikSaya";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Pencapaian() {
  const stat = useStatistikSaya();

  const stats: Stats = {
    saldo: stat.saldo,
    totalSetorKg: stat.totalSetorKg,
    jumlahSetor: stat.jumlahSetor,
    jumlahBelanja: stat.jumlahPesanan,
    jumlahLaporan: stat.jumlahLaporan,
    jumlahKlasifikasi: stat.jumlahKlasifikasi,
    // Keanggotaan TPS tidak punya endpoint (catatan T3), jadi pencapaian yang
    // bergantung padanya tidak akan pernah terbuka sampai endpointnya ada.
    jumlahTps: 0,
  };
  const list = evaluate(stats);
  const tercapai = list.filter((a) => a.done === true).length;
  const takTerukur = list.filter((a) => a.done === null).length;
  const loading = stat.memuat;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Pencapaian</Text>
      </View>

      <View style={styles.summary}>
        <Feather name="award" size={22} color={colors.brand} />
        <Text style={styles.summaryText}>
          {tercapai} dari {list.length} pencapaian terbuka
          {takTerukur > 0 ? ` · ${takTerukur} belum bisa dinilai` : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
        >
          {list.map((a) => (
            <View
              key={a.key}
              style={[styles.card, a.done !== true && styles.cardLocked]}
              accessible
              accessibilityLabel={`${a.label}: ${
                a.done === true
                  ? "terbuka"
                  : a.done === false
                    ? "terkunci"
                    : "belum bisa dinilai"
              }. ${a.desc}`}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: a.done === true ? "#DCF3EA" : "#E2E8F0" },
                ]}
              >
                <Feather
                  name={
                    a.done === true
                      ? (a.icon as keyof typeof Feather.glyphMap)
                      : a.done === false
                        ? "lock"
                        : "help-circle"
                  }
                  size={22}
                  color={a.done === true ? colors.brand : "#94A3B8"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text
                    style={[
                      styles.title,
                      a.done !== true && { color: "#64748B" },
                    ]}
                  >
                    {a.label}
                  </Text>
                  {a.done === true ? (
                    <View style={styles.doneBadge}>
                      <Feather name="check" size={12} color="#fff" />
                      <Text style={styles.doneText}>Terbuka</Text>
                    </View>
                  ) : (
                    <Feather
                      name={a.done === false ? "lock" : "help-circle"}
                      size={14}
                      color="#94A3B8"
                    />
                  )}
                </View>
                <Text style={styles.desc}>{a.desc}</Text>
                <Text style={styles.syarat}>Syarat: {a.syarat}</Text>
                {a.done === null && (
                  <Text style={styles.syarat}>
                    Belum bisa dinilai: aplikasi belum menerima total berat
                    setoran Anda dari peladen.
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
  },
  summaryText: { color: colors.text, fontWeight: "600" },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
  },
  cardLocked: { backgroundColor: "#F8FAFC" },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  doneText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  desc: { color: colors.subtext, fontSize: 13, marginTop: 4, lineHeight: 18 },
  syarat: { color: "#94A3B8", fontSize: 12, marginTop: 6 },
});
