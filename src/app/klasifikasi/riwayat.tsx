import { colors, radius, spacing } from "@/constants/theme";
import { getKlasifikasiRiwayat } from "@/lib/api";
import { katColor } from "@/lib/katColor";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CHIPS: { key: string; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "organik", label: "Organik" },
  { key: "anorganik", label: "Anorganik" },
  { key: "b3", label: "B3" },
];
function dayLabel(iso: string) {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (ts >= startToday) return "Hari Ini";
  if (ts >= startToday - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RiwayatKlasifikasi() {
  const qc = useQueryClient();
  const [chip, setChip] = useState("semua");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["klasifikasi-riwayat"],
    queryFn: () => getKlasifikasiRiwayat(),
  });
  useFocusEffect(
    React.useCallback(() => {
      qc.invalidateQueries({ queryKey: ["klasifikasi-riwayat"] });
    }, []),
  );

  const all: any[] = data ?? [];
  const filtered = all.filter(
    (c) =>
      (chip === "semua" || c.kategori === chip) &&
      (c.hasil_jenis?.toLowerCase().includes(q.toLowerCase()) ||
        (c.material ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  type Row = { type: "header"; label: string } | { type: "item"; c: any };
  const rows: Row[] = [];
  let last = "";
  for (const c of filtered) {
    const l = dayLabel(c.tanggal);
    if (l !== last) {
      rows.push({ type: "header", label: l });
      last = l;
    }
    rows.push({ type: "item", c });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Riwayat Klasifikasi</Text>
        <Feather name="calendar" size={22} color={colors.text} />
      </View>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.search}
          placeholder="Cari riwayat..."
          placeholderTextColor="#9AA5B1"
          value={q}
          onChangeText={setQ}
        />
      </View>
      <View style={styles.chips}>
        {CHIPS.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.chip, chip === c.key && styles.chipActive]}
            onPress={() => setChip(c.key)}
          >
            <Text
              style={[
                styles.chipText,
                chip === c.key && { color: colors.white },
              ]}
            >
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) =>
            r.type === "header" ? `h-${r.label}-${i}` : `c-${r.c.id}`
          }
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text style={styles.date}>{item.label}</Text>
            ) : (
              <Card c={item.c} />
            )
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Belum ada riwayat klasifikasi.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Card({ c }: { c: any }) {
  const kc = katColor(c.kategori);
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/klasifikasi/${c.id}` as Href)}
    >
      <View style={styles.thumb}>
        {c.foto ? (
          <Image source={{ uri: c.foto }} style={styles.thumbImg} />
        ) : (
          <Feather name="image" size={22} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {c.hasil_jenis}
          </Text>
          <Text style={styles.time}>{hhmm(c.tanggal)}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: kc.bg }]}>
            <Text style={[styles.badgeText, { color: kc.fg }]}>
              {c.kategori_label}
            </Text>
          </View>
          {!!c.material && (
            <>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.material}>{c.material}</Text>
            </>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.akurasi}>Akurasi: {c.akurasi_persen}%</Text>
          {c.nilai_jual > 0 && (
            <Text style={styles.nilai}>
              Rp {Number(c.nilai_jual).toLocaleString("id-ID")}/kg
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  search: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    color: colors.text,
  },
  chips: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  chip: {
    paddingHorizontal: 18,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  date: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 14,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginRight: 8,
  },
  time: { fontSize: 12, color: colors.subtext },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dot: { color: colors.subtext },
  material: { fontSize: 12, color: colors.subtext },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  akurasi: { fontSize: 12, color: colors.subtext },
  nilai: { fontSize: 12, color: colors.brand, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.subtext, marginTop: 30 },
});
