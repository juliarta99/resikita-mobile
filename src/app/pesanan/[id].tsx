import { colors, radius, spacing } from "@/constants/theme";
import { batalPesanan, bayarUlangPesanan, getPesananDetail } from "@/lib/api";
import { notify } from "@/lib/dialog";
import { reorderItems } from "@/lib/reorder";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { STATUS_META } from "./index";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const ordNo = (id: number, iso?: string) =>
  "ORD-" +
  (iso ? new Date(iso).toISOString().slice(0, 10).replace(/-/g, "") : "") +
  String(id).padStart(3, "0");
const dt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const FLOW = ["menunggu_bayar", "dibayar", "diproses", "dikirim", "selesai"];
const STEP_LABEL: Record<string, string> = {
  menunggu_bayar: "Pesanan Dibuat",
  dibayar: "Pembayaran Dikonfirmasi",
  diproses: "Pesanan Diproses",
  dikirim: "Pesanan Dikirim",
  selesai: "Pesanan Selesai",
};

export default function DetailPesanan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const {
    data: o,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["pesanan", id],
    queryFn: () => getPesananDetail(id),
    retry: 1,
  });

  // Semua hook harus di atas, sebelum return kondisional apa pun.
  const [beliLoading, setBeliLoading] = React.useState(false);
  const [bayarLoading, setBayarLoading] = React.useState(false);

  if (isLoading)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  if (isError || !o)
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.appbar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.appbarTitle}>Detail Pesanan</Text>
        </View>
        <View style={{ alignItems: "center", marginTop: 50, gap: 12 }}>
          <Text style={{ color: colors.subtext }}>Gagal memuat pesanan.</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );

  const m = STATUS_META[o.status] ?? {
    label: o.status,
    color: "#fff",
    bg: colors.brand,
    icon: "package",
  };
  const dibatalkan = o.status === "dibatalkan";
  const currentIdx = FLOW.indexOf(o.status);
  const bisaBatal = o.status === "menunggu_bayar" || o.status === "dibayar";
  const bisaBayar =
    o.status === "menunggu_bayar" && o.metode_bayar === "midtrans";

  const beliLagi = async () => {
    setBeliLoading(true);
    const ditambah = await reorderItems(o.items ?? []);
    setBeliLoading(false);
    if (ditambah > 0) router.push("/keranjang" as any);
    else notify("Beli Lagi", "Produk pada pesanan ini tidak lagi tersedia.");
  };

  const bayarSekarang = async () => {
    setBayarLoading(true);
    try {
      // Pakai token tersimpan bila ada; kalau kosong/kedaluwarsa minta token baru.
      let token = o.snap_token;
      if (!token) {
        const res = await bayarUlangPesanan(id);
        token = res.snap_token;
      }
      router.push({
        pathname: "/bayar",
        params: { snap_token: token, title: "Pembayaran Pesanan" },
      });
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat memproses pembayaran.",
      );
    } finally {
      setBayarLoading(false);
    }
  };

  const batal = () =>
    Alert.alert("Batalkan Pesanan", "Yakin ingin membatalkan pesanan ini?", [
      { text: "Tidak", style: "cancel" },
      {
        text: "Batalkan",
        style: "destructive",
        onPress: async () => {
          try {
            await batalPesanan(id);
            qc.invalidateQueries({ queryKey: ["pesanan"] });
            qc.invalidateQueries({ queryKey: ["saldo"] });
            refetch();
          } catch (e: any) {
            Alert.alert(
              "Gagal",
              e?.response?.data?.message ?? "Tidak bisa membatalkan.",
            );
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail Pesanan</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        {/* Status hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: dibatalkan ? colors.danger : colors.brand },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Feather name={m.icon as any} size={22} color={colors.white} />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{m.label}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            {STEP_LABEL[o.status] ?? m.label}
          </Text>
          <Text style={styles.heroOrd}>{ordNo(o.id, o.tanggal)}</Text>
        </View>

        {/* Timeline */}
        {!dibatalkan && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status Pengiriman</Text>
            {FLOW.map((st, i) => {
              const done = i <= currentIdx;
              return (
                <View key={st} style={styles.tItem}>
                  <View style={styles.tLeft}>
                    <View
                      style={[
                        styles.tDot,
                        { backgroundColor: done ? colors.brand : "#E2E8F0" },
                      ]}
                    >
                      <Feather
                        name="check"
                        size={12}
                        color={done ? "#fff" : "#94A3B8"}
                      />
                    </View>
                    {i < FLOW.length - 1 && (
                      <View
                        style={[
                          styles.tLine,
                          {
                            backgroundColor:
                              i < currentIdx ? colors.brand : "#E2E8F0",
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 18 }}>
                    <Text
                      style={[styles.tTitle, !done && { color: "#94A3B8" }]}
                    >
                      {STEP_LABEL[st]}
                    </Text>
                    {i === currentIdx && (
                      <Text style={styles.tDate}>{dt(o.tanggal)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Alamat */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alamat Pengiriman</Text>
          <Text style={styles.alamat}>{o.alamat_kirim}</Text>
        </View>

        {/* Produk */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produk • {o.umkm}</Text>
          {(o.items ?? []).map((it: any, i: number) => (
            <View key={i} style={styles.prodRow}>
              <Text style={styles.prodNama} numberOfLines={2}>
                {it.nama}
              </Text>
              <Text style={styles.prodQty}>x{it.qty}</Text>
              <Text style={styles.prodSub}>{rp(it.subtotal)}</Text>
            </View>
          ))}
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Subtotal</Text>
            <Text style={styles.sumVal}>{rp(o.total)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Ongkir</Text>
            <Text
              style={[
                styles.sumVal,
                Number(o.ongkir) === 0 && { color: colors.brand },
              ]}
            >
              {Number(o.ongkir) === 0 ? "GRATIS" : rp(o.ongkir)}
            </Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandVal}>
              {rp(o.grand_total ?? Number(o.total) + Number(o.ongkir))}
            </Text>
          </View>
          <Text style={styles.metode}>
            Metode:{" "}
            {o.metode_bayar === "saldo" ? "Saldo Niti Resik" : "Midtrans"}
          </Text>
        </View>

        {/* Bayar Sekarang (Midtrans, belum dibayar) */}
        {bisaBayar && (
          <Pressable
            style={[styles.bayarBtn, bayarLoading && { opacity: 0.6 }]}
            onPress={bayarSekarang}
            disabled={bayarLoading}
          >
            {bayarLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="credit-card" size={18} color="#fff" />
                <Text style={styles.bayarText}>Bayar Sekarang</Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          style={[styles.beliLagiBtn, beliLoading && { opacity: 0.6 }]}
          onPress={beliLagi}
          disabled={beliLoading}
        >
          {beliLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="repeat" size={18} color="#fff" />
              <Text style={styles.beliLagiText}>Beli Lagi</Text>
            </>
          )}
        </Pressable>

        {o.status === "selesai" && !o.sudah_ulasan && (
          <Pressable
            style={styles.ulasBtn}
            onPress={() => router.push(`/ulasan/${o.id}` as any)}
          >
            <Feather name="star" size={18} color={colors.brand} />
            <Text style={styles.ulasText}>Beri Ulasan</Text>
          </Pressable>
        )}

        {bisaBatal && (
          <Pressable style={styles.cancelBtn} onPress={batal}>
            <Feather name="x-circle" size={18} color={colors.danger} />
            <Text style={styles.cancelText}>Batalkan Pesanan</Text>
          </Pressable>
        )}
      </ScrollView>
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
  retry: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  hero: { borderRadius: radius.lg, padding: spacing.lg },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroBadgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  heroTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  heroOrd: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  tItem: { flexDirection: "row", gap: 12 },
  tLeft: { alignItems: "center", width: 26 },
  tDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tLine: { flex: 1, width: 2, marginVertical: 2 },
  tTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  tDate: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  alamat: { color: colors.text, fontSize: 14, lineHeight: 20 },
  prodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  prodNama: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "600" },
  prodQty: { color: colors.subtext, fontSize: 13 },
  prodSub: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    minWidth: 70,
    textAlign: "right",
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sumLabel: { color: colors.subtext, fontSize: 14 },
  sumVal: { color: colors.text, fontWeight: "600" },
  grandLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  grandVal: { fontSize: 17, fontWeight: "800", color: colors.brand },
  metode: { color: colors.subtext, fontSize: 13, marginTop: 10 },
  bayarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "#F59E0B",
    marginTop: 16,
  },
  bayarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  beliLagiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginTop: 16,
  },
  beliLagiText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ulasBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "#F1F8F5",
    marginTop: 12,
  },
  ulasText: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FBD5D5",
    backgroundColor: "#FEF2F2",
    marginTop: 16,
  },
  cancelText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
