import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";

const rp = (n: number) => `Rp ${Math.round(Number(n)).toLocaleString("id-ID")}`;
const tgl = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const jam = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
const trxId = (n: number) => "TRX-" + String(n).padStart(6, "0");

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  menunggu: { label: "Menunggu", color: "#B45309", bg: "#FEF3C7" },
  disetujui: { label: "Disetujui", color: "#1D4ED8", bg: "#DBEAFE" },
  selesai: { label: "Berhasil", color: "#fff", bg: colors.brand },
  ditolak: { label: "Ditolak", color: "#fff", bg: colors.danger },
};

export default function DetailTransaksi() {
  const p = useLocalSearchParams<{ tipe?: string; data?: string }>();
  const tipe = p.tipe === "penarikan" ? "penarikan" : "setoran";
  let d: any = {};
  try { d = p.data ? JSON.parse(p.data) : {}; } catch {}

  const isSetor = tipe === "setoran";
  const jumlah = isSetor ? d.total_nilai : d.jumlah;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Detail Transaksi</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {/* Card ringkasan */}
        <View style={[styles.hero, { backgroundColor: isSetor ? colors.brand : colors.danger }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Feather name={isSetor ? "trending-up" : "credit-card"} size={20} color={colors.white} /></View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{isSetor ? "Setoran" : "Penarikan"}</Text></View>
          </View>
          <Text style={styles.heroTitle}>{isSetor ? (d.rincian?.[0]?.jenis ? `Setoran ${d.rincian[0].jenis}` : "Setoran Sampah") : "Penarikan Saldo"}</Text>
          <Text style={styles.heroAmount}>{isSetor ? "+" : "-"}{rp(jumlah)}</Text>
        </View>

        {/* Informasi Transaksi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Transaksi</Text>
          <Row icon="hash" label="ID Transaksi" value={trxId(d.id)} />
          <Row icon="calendar" label="Tanggal" value={d.tanggal ? tgl(d.tanggal) : "-"} />
          <Row icon="clock" label="Waktu" value={d.tanggal ? jam(d.tanggal) : "-"} last />
        </View>

        {isSetor ? (
          <>
            {!!d.bank_sampah && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Lokasi Setoran</Text>
                <View style={styles.locRow}>
                  <View style={styles.locIcon}><Feather name="map-pin" size={18} color={colors.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locName}>{d.bank_sampah}</Text>
                    <Text style={styles.locSub}>Total berat: {d.total_berat} kg</Text>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detail Barang</Text>
              {(d.rincian ?? []).map((it: any, i: number) => (
                <View key={i} style={styles.barang}>
                  <View style={styles.barangIcon}><Feather name="box" size={18} color={colors.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.barangNama}>{it.jenis}</Text>
                    <Text style={styles.barangSub}>{it.berat} kg</Text>
                  </View>
                  <Text style={styles.barangVal}>{rp(it.subtotal)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{rp(d.total_nilai)}</Text></View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rekening Tujuan</Text>
              <Row2 label="Nama Bank" value={d.nama_bank ?? d.metode ?? "-"} />
              <Row2 label="No. Rekening" value={d.no_rekening ?? "-"} />
              <Row2 label="Atas Nama" value={d.atas_nama ?? "-"} last />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status Penarikan</Text>
              <View style={styles.statusRow}>
                <Text style={styles.locSub}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS[d.status]?.bg) ?? "#E2E8F0" }]}>
                  <Text style={[styles.statusText, { color: (STATUS[d.status]?.color) ?? colors.text }]}>{STATUS[d.status]?.label ?? d.status ?? "-"}</Text>
                </View>
              </View>
              {!!d.catatan && <Text style={styles.catatan}>{d.catatan}</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, last }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}><Feather name={icon} size={15} color={colors.subtext} /><Text style={styles.rowLabel}>{label}</Text></View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
function Row2({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14 },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  hero: { borderRadius: radius.lg, padding: spacing.lg },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  heroBadge: { backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  heroBadgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  heroTitle: { color: colors.white, fontSize: 16, fontWeight: "600", marginTop: 16 },
  heroAmount: { color: colors.white, fontSize: 28, fontWeight: "800", marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginTop: 16 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { color: colors.subtext, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "600", maxWidth: "55%", textAlign: "right" },
  locRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 },
  locIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  locName: { fontSize: 14, fontWeight: "700", color: colors.text },
  locSub: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  barang: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  barangIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#EAF7F1", alignItems: "center", justifyContent: "center" },
  barangNama: { fontSize: 14, fontWeight: "600", color: colors.text },
  barangSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  barangVal: { fontSize: 14, fontWeight: "700", color: colors.brand },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 6 },
  totalLabel: { fontSize: 14, color: colors.subtext, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800", color: colors.brand },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  statusText: { fontWeight: "700", fontSize: 13 },
  catatan: { color: colors.subtext, fontSize: 13, marginTop: 10, lineHeight: 18 },
});
