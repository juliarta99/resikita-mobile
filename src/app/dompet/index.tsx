import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getHargaSampah, getSaldo, getTransaksi } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const asList = (d: any) => (Array.isArray(d) ? d : (d?.data ?? []));
const isKredit = (tipe: any) =>
  /kredit|setor|masuk|deposit|in/i.test(String(tipe));

// Normalisasi katalog harga ke bentuk [{ kategori, items: [...] }]
// Mendukung: sudah ter-grup ({kategori, items}) ATAU list datar ({jenis_sampah, kategori, ...}).
function normalizeKatalog(raw: any): { kategori: string; items: any[] }[] {
  const arr = asList(raw);
  if (arr.length === 0) return [];

  // Sudah ter-grup?
  if (arr[0] && Array.isArray(arr[0].items)) {
    return arr.map((g: any) => ({
      kategori: g.kategori ?? "Lainnya",
      items: g.items ?? [],
    }));
  }

  // List datar -> kelompokkan per kategori
  const map: Record<string, any[]> = {};
  for (const it of arr) {
    const kat = it.kategori ?? "Lainnya";
    (map[kat] ||= []).push(it);
  }
  return Object.entries(map).map(([kategori, items]) => ({ kategori, items }));
}

export default function Dompet() {
  const { user } = useAuth();
  const [qr, setQr] = useState(false);

  const saldoQ = useQuery({ queryKey: ["saldo"], queryFn: getSaldo });
  const trxQ = useQuery({ queryKey: ["transaksi"], queryFn: getTransaksi });
  const hargaQ = useQuery({
    queryKey: ["harga-sampah"],
    queryFn: getHargaSampah,
  });

  const saldo = saldoQ.data ?? Number(user?.saldo ?? 0);
  const trx = asList(trxQ.data);
  const now = new Date();
  const bulanIni = trx
    .filter(
      (t: any) =>
        isKredit(t.tipe) &&
        new Date(t.tanggal).getMonth() === now.getMonth() &&
        new Date(t.tanggal).getFullYear() === now.getFullYear(),
    )
    .reduce((n: number, t: any) => n + Math.abs(Number(t.jumlah)), 0);
  const terakhir = trx[0]?.tanggal
    ? new Date(trx[0].tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : "-";

  const katalog = normalizeKatalog(hargaQ.data);

  const qrUrl = user?.kode_qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=8&data=${encodeURIComponent(user.kode_qr)}`
    : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Bank Sampah</Text>
        <Pressable
          onPress={() => router.push("/dompet/riwayat" as any)}
          hitSlop={10}
          style={{ marginLeft: "auto" }}
        >
          <Feather name="clock" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        {/* Saldo card */}
        <View style={styles.saldoCard}>
          <View style={styles.saldoTop}>
            <View>
              <Text style={styles.saldoLabel}>Total Saldo Anda</Text>
              <Text style={styles.saldoValue}>{rp(saldo)}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Feather name="credit-card" size={22} color={colors.white} />
            </View>
          </View>
          <View style={styles.saldoSubRow}>
            <View style={styles.saldoSub}>
              <Text style={styles.subLabel}>Bulan Ini</Text>
              <Text style={styles.subValue}>+{rp(bulanIni)}</Text>
            </View>
            <View style={styles.saldoSub}>
              <Text style={styles.subLabel}>Transaksi Terakhir</Text>
              <Text style={styles.subValue}>{terakhir}</Text>
            </View>
          </View>
        </View>

        {/* Aksi */}
        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={() => setQr(true)}>
            <View style={styles.actionIcon}>
              <Feather name="maximize" size={22} color={colors.white} />
            </View>
            <Text style={styles.actionTitle}>QR Code</Text>
            <Text style={styles.actionSub}>Tunjukkan ke petugas</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/dompet/tarik" as any)}
          >
            <View style={styles.actionIcon}>
              <Feather name="arrow-up-right" size={22} color={colors.white} />
            </View>
            <Text style={styles.actionTitle}>Tarik Saldo</Text>
            <Text style={styles.actionSub}>Ke rekening bank</Text>
          </Pressable>
        </View>

        {/* Katalog Harga */}
        <View style={styles.katalog}>
          <Text style={styles.katalogTitle}>Katalog Harga Real-Time</Text>
          {hargaQ.isLoading ? (
            <ActivityIndicator
              color={colors.brand}
              style={{ marginVertical: 20 }}
            />
          ) : katalog.length === 0 ? (
            <Text style={styles.empty}>Belum ada data harga.</Text>
          ) : (
            katalog.map((g, gi) => (
              <View key={g.kategori ?? gi} style={{ marginTop: 8 }}>
                <Text style={styles.kategori}>{g.kategori}</Text>
                {(g.items ?? []).map((it: any, ii: number) => (
                  <View key={it.id ?? ii} style={styles.hargaRow}>
                    <View style={styles.hargaThumb}>
                      <Feather name="box" size={18} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hargaNama}>{it.jenis_sampah}</Text>
                      <Text style={styles.hargaSat}>
                        per {it.satuan ?? "kg"}
                      </Text>
                    </View>
                    <Text style={styles.hargaVal}>{rp(it.harga_per_kg)}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Modal */}
      <Modal
        visible={qr}
        transparent
        animationType="slide"
        onRequestClose={() => setQr(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.qrSheet}>
            <View style={styles.qrHead}>
              <Text style={styles.qrTitle}>QR Code Anda</Text>
              <Pressable onPress={() => setQr(false)} hitSlop={10}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.qrBox}>
              {qrUrl ? (
                <Image
                  source={{ uri: qrUrl }}
                  style={styles.qrImg}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.empty}>ID nasabah belum tersedia.</Text>
              )}
              <Text style={styles.qrIdLabel}>ID Nasabah</Text>
              <Text style={styles.qrId}>{user?.kode_qr ?? "-"}</Text>
            </View>
            <Text style={styles.qrDesc}>
              Tunjukkan QR Code ini ke petugas Bank Sampah untuk mencatat
              setoran Anda.
            </Text>
            <Pressable style={styles.qrClose} onPress={() => setQr(false)}>
              <Text style={styles.qrCloseText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  saldoCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  saldoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  saldoLabel: { color: colors.white70, fontSize: 13 },
  saldoValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  saldoSubRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  saldoSub: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.md,
    padding: 12,
  },
  subLabel: { color: colors.white70, fontSize: 12 },
  subValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  actionRow: { flexDirection: "row", gap: 14, marginTop: 16 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  actionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  actionSub: { fontSize: 12, color: colors.subtext },
  katalog: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  katalogTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  kategori: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.subtext,
    marginTop: 10,
    marginBottom: 6,
  },
  hargaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  hargaThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  hargaNama: { fontSize: 14, fontWeight: "600", color: colors.text },
  hargaSat: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  hargaVal: { fontSize: 14, fontWeight: "700", color: colors.brand },
  empty: { color: colors.subtext, textAlign: "center", paddingVertical: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  qrSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 30,
  },
  qrHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  qrTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  qrBox: {
    backgroundColor: "#E9F7F0",
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  qrImg: {
    width: 220,
    height: 220,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  qrIdLabel: { color: colors.subtext, fontSize: 13, marginTop: 16 },
  qrId: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 1,
  },
  qrDesc: {
    color: colors.subtext,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  qrClose: {
    backgroundColor: colors.brand,
    height: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  qrCloseText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
