import { colors, radius, spacing } from "@/constants/theme";
import { getArtikel } from "@/lib/api";
import { tipeMeta } from "@/lib/tipeMeta";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
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

const CHIPS = [
  { key: "semua", label: "Semua", icon: "filter" },
  { key: "artikel", label: "Artikel", icon: "file" },
  { key: "panduan", label: "Panduan", icon: "book-open" },
  { key: "tutorial", label: "Tutorial", icon: "video" },
  { key: "jurnal", label: "Jurnal", icon: "file-text" },
];

export default function Edukasi() {
  const [chip, setChip] = useState("semua");
  const [q, setQ] = useState("");
  const sections = chip === "semua" && !q.trim();

  const unggulanQ = useQuery({
    queryKey: ["edu-unggulan"],
    queryFn: () => getArtikel({ unggulan: 1 }),
    enabled: sections,
  });
  const populerQ = useQuery({
    queryKey: ["edu-populer"],
    queryFn: () => getArtikel({ sort: "populer" }),
    enabled: sections,
  });
  const listQ = useQuery({
    queryKey: ["edu-list", chip, q],
    queryFn: () =>
      getArtikel({
        tipe: chip === "semua" ? undefined : chip,
        q: q || undefined,
      }),
    enabled: !sections,
  });

  const unggulan = unggulanQ.data?.data ?? [];
  const populer = populerQ.data?.data ?? [];
  const list = listQ.data?.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Header hijau */}
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.headTitle}>Pusat Edukasi</Text>
          <Feather name="list" size={22} color={colors.white} />
        </View>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.white70} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari artikel, panduan, tutorial..."
            placeholderTextColor={colors.white70}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {/* Chips */}
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CHIPS}
          keyExtractor={(c) => c.key}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.chip, chip === item.key && styles.chipActive]}
              onPress={() => setChip(item.key)}
            >
              <Feather
                name={item.icon as any}
                size={14}
                color={chip === item.key ? colors.white : colors.subtext}
              />
              <Text
                style={[
                  styles.chipText,
                  chip === item.key && { color: colors.white },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {sections ? (
        <FlatList
          data={[
            {
              t: "Konten Unggulan",
              items: unggulan,
              loading: unggulanQ.isLoading,
            },
            {
              t: "Paling Populer",
              items: populer,
              loading: populerQ.isLoading,
            },
          ]}
          keyExtractor={(s) => s.t}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.sectionHead}>
                <Feather name="trending-up" size={16} color={colors.brand} />
                <Text style={styles.sectionTitle}>{item.t}</Text>
              </View>
              {item.loading ? (
                <ActivityIndicator color={colors.brand} />
              ) : item.items.length ? (
                item.items.map((a: any) => <Card key={a.id} a={a} />)
              ) : (
                <Text style={styles.empty}>Belum ada konten.</Text>
              )}
            </View>
          )}
        />
      ) : listQ.isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
          renderItem={({ item }) => <Card a={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>Tidak ada konten ditemukan.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Card({ a }: { a: any }) {
  const m = tipeMeta(a.tipe);
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/edukasi/${a.slug}` as Href)}
    >
      <View style={styles.thumb}>
        {a.thumbnail ? (
          <Image source={{ uri: a.thumbnail }} style={styles.thumbImg} />
        ) : (
          <Feather name="image" size={24} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={[styles.badge, { backgroundColor: m.bg }]}>
          <Feather name={m.icon} size={11} color={m.fg} />
          <Text style={[styles.badgeText, { color: m.fg }]}>{m.label}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {a.judul}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color={colors.subtext} />
          <Text style={styles.meta}>{a.waktu_baca} menit</Text>
          <Feather
            name="eye"
            size={12}
            color={colors.subtext}
            style={{ marginLeft: 10 }}
          />
          <Text style={styles.meta}>
            {Number(a.dilihat).toLocaleString("id-ID")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 16,
    paddingTop: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 14,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, color: colors.white },
  chipsWrap: { paddingVertical: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.subtext, fontWeight: "600", fontSize: 13 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  meta: { fontSize: 12, color: colors.subtext },
  empty: { color: colors.subtext, textAlign: "center", marginVertical: 10 },
});
