import { colors, radius, spacing } from "@/constants/theme";
import { evaluate, Stats } from "@/lib/achievements";
import {
    getKlasifikasiRiwayat,
    getLaporan,
    getPesanan,
    getSaldo,
    getSetoran,
    getTpsSaya,
} from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
  const saldoQ = useQuery({ queryKey: ["saldo"], queryFn: getSaldo });
  const setoranQ = useQuery({ queryKey: ["setoran"], queryFn: getSetoran });
  const pesananQ = useQuery({
    queryKey: ["pesanan-ringkas"],
    queryFn: () => getPesanan(),
  });
  const laporanQ = useQuery({
    queryKey: ["laporan-ringkas"],
    queryFn: () => getLaporan(),
  });
  const klasQ = useQuery({
    queryKey: ["klas-ringkas"],
    queryFn: () => getKlasifikasiRiwayat(),
  });
  const tpsQ = useQuery({
    queryKey: ["tps-saya-ringkas"],
    queryFn: getTpsSaya,
  });

  const asList = (d: any) => (Array.isArray(d) ? d : (d?.data ?? []));
  const setoranList = asList(setoranQ.data);
  const totalSetorKg = setoranList.reduce(
    (n: number, s: any) =>
      n + Number(s.berat ?? s.berat_kg ?? s.total_berat ?? 0),
    0,
  );

  const stats: Stats = {
    saldo: saldoQ.data ?? 0,
    totalSetorKg,
    jumlahSetor: setoranList.length,
    jumlahBelanja: pesananQ.data?.total ?? asList(pesananQ.data).length,
    jumlahLaporan: laporanQ.data?.total ?? asList(laporanQ.data).length,
    jumlahKlasifikasi: asList(klasQ.data).length,
    jumlahTps: asList(tpsQ.data).length,
  };
  const list = evaluate(stats);
  const tercapai = list.filter((a) => a.done).length;
  const loading = saldoQ.isLoading || setoranQ.isLoading;

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
              style={[styles.card, !a.done && styles.cardLocked]}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: a.done ? "#DCF3EA" : "#E2E8F0" },
                ]}
              >
                <Feather
                  name={(a.done ? a.icon : "lock") as any}
                  size={22}
                  color={a.done ? colors.brand : "#94A3B8"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={[styles.title, !a.done && { color: "#64748B" }]}>
                    {a.label}
                  </Text>
                  {a.done ? (
                    <View style={styles.doneBadge}>
                      <Feather name="check" size={12} color="#fff" />
                      <Text style={styles.doneText}>Terbuka</Text>
                    </View>
                  ) : (
                    <Feather name="lock" size={14} color="#94A3B8" />
                  )}
                </View>
                <Text style={styles.desc}>{a.desc}</Text>
                <Text style={styles.syarat}>Syarat: {a.syarat}</Text>
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
