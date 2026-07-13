import { colors, radius, spacing } from "@/constants/theme";
import { getLaporanDetail } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statusLabel = (s: string) =>
  ({
    menunggu: "Menunggu Konfirmasi",
    diverifikasi: "Terkonfirmasi",
    ditugaskan: "Diproses",
    proses: "Sedang Diproses",
    selesai: "Selesai",
    ditolak: "Ditolak",
  })[s] ?? s;
const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
const hhmm = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function ProgressLaporan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, isLoading } = useQuery({
    queryKey: ["laporan", id],
    queryFn: () => getLaporanDetail(id),
  });

  if (isLoading || !r) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const bukti: string[] = r.bukti ?? (r.foto ? [r.foto] : []);
  const timeline = [
    {
      title: "Laporan Diterima",
      catatan: "Laporan Anda telah masuk ke sistem.",
      tanggal: r.tanggal,
      done: true,
    },
    ...(r.progress ?? []).map((p: any) => ({
      title: statusLabel(p.status),
      catatan: p.catatan,
      tanggal: p.tanggal,
      done: true,
    })),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Progress Laporan</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        {/* Ringkasan */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{r.judul}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{statusLabel(r.status)}</Text>
            </View>
          </View>
          <Text style={styles.sub}>Laporan #{r.id}</Text>
          <View style={styles.metaRow}>
            <Feather name="clock" size={14} color={colors.subtext} />
            <Text style={styles.meta}>{fmt(r.tanggal)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={14} color={colors.subtext} />
            <Text style={styles.meta}>{r.alamat ?? "-"}</Text>
          </View>
        </View>

        {/* Detail */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detail Laporan</Text>
          <Text style={styles.fieldLabel}>Kategori</Text>
          <View style={styles.kat}>
            <Text style={styles.katText}>{r.kategori}</Text>
          </View>
          <Text style={styles.fieldLabel}>Deskripsi</Text>
          <Text style={styles.desc}>{r.deskripsi}</Text>
          {bukti.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Foto Bukti Awal</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {bukti.map((b, i) => (
                  <Image key={i} source={{ uri: b }} style={styles.bukti} />
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline Progress</Text>
          {timeline.map((t, i) => (
            <View key={i} style={styles.tItem}>
              <View style={styles.tLeft}>
                <View style={[styles.tDot, { backgroundColor: colors.brand }]}>
                  <Feather name="check" size={12} color={colors.white} />
                </View>
                {i < timeline.length - 1 && <View style={styles.tLine} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 18 }}>
                <View style={styles.tHead}>
                  <Text style={styles.tTitle}>{t.title}</Text>
                  <Text style={styles.tTime}>{hhmm(t.tanggal)}</Text>
                </View>
                <Text style={styles.tDate}>{fmt(t.tanggal)}</Text>
                {!!t.catatan && <Text style={styles.tNote}>{t.catatan}</Text>}
              </View>
            </View>
          ))}
        </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.text },
  chip: {
    backgroundColor: "#DCF3EA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  sub: { color: colors.subtext, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  meta: { color: colors.subtext, fontSize: 13, flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 14,
    marginBottom: 6,
  },
  kat: {
    alignSelf: "flex-start",
    backgroundColor: "#DCF3EA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  katText: { color: colors.brand, fontSize: 12, fontWeight: "600" },
  desc: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bukti: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
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
  tLine: { flex: 1, width: 2, backgroundColor: "#D8EFE7", marginVertical: 2 },
  tHead: { flexDirection: "row", justifyContent: "space-between" },
  tTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  tTime: { fontSize: 12, color: colors.subtext },
  tDate: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  tNote: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 19 },
});
