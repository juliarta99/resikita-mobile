import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { saldoDompet } from "@/lib/api/dompet";

export default function QrNasabah() {
  const { user } = useAuth();

  /**
   * Kode diambil dari `GET /dompet/saldo`, dengan kode pada profil sebagai
   * cadangan.
   *
   * Tidak ada endpoint `/dompet/qr`: endpoint saldo itulah yang menerbitkan
   * `kode_qr` bila akun belum punya, sehingga memanggilnya sekaligus menjamin
   * kodenya ada. Cadangan dari profil yang membuat layar ini tetap berguna saat
   * sinyal hilang — dan justru di depan meja petugas bank sampah, di dalam
   * gudang berdinding seng, sinyal sering tidak ada.
   */
  const q = useQuery({
    queryKey: ["dompet", "saldo"],
    queryFn: saldoDompet,
  });

  const kode = q.data?.kode_qr ?? user?.kode_qr ?? null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Feather name="arrow-left" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.appbarTitle}>QR Nasabah</Text>
      </View>

      {q.isLoading && !kode ? (
        <LoadingState pesan="Menyiapkan kode…" />
      ) : !kode ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <View style={styles.isi}>
          <View style={styles.kartu}>
            {/*
              QR digambar di perangkat memakai react-native-qrcode-svg.
              Versi sebelumnya mengambil gambar dari api.qrserver.com — itu
              berarti mengirim identitas nasabah ke layanan pihak ketiga setiap
              kali layar dibuka, dan kodenya tidak muncul sama sekali tanpa
              internet. Keduanya masalah nyata di tempat setoran terjadi.
            */}
            <QRCode value={kode} size={220} backgroundColor="#FFFFFF" />

            <Text style={styles.nama}>{user?.name ?? "Nasabah"}</Text>
            <Text
              style={styles.kode}
              selectable
              accessibilityLabel={`Kode nasabah ${kode.split("").join(" ")}`}
            >
              {kode}
            </Text>
          </View>

          <View style={styles.petunjuk}>
            <Feather name="info" size={16} color={colors.white70} />
            <Text style={styles.petunjukTeks}>
              Tunjukkan kode ini ke petugas bank sampah saat menyetor. Setoran
              akan langsung tercatat ke saldo Anda.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.white },
  isi: { flex: 1, alignItems: "center", padding: spacing.lg, gap: spacing.lg },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: 6,
  },
  nama: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
  },
  kode: {
    fontSize: 13,
    color: colors.subtext,
    letterSpacing: 1,
    textAlign: "center",
  },
  petunjuk: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingHorizontal: spacing.sm,
  },
  petunjukTeks: {
    flex: 1,
    color: colors.white70,
    fontSize: 13,
    lineHeight: 19,
  },
});
