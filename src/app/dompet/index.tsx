import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { saldoDompet, transaksiDompet } from "@/lib/api/dompet";
import BarisMutasi from "@/components/BarisMutasi";
import { formatRupiah } from "@/lib/rupiah";

const AKSI: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub: string;
  ke: string;
}[] = [
  {
    icon: "maximize",
    label: "QR Nasabah",
    sub: "Tunjukkan saat menyetor",
    ke: "/dompet/qr",
  },
  {
    icon: "arrow-up-circle",
    label: "Tarik Saldo",
    sub: "Ke rekening bank",
    ke: "/dompet/tarik",
  },
  {
    icon: "package",
    label: "Riwayat Setoran",
    sub: "Rincian sampah disetor",
    ke: "/setoran",
  },
  {
    icon: "file-text",
    label: "Riwayat Penarikan",
    sub: "Status pencairan saldo",
    ke: "/dompet/penarikan",
  },
];

export default function Dompet() {
  const saldoQ = useQuery({
    queryKey: ["dompet", "saldo"],
    queryFn: saldoDompet,
  });

  // Hanya halaman pertama: ini pratinjau, bukan daftar lengkap. Yang lengkap
  // ada di layar riwayat dengan paginasinya sendiri.
  const mutasiQ = useQuery({
    queryKey: ["dompet", "transaksi", "pratinjau"],
    queryFn: () => transaksiDompet({ per_page: 5 }),
  });

  const mutasi = mutasiQ.data?.data ?? [];
  const bulanIni = saldoQ.data?.ringkasan_bulan_ini;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Dompet</Text>
        <Pressable
          onPress={() => router.push("/dompet/riwayat" as Href)}
          hitSlop={10}
          style={{ marginLeft: "auto" }}
          accessibilityRole="button"
          accessibilityLabel="Riwayat mutasi saldo"
        >
          <Feather name="clock" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        {/* Saldo */}
        <View style={styles.saldoCard}>
          <View style={styles.saldoTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.saldoLabel}>Total Saldo Anda</Text>
              {saldoQ.isLoading ? (
                <Text style={styles.saldoValue}>—</Text>
              ) : saldoQ.isError ? (
                <Text style={styles.saldoGagal}>Gagal memuat saldo</Text>
              ) : (
                <Text
                  style={styles.saldoValue}
                  accessibilityLabel={`Saldo Anda ${formatRupiah(saldoQ.data?.saldo ?? 0)}`}
                >
                  {formatRupiah(saldoQ.data?.saldo ?? 0)}
                </Text>
              )}
            </View>
            <View style={styles.walletIcon}>
              <Feather name="credit-card" size={22} color={colors.white} />
            </View>
          </View>
          {saldoQ.isError && (
            <Pressable
              onPress={() => saldoQ.refetch()}
              style={styles.saldoRetry}
              accessibilityRole="button"
              accessibilityLabel="Muat ulang saldo"
            >
              <Feather name="refresh-cw" size={13} color={colors.white} />
              <Text style={styles.saldoRetryTeks}>Coba lagi</Text>
            </Pressable>
          )}

          {/*
            Ringkasan bulan berjalan ikut di respons saldo, jadi menampilkannya
            di sini tidak menambah satu pun permintaan.
          */}
          {!!bulanIni && (
            <View style={styles.ringkasan}>
              <View style={styles.ringkasanKolom}>
                <Text style={styles.ringkasanLabel}>Masuk bulan ini</Text>
                <Text style={styles.ringkasanNilai}>
                  +{formatRupiah(bulanIni.masuk)}
                </Text>
              </View>
              <View style={styles.ringkasanPemisah} />
              <View style={styles.ringkasanKolom}>
                <Text style={styles.ringkasanLabel}>Keluar bulan ini</Text>
                <Text style={styles.ringkasanNilai}>
                  −{formatRupiah(bulanIni.keluar)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Aksi */}
        <View style={styles.aksiRow}>
          {AKSI.map((a) => (
            <Pressable
              key={a.ke}
              style={styles.aksiCard}
              onPress={() => router.push(a.ke as Href)}
              accessibilityRole="button"
              accessibilityLabel={`${a.label}. ${a.sub}`}
            >
              <View style={styles.aksiIcon}>
                <Feather name={a.icon} size={20} color={colors.white} />
              </View>
              <Text style={styles.aksiLabel}>{a.label}</Text>
              <Text style={styles.aksiSub}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/*
          Katalog harga tidak lagi ada di sini.
          Harga kini ditetapkan per bank sampah, bukan berlaku nasional, jadi
          menampilkan satu daftar "harga sampah" di dompet akan menjanjikan
          angka yang belum tentu pengguna terima di unit tempat ia menyetor.
        */}
        <Pressable
          style={styles.hargaTaut}
          onPress={() => router.push("/peta" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Cari bank sampah terdekat untuk melihat katalog harganya"
        >
          <Feather name="tag" size={18} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hargaJudul}>Katalog Harga Sampah</Text>
            <Text style={styles.hargaSub}>
              Setiap bank sampah menetapkan harganya sendiri. Pilih unit terdekat
              untuk melihat daftarnya.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.subtext} />
        </Pressable>

        {/* Mutasi terbaru */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Mutasi Terbaru</Text>
          <Pressable
            onPress={() => router.push("/dompet/riwayat" as Href)}
            accessibilityRole="button"
            accessibilityLabel="Lihat semua mutasi"
          >
            <Text style={styles.lihatSemua}>Lihat semua</Text>
          </Pressable>
        </View>

        {mutasiQ.isLoading ? (
          <View style={styles.kotakMuat}>
            <LoadingState pesan="Memuat mutasi…" />
          </View>
        ) : mutasiQ.isError ? (
          <View style={styles.kotakMuat}>
            <ErrorState
              error={mutasiQ.error}
              onCobaLagi={() => mutasiQ.refetch()}
            />
          </View>
        ) : mutasi.length === 0 ? (
          <View style={styles.kotakMuat}>
            <EmptyState
              icon="inbox"
              judul="Belum ada mutasi"
              pesan="Setoran pertama Anda akan muncul di sini."
            />
          </View>
        ) : (
          mutasi.map((m) => <BarisMutasi key={m.id} m={m} />)
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
  saldoCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  saldoTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  saldoLabel: { color: colors.white70, fontSize: 13 },
  saldoValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  saldoGagal: { color: colors.white, fontSize: 15, marginTop: 6 },
  saldoRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 44,
  },
  saldoRetryTeks: { color: colors.white, fontWeight: "700", fontSize: 13 },
  ringkasan: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white15,
  },
  ringkasanKolom: { flex: 1 },
  ringkasanPemisah: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.white15,
    marginHorizontal: 12,
  },
  ringkasanLabel: { color: colors.white70, fontSize: 11 },
  ringkasanNilai: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  aksiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  aksiCard: {
    // Empat kartu dalam dua baris; lebar dipatok persen supaya tetap rapi
    // saat membungkus, alih-alih `flex: 1` yang membuat baris terakhir melebar.
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
    minHeight: 110,
  },
  aksiIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  aksiLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  aksiSub: { fontSize: 11, color: colors.subtext, lineHeight: 15 },
  hargaTaut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  hargaJudul: { fontSize: 14, fontWeight: "700", color: colors.text },
  hargaSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    lineHeight: 17,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  lihatSemua: { color: colors.link, fontWeight: "700", fontSize: 13 },
  kotakMuat: { minHeight: 180 },
  mutasi: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  mutasiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mutasiLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  mutasiTanggal: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  mutasiNominal: { fontSize: 14, fontWeight: "700" },
});
