import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import KategoriBadge from "@/components/KategoriBadge";
import TypingDots from "@/components/TypingDots";
import ErrorState from "@/components/states/ErrorState";
import { colors, radius, spacing } from "@/constants/theme";
import { klasifikasi } from "@/lib/api/klasifikasi";
import { fotoSementara } from "@/lib/fotoSementara";
import { formatRupiahOpsional } from "@/lib/rupiah";

export default function Hasil() {
  // URI dibaca dari memori, BUKAN dari params router: karakter ter-encode
  // seperti %40 dan %2F rusak saat dilempar antar-layar. `useState(() => ...)`
  // membacanya sekali saat mount sehingga tetap ada meski penampungnya
  // dibersihkan kemudian.
  const [uri] = useState(() => fotoSementara.get());

  /**
   * Klasifikasi memakai `useQuery` walau endpointnya `POST`.
   *
   * Yang dibutuhkan layar ini persis yang diberikan Query: satu pemanggilan,
   * keadaan memuat dan galat, serta tombol coba lagi. Risikonya adalah
   * pemanggilan ulang tak sengaja yang membuat riwayat ganda — karena itu tiga
   * pagar di bawah bukan hiasan: `retry: false` (API-DOCS §15 melarang
   * mengulang POST otomatis), `staleTime: Infinity` supaya kembali ke layar ini
   * tidak memicu unggah ulang, dan kunci berbasis URI supaya foto yang sama
   * tidak pernah dikirim dua kali.
   */
  const q = useQuery({
    queryKey: ["klasifikasi", "unggah", uri],
    queryFn: () => klasifikasi(uri!),
    enabled: !!uri,
    retry: false,
    staleTime: Infinity,
    refetchOnReconnect: false,
  });

  const pindaiLagi = () => {
    fotoSementara.clear();
    router.replace("/aksi" as Href);
  };

  if (!uri) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Feather name="image" size={40} color={colors.subtext} />
        <Text style={styles.analyzeTitle}>Foto tidak ditemukan</Text>
        <Text style={styles.analyzeSub}>
          Fotonya tidak sampai ke layar ini. Silakan pindai ulang.
        </Text>
        <Pressable
          style={styles.retry}
          onPress={pindaiLagi}
          accessibilityRole="button"
          accessibilityLabel="Pindai ulang"
        >
          <Text style={styles.retryText}>Pindai Ulang</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (q.isLoading) {
    return (
      <SafeAreaView
        style={[styles.screen, styles.center]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.analyzeIcon}>
          <Feather name="zap" size={34} color={colors.brand} />
        </View>
        <Text style={styles.analyzeTitle}>Menganalisis Gambar…</Text>
        <Text style={styles.analyzeSub}>
          Biasanya butuh 3–8 detik. Jangan tutup layar ini.
        </Text>
        <View style={{ marginTop: 20 }}>
          <TypingDots />
        </View>
        <Pressable
          style={styles.cancel}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Batalkan analisis"
        >
          <Text style={styles.cancelText}>Batalkan</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Appbar />
        {/*
          Gagal 503 berarti layanan AI tidak dapat dihubungi. Fotonya tidak
          tersimpan dan tidak ada riwayat yang terbentuk, jadi mencoba ulang
          aman dan tidak akan menghasilkan entri ganda.
        */}
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const d = q.data;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Appbar />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imgWrap}>
          <Image
            source={{ uri: d.foto_url || uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={`Foto sampah yang dikenali sebagai ${d.jenis}`}
          />
        </View>

        {/*
          Peringatan penanganan untuk B3 dan elektronik ditaruh paling atas,
          sebelum apa pun. Isinya ditambahkan peladen dan tidak bergantung pada
          jawaban model, jadi ia tetap benar bahkan ketika keyakinannya rendah —
          dan justru di kasus itulah salah tangani paling berbahaya.
        */}
        {!!d.catatan && (
          <View style={styles.peringatan} accessibilityLiveRegion="polite">
            <Feather name="alert-triangle" size={18} color="#B91C1C" />
            <Text style={styles.peringatanTeks}>{d.catatan}</Text>
          </View>
        )}

        <View
          style={[
            styles.result,
            d.keyakinan_rendah && styles.resultRagu,
          ]}
        >
          <View style={styles.resultHead}>
            <Feather
              name={d.keyakinan_rendah ? "help-circle" : "check-circle"}
              size={18}
              color={colors.white}
            />
            <Text style={styles.resultOk}>
              {d.keyakinan_rendah ? "Dugaan sementara" : "Teridentifikasi!"}
            </Text>
          </View>
          <Text style={styles.resultName}>{d.jenis}</Text>

          <View style={{ marginTop: 10 }}>
            <KategoriBadge kategori={d.kategori} label={d.kategori_label} />
          </View>

          {!!d.kategori_deskripsi && (
            <Text style={styles.resultDesc}>{d.kategori_deskripsi}</Text>
          )}

          <View style={styles.metrics}>
            <Metric
              label="Material"
              value={d.material ?? "—"}
            />
            <Metric label="Keyakinan" value={`${Math.round(d.confidence)}%`} />
            <Metric
              label="Perkiraan nilai"
              value={formatRupiahOpsional(d.estimasi_nilai)}
            />
          </View>

          {d.estimasi_nilai != null && (
            <Text style={styles.catatanNilai}>
              Perkiraan dari katalog bank sampah terdaftar, bukan harga pasti.
            </Text>
          )}
        </View>

        {/*
          Ketika peladen menandai keyakinannya rendah, tawaran memotret ulang
          harus menonjol — bukan disembunyikan di bawah seperti tombol biasa.
          Ambangnya ditentukan peladen supaya hasil yang sama tidak tampil
          sebagai kepastian di satu klien dan dugaan di klien lain.
        */}
        {d.keyakinan_rendah && (
          <View style={styles.raguKotak}>
            <Text style={styles.raguJudul}>Hasil ini belum meyakinkan</Text>
            <Text style={styles.raguTeks}>
              Foto yang lebih terang, lebih dekat, dan berlatar polos biasanya
              memberi hasil yang jauh lebih tepat.
            </Text>
            <Pressable
              style={styles.raguTombol}
              onPress={pindaiLagi}
              accessibilityRole="button"
              accessibilityLabel="Potret ulang sampah ini"
            >
              <Feather name="camera" size={16} color={colors.white} />
              <Text style={styles.raguTombolTeks}>Potret Ulang</Text>
            </Pressable>
          </View>
        )}

        {d.langkah_pengolahan.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Feather name="refresh-ccw" size={16} color={colors.white} />
              </View>
              <Text style={styles.cardTitle}>Langkah Pengolahan</Text>
            </View>
            {d.langkah_pengolahan.map((l, i) => (
              <View key={i} style={styles.langkah}>
                <View style={styles.langkahNum}>
                  <Text style={styles.langkahNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.langkahText}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {!!d.rekomendasi_daur_ulang && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Feather name="award" size={16} color={colors.white} />
              </View>
              <Text style={styles.cardTitle}>Rekomendasi Daur Ulang</Text>
            </View>
            <Text style={styles.rekom}>{d.rekomendasi_daur_ulang}</Text>
          </View>
        )}

        <Pressable
          style={styles.again}
          onPress={pindaiLagi}
          accessibilityRole="button"
          accessibilityLabel="Pindai sampah lain"
        >
          <Feather name="camera" size={18} color={colors.white} />
          <Text style={styles.againText}>Pindai Lagi</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Appbar() {
  return (
    <View style={styles.appbar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.appbarTitle}>Hasil Klasifikasi</Text>
      <Pressable
        onPress={() => router.push("/klasifikasi/riwayat" as Href)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Riwayat klasifikasi"
      >
        <Feather name="clock" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  center: { alignItems: "center", justifyContent: "center", padding: 40 },
  analyzeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 24,
  },
  analyzeSub: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  cancel: {
    marginTop: 40,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.danger,
    paddingHorizontal: 30,
    borderRadius: radius.pill,
  },
  cancelText: { color: colors.white, fontWeight: "700" },
  retry: {
    marginTop: 24,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: 30,
    borderRadius: radius.pill,
  },
  retryText: { color: colors.white, fontWeight: "700" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  imgWrap: { height: 280, backgroundColor: "#DDE6E2" },
  peringatan: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 14,
    margin: spacing.lg,
    marginBottom: 0,
  },
  peringatanTeks: {
    flex: 1,
    color: "#7F1D1D",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  result: {
    backgroundColor: colors.brand,
    margin: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  resultRagu: { backgroundColor: "#475569" },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultOk: { color: colors.white, fontWeight: "700" },
  resultName: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  resultDesc: {
    color: colors.white70,
    fontSize: 13,
    marginTop: 10,
    lineHeight: 19,
  },
  metrics: { flexDirection: "row", gap: 10, marginTop: 16 },
  metric: {
    flex: 1,
    backgroundColor: colors.white15,
    borderRadius: radius.md,
    padding: 12,
  },
  metricLabel: { color: colors.white70, fontSize: 11 },
  metricValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  catatanNilai: {
    color: colors.white70,
    fontSize: 11,
    marginTop: 10,
    lineHeight: 16,
  },
  raguKotak: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: 14,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  raguJudul: { fontSize: 15, fontWeight: "700", color: colors.text },
  raguTeks: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 12,
  },
  raguTombol: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  raguTombolTeks: { color: colors.white, fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: 14,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  langkah: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  langkahNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  langkahNumText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  langkahText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  rekom: { color: colors.text, fontSize: 14, lineHeight: 20 },
  again: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginHorizontal: spacing.lg,
    marginTop: 6,
  },
  againText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
