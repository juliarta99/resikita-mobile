import { colors, radius, spacing } from "@/constants/theme";
import { getLaporan } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statusMeta = (
  s: string,
): { label: string; bg: string; fg: string; icon: any } => {
  switch (s) {
    case "menunggu":
      return { label: "Menunggu", bg: "#F1F5F9", fg: "#475569", icon: "clock" };
    case "diverifikasi":
      return {
        label: "Konfirmasi",
        bg: "#DBEAFE",
        fg: "#1D4ED8",
        icon: "check-circle",
      };
    case "ditugaskan":
    case "proses":
      return {
        label: "Diproses",
        bg: "#FEF3C7",
        fg: "#B45309",
        icon: "alert-circle",
      };
    case "selesai":
      return {
        label: "Selesai",
        bg: "#DCF3EA",
        fg: colors.brand,
        icon: "check",
      };
    case "ditolak":
      return {
        label: "Ditolak",
        bg: "#FEE2E2",
        fg: "#B91C1C",
        icon: "x-circle",
      };
    default:
      return { label: s, bg: "#F1F5F9", fg: "#475569", icon: "circle" };
  }
};
const dayLabel = (iso: string) => {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (ts >= startToday) return "Hari Ini";
  if (ts >= startToday - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

export default function RiwayatLaporan() {
  const [tab, setTab] = useState<"semua" | "menunggu" | "diproses">("semua");
  const { data, isLoading } = useQuery({
    queryKey: ["laporan"],
    queryFn: () => getLaporan(),
  });
  const all: any[] = data?.data ?? [];

  const inProc = (s: string) =>
    ["diverifikasi", "ditugaskan", "proses"].includes(s);
  const counts = {
    semua: all.length,
    menunggu: all.filter((r) => r.status === "menunggu").length,
    diproses: all.filter((r) => inProc(r.status)).length,
  };
  const filtered = all.filter(
    (r) =>
      tab === "semua" ||
      (tab === "menunggu" ? r.status === "menunggu" : inProc(r.status)),
  );

  // rows dengan header tanggal
  type Row = { type: "header"; label: string } | { type: "item"; r: any };
  const rows: Row[] = [];
  let last = "";
  for (const r of filtered) {
    const l = dayLabel(r.tanggal);
    if (l !== last) {
      rows.push({ type: "header", label: l });
      last = l;
    }
    rows.push({ type: "item", r });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Riwayat Laporan</Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ["semua", "Semua"],
            ["menunggu", "Menunggu"],
            ["diproses", "Diproses"],
          ] as const
        ).map(([k, lbl]) => (
          <Pressable
            key={k}
            style={[styles.tab, tab === k && styles.tabActive]}
            onPress={() => setTab(k)}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {lbl}
            </Text>
            <View style={[styles.count, tab === k && styles.countActive]}>
              <Text
                style={[styles.countText, tab === k && { color: colors.white }]}
              >
                {counts[k]}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) =>
            row.type === "header" ? `h-${row.label}-${i}` : `r-${row.r.id}`
          }
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text style={styles.date}>{item.label}</Text>
            ) : (
              <Card r={item.r} />
            )
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Belum ada laporan.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Card({ r }: { r: any }) {
  const m = statusMeta(r.status);
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/lapor/${r.id}` as Href)}
    >
      <View style={styles.thumb}>
        {r.foto ? (
          <Image source={{ uri: r.foto }} style={styles.thumbImg} />
        ) : (
          <Feather name="image" size={22} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {r.judul}
          </Text>
          <View style={[styles.badge, { backgroundColor: m.bg }]}>
            <Feather name={m.icon} size={12} color={m.fg} />
            <Text style={[styles.badgeText, { color: m.fg }]}>{m.label}</Text>
          </View>
        </View>
        {r.kategori && (
          <View style={styles.kat}>
            <Text style={styles.katText}>{r.kategori}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.subtext} />
          <Text style={styles.meta} numberOfLines={1}>
            {r.alamat ?? "-"}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color={colors.subtext} />
          <Text style={styles.meta}>{hhmm(r.tanggal)}</Text>
        </View>
      </View>
    </Pressable>
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: "#EEF3F1",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.subtext, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.white },
  count: {
    backgroundColor: "#EEF2F6",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  countText: { fontSize: 11, fontWeight: "700", color: colors.subtext },
  date: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  kat: {
    alignSelf: "flex-start",
    backgroundColor: "#DCF3EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  katText: { color: colors.brand, fontSize: 11, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  meta: { fontSize: 12, color: colors.subtext, flex: 1 },
  empty: { textAlign: "center", color: colors.subtext, marginTop: 30 },
});
