import { colors, radius, spacing } from "@/constants/theme";
import { beriUlasan, getPesananDetail } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RATING_LABEL = [
  "",
  "Sangat Buruk",
  "Buruk",
  "Cukup",
  "Baik",
  "Sangat Baik",
];
const MAX = 500;
type Entry = { rating: number; komentar: string };

export default function BeriUlasan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: o, isLoading } = useQuery({
    queryKey: ["pesanan", id],
    queryFn: () => getPesananDetail(id),
    retry: 1,
  });

  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [loading, setLoading] = useState(false);

  // Inisialisasi rating tiap produk (default 5)
  useEffect(() => {
    if (!o?.items) return;
    const init: Record<number, Entry> = {};
    for (const it of o.items)
      if (it.product_id) init[it.product_id] = { rating: 5, komentar: "" };
    setEntries(init);
  }, [o?.id]);

  const setRating = (pid: number, rating: number) =>
    setEntries((e) => ({ ...e, [pid]: { ...e[pid], rating } }));
  const setKomentar = (pid: number, komentar: string) => {
    if (komentar.length <= MAX)
      setEntries((e) => ({ ...e, [pid]: { ...e[pid], komentar } }));
  };

  const kirim = async () => {
    const ulasan = Object.entries(entries).map(([pid, e]) => ({
      product_id: Number(pid),
      rating: e.rating,
      komentar: e.komentar.trim() || undefined,
    }));
    if (ulasan.length === 0) return;
    setLoading(true);
    try {
      await beriUlasan(id, { ulasan });
      qc.invalidateQueries({ queryKey: ["pesanan"] });
      Alert.alert("Terima kasih", "Ulasan Anda berhasil dikirim.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat mengirim ulasan.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (isLoading)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );

  const items = (o?.items ?? []).filter((it: any) => it.product_id);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Beri Ulasan</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <Text style={styles.toko}>{o?.umkm}</Text>
        {items.map((it: any) => {
          const e = entries[it.product_id] ?? { rating: 5, komentar: "" };
          return (
            <View key={it.product_id} style={styles.card}>
              <View style={styles.prodRow}>
                <View style={styles.prodIcon}>
                  <Feather name="shopping-bag" size={18} color={colors.brand} />
                </View>
                <Text style={styles.prodNama} numberOfLines={2}>
                  {it.nama}
                </Text>
              </View>

              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setRating(it.product_id, n)}
                    hitSlop={4}
                  >
                    <Feather
                      name="star"
                      size={34}
                      color={n <= e.rating ? "#F59E0B" : "#D8E3DD"}
                      style={{ marginHorizontal: 3 }}
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>{RATING_LABEL[e.rating]}</Text>

              <TextInput
                style={styles.input}
                value={e.komentar}
                onChangeText={(t) => setKomentar(it.product_id, t)}
                placeholder="Tulis ulasan (opsional)..."
                placeholderTextColor="#9AA5B1"
                multiline
              />
              <Text style={styles.counter}>
                {e.komentar.length} / {MAX}
              </Text>
            </View>
          );
        })}
        {items.length === 0 && (
          <Text style={styles.empty}>Tidak ada produk untuk diulas.</Text>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.submit, loading && { opacity: 0.7 }]}
          onPress={kirim}
          disabled={loading || items.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Kirim Ulasan</Text>
          )}
        </Pressable>
      </View>
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
  toko: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.subtext,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  prodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  prodIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  prodNama: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  stars: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  ratingLabel: {
    textAlign: "center",
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 70,
    color: colors.text,
    textAlignVertical: "top",
  },
  counter: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 30 },
  bottom: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submit: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
