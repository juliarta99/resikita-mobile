import { colors, radius, spacing } from "@/constants/theme";
import { getPesanan, getPesananDetail } from "@/lib/api";
import { notify } from "@/lib/dialog";
import { reorderItems } from "@/lib/reorder";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const asList = (d: any) => (Array.isArray(d) ? d : (d?.data ?? []));
const ordNo = (id: number, iso?: string) =>
  "ORD-" +
  (iso ? new Date(iso).toISOString().slice(0, 10).replace(/-/g, "") : "") +
  String(id).padStart(3, "0");

export const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  menunggu_bayar: {
    label: "Menunggu Bayar",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "clock",
  },
  dibayar: {
    label: "Diproses",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "package",
  },
  diproses: {
    label: "Diproses",
    color: "#B45309",
    bg: "#FEF3C7",
    icon: "package",
  },
  dikirim: { label: "Dikirim", color: "#C2410C", bg: "#FFEDD5", icon: "truck" },
  selesai: {
    label: "Selesai",
    color: "#fff",
    bg: colors.brand,
    icon: "check-circle",
  },
  dibatalkan: {
    label: "Dibatalkan",
    color: "#B91C1C",
    bg: "#FEE2E2",
    icon: "x-circle",
  },
};
const TABS: { key: string; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "menunggu_bayar", label: "Menunggu" },
  { key: "dibayar", label: "Diproses" },
  { key: "dikirim", label: "Dikirim" },
  { key: "selesai", label: "Selesai" },
];

export default function RiwayatPesanan() {
  const [tab, setTab] = useState("semua");
  const [reorderId, setReorderId] = useState<number | null>(null);

  const beliLagi = async (id: number) => {
    setReorderId(id);
    try {
      const detail = await getPesananDetail(id);
      const n = await reorderItems(detail?.items ?? []);
      if (n > 0) router.push("/keranjang" as any);
      else notify("Beli Lagi", "Produk pada pesanan ini tidak lagi tersedia.");
    } catch {
      notify("Gagal", "Tidak dapat memuat pesanan.");
    } finally {
      setReorderId(null);
    }
  };
  const { data, isLoading } = useQuery({
    queryKey: ["pesanan", tab],
    queryFn: () => getPesanan(tab === "semua" ? undefined : { status: tab }),
  });
  const list = asList(data);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Riwayat Pesanan</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={{
          gap: 8,
          paddingHorizontal: spacing.md,
          paddingBottom: 12,
        }}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={[styles.tabText, tab === t.key && { color: colors.white }]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        >
          {list.length === 0 ? (
            <Text style={styles.empty}>Belum ada pesanan.</Text>
          ) : (
            list.map((o: any) => {
              const m = STATUS_META[o.status] ?? {
                label: o.status,
                color: colors.text,
                bg: "#E2E8F0",
                icon: "package",
              };
              return (
                <Pressable
                  key={o.id}
                  style={styles.card}
                  onPress={() => router.push(`/pesanan/${o.id}` as any)}
                >
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.ord}>{ordNo(o.id, o.tanggal)}</Text>
                      <Text style={styles.tgl}>
                        {o.tanggal
                          ? new Date(o.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : ""}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: m.bg }]}>
                      <Feather name={m.icon as any} size={12} color={m.color} />
                      <Text style={[styles.badgeText, { color: m.color }]}>
                        {m.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.toko}>{o.umkm}</Text>
                  <Text style={styles.itemInfo}>{o.jumlah_item} item</Text>
                  <Text style={styles.total}>
                    Total: {rp(Number(o.total) + Number(o.ongkir))}
                  </Text>
                  <View style={styles.actions}>
                    {o.status === "selesai" && (
                      <Pressable
                        style={styles.actBtn}
                        onPress={() => beliLagi(o.id)}
                        disabled={reorderId === o.id}
                      >
                        <Text style={styles.actText}>
                          {reorderId === o.id ? "Memuat..." : "Beli Lagi"}
                        </Text>
                      </Pressable>
                    )}
                    {o.status === "selesai" && !o.sudah_ulasan && (
                      <Pressable
                        style={[styles.actBtn, styles.actBtnFill]}
                        onPress={() => router.push(`/ulasan/${o.id}` as any)}
                      >
                        <Text style={styles.actTextFill}>Beri Ulasan</Text>
                      </Pressable>
                    )}
                    {o.status === "dikirim" && !!o.no_resi && (
                      <View style={styles.resiBox}>
                        <Feather name="truck" size={14} color={colors.brand} />
                        <Text style={styles.resiText}>
                          {o.kurir} • {o.no_resi}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
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
  tabsWrap: { backgroundColor: colors.white, maxHeight: 52 },
  tab: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.brand },
  tabText: { fontWeight: "700", color: colors.subtext, fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ord: { fontSize: 14, fontWeight: "800", color: colors.text },
  tgl: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  toko: { fontSize: 13, color: colors.subtext, marginTop: 10 },
  itemInfo: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  total: { fontSize: 14, fontWeight: "700", color: colors.brand, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  actText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  actBtnFill: { backgroundColor: colors.brand, borderColor: colors.brand },
  actTextFill: { color: colors.white, fontWeight: "700", fontSize: 13 },
  resiBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F8F5",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resiText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
});
