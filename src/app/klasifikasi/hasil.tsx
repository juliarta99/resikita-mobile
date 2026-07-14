import TypingDots from "@/components/TypingDots";
import { colors, radius, spacing } from "@/constants/theme";
import { klasifikasi } from "@/lib/api";
import { katColor } from "@/lib/katColor";
import { Feather } from "@expo/vector-icons";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Hasil() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await klasifikasi(uri);
        if (alive) {
          setData(res);
          setLoading(false);
        }
      } catch (e: any) {
        if (alive) {
          setError(
            e?.response?.data?.message ?? "Klasifikasi gagal. Coba lagi.",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <View style={styles.analyzeIcon}>
          <Feather name="zap" size={34} color={colors.brand} />
        </View>
        <Text style={styles.analyzeTitle}>Menganalisis Gambar…</Text>
        <Text style={styles.analyzeSub}>
          AI sedang mengidentifikasi jenis sampah dan memberikan saran terbaik
        </Text>
        <View style={{ marginTop: 20 }}>
          <TypingDots />
        </View>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Batalkan</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Feather name="alert-triangle" size={40} color={colors.danger} />
        <Text style={styles.analyzeTitle}>Gagal</Text>
        <Text style={styles.analyzeSub}>{error}</Text>
        <Pressable style={styles.retry} onPress={() => router.back()}>
          <Text style={styles.retryText}>Kembali</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const kc = katColor(data.kategori);
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Hasil Klasifikasi</Text>
        <Pressable
          onPress={() => router.push("/klasifikasi/riwayat" as Href)}
          hitSlop={10}
        >
          <Feather name="clock" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Gambar + bounding box */}
        <View style={styles.imgWrap}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill as any}
            resizeMode="cover"
          />
          <View style={styles.boxLabel}>
            <Text style={styles.boxLabelText}>{data.hasil_jenis}</Text>
          </View>
          <View style={styles.box} />
        </View>

        {/* Kartu hasil */}
        <View style={styles.result}>
          <View style={styles.resultHead}>
            <Feather name="check-circle" size={18} color={colors.white} />
            <Text style={styles.resultOk}>Teridentifikasi!</Text>
          </View>
          <Text style={styles.resultName}>{data.hasil_jenis}</Text>
          {!!data.deskripsi && (
            <Text style={styles.resultDesc}>{data.deskripsi}</Text>
          )}
          <View style={styles.metrics}>
            <Metric
              label="Kategori"
              value={`${data.kategori_label}${data.material ? " - " + data.material : ""}`}
            />
            <Metric label="Akurasi" value={`${data.akurasi_persen}%`} />
            <Metric
              label="Nilai/kg"
              value={
                data.nilai_jual > 0
                  ? `Rp ${Number(data.nilai_jual).toLocaleString("id-ID")}`
                  : "-"
              }
            />
          </View>
        </View>

        {/* Langkah pengolahan */}
        {(data.langkah_pengolahan ?? []).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Feather name="refresh-ccw" size={16} color={colors.white} />
              </View>
              <Text style={styles.cardTitle}>Langkah Pengolahan</Text>
            </View>
            {data.langkah_pengolahan.map((l: string, i: number) => (
              <View key={i} style={styles.langkah}>
                <View style={styles.langkahNum}>
                  <Text style={styles.langkahNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.langkahText}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {!!data.rekomendasi && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Feather name="award" size={16} color={colors.white} />
              </View>
              <Text style={styles.cardTitle}>Rekomendasi Daur Ulang</Text>
            </View>
            <Text style={styles.rekom}>{data.rekomendasi}</Text>
          </View>
        )}

        <Pressable
          style={styles.again}
          onPress={() => router.replace("/aksi" as Href)}
        >
          <Feather name="camera" size={18} color={colors.white} />
          <Text style={styles.againText}>Pindai Lagi</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: "#EF4444",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  cancelText: { color: colors.white, fontWeight: "700" },
  retry: {
    marginTop: 24,
    backgroundColor: colors.brand,
    paddingHorizontal: 30,
    paddingVertical: 12,
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
  imgWrap: {
    height: 300,
    backgroundColor: "#DDE6E2",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    position: "absolute",
    top: 40,
    left: 40,
    right: 40,
    bottom: 40,
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: 16,
  },
  boxLabel: {
    position: "absolute",
    top: 24,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    zIndex: 2,
  },
  boxLabelText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  result: {
    backgroundColor: colors.brand,
    margin: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
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
    marginTop: 8,
    lineHeight: 19,
  },
  metrics: { flexDirection: "row", gap: 10, marginTop: 16 },
  metric: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
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
