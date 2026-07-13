import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { colors, radius, spacing } from "@/constants/theme";
import { getSetoran, getPenarikan } from "@/lib/api";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const asList = (d: any) => (Array.isArray(d) ? d : d?.data ?? []);
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
function dayLabel(iso: string) {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) return "Hari Ini";
  if (ts >= startToday - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type Trx = { key: string; tipe: "setoran" | "penarikan"; judul: string; sub?: string; kg?: number; jumlah: number; tanggal: string; raw: any };

export default function RiwayatTransaksi() {
  const [tab, setTab] = useState<"semua" | "setoran" | "penarikan">("semua");
  const setoranQ = useQuery({ queryKey: ["setoran"], queryFn: getSetoran });
  const penarikanQ = useQuery({ queryKey: ["penarikan"], queryFn: getPenarikan });

  const setoran: Trx[] = asList(setoranQ.data).map((s: any) => ({
    key: "s" + s.id, tipe: "setoran", judul: rincianJudul(s), sub: s.bank_sampah, kg: s.total_berat, jumlah: s.total_nilai, tanggal: s.tanggal, raw: s,
  }));
  const penarikan: Trx[] = asList(penarikanQ.data).map((w: any) => ({
    key: "w" + w.id, tipe: "penarikan", judul: "Penarikan Saldo", sub: w.nama_bank, jumlah: w.jumlah, tanggal: w.tanggal, raw: w,
  }));

  const all = [...setoran, ...penarikan].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  const totalSetoran = setoran.reduce((n, s) => n + s.jumlah, 0);
  const totalPenarikan = penarikan.reduce((n, w) => n + w.jumlah, 0);
  const list = tab === "semua" ? all : tab === "setoran" ? setoran : penarikan;

  // group by date
  const rows: ({ header: string } | { trx: Trx })[] = [];
  let last = "";
  for (const t of list) {
    const l = dayLabel(t.tanggal);
    if (l !== last) { rows.push({ header: l }); last = l; }
    rows.push({ trx: t });
  }

  const loading = setoranQ.isLoading || penarikanQ.isLoading;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Riwayat Transaksi</Text>
      </View>

      <View style={styles.tabs}>
        {(["semua", "setoran", "penarikan"] as const).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: colors.white }]}>{t === "semua" ? "Semua" : t === "setoran" ? "Setoran" : "Penarikan"}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} /> : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
          <View style={styles.summaryRow}>
            <View style={[styles.summary, { backgroundColor: "#E9F7F0" }]}>
              <Feather name="trending-up" size={18} color={colors.brand} />
              <Text style={styles.summaryLabel}>Total Setoran</Text>
              <Text style={[styles.summaryValue, { color: colors.brand }]}>{rp(totalSetoran)}</Text>
            </View>
            <View style={[styles.summary, { backgroundColor: "#FEECEC" }]}>
              <Feather name="credit-card" size={18} color={colors.danger} />
              <Text style={styles.summaryLabel}>Total Penarikan</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{rp(totalPenarikan)}</Text>
            </View>
          </View>

          {rows.length === 0 ? (
            <Text style={styles.empty}>Belum ada transaksi.</Text>
          ) : rows.map((r, i) =>
            "header" in r ? (
              <Text key={"h" + i} style={styles.dateLabel}>{r.header}</Text>
            ) : (
              <Pressable key={r.trx.key} style={styles.item} onPress={() => router.push({ pathname: "/dompet/detail", params: { tipe: r.trx.tipe, data: JSON.stringify(r.trx.raw) } } as any)}>
                <View style={[styles.itemIcon, { backgroundColor: r.trx.tipe === "setoran" ? "#E9F7F0" : "#FEECEC" }]}>
                  <Feather name={r.trx.tipe === "setoran" ? "trending-up" : "credit-card"} size={18} color={r.trx.tipe === "setoran" ? colors.brand : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{r.trx.judul}</Text>
                  {!!r.trx.sub && <Text style={styles.itemSub}>{r.trx.sub}</Text>}
                  {r.trx.kg != null && <Text style={styles.itemSub}>{r.trx.kg} kg</Text>}
                  <Text style={styles.itemTime}>{hhmm(r.trx.tanggal)}</Text>
                </View>
                <Text style={[styles.itemAmount, { color: r.trx.tipe === "setoran" ? colors.brand : colors.danger }]}>
                  {r.trx.tipe === "setoran" ? "+" : "-"}{rp(r.trx.jumlah)}
                </Text>
              </Pressable>
            )
          )}

          {list.length > 0 && (
            <View style={styles.total}><Text style={styles.totalLabel}>Total Transaksi</Text><Text style={styles.totalValue}>{list.length} transaksi</Text></View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function rincianJudul(s: any): string {
  const r = s.rincian?.[0]?.jenis;
  return r ? `Setoran ${r}` : "Setoran Sampah";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14 },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabs: { flexDirection: "row", gap: 10, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingBottom: 12 },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: "#EEF2F6", alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.brand },
  tabText: { fontWeight: "700", color: colors.subtext, fontSize: 13 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  summary: { flex: 1, borderRadius: radius.md, padding: 14, gap: 4 },
  summaryLabel: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  dateLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 14, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#EEF2F6" },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  itemTime: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  itemAmount: { fontSize: 14, fontWeight: "800" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 6 },
  totalLabel: { color: colors.subtext },
  totalValue: { color: colors.text, fontWeight: "700" },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 30 },
});
