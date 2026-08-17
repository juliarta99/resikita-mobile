import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

import LencanaArtikel from "@/components/LencanaArtikel";
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { daftarArtikel, kategoriArtikel } from "@/lib/api/artikel";
import { labelTipe, namaKategori } from "@/lib/artikel";
import type { ArtikelRingkas } from "@/types/artikel";
import { urlMedia } from "@/lib/media";

export default function Edukasi() {
  const [kategori, setKategori] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const cariTertunda = useDebounce(cari);

  const kategoriQ = useQuery({
    queryKey: ["artikel", "kategori"],
    queryFn: kategoriArtikel,
    staleTime: 30 * 60_000,
  });

  const q = useInfiniteQuery({
    queryKey: ["artikel", "daftar", kategori, cariTertunda],
    queryFn: ({ pageParam }) =>
      daftarArtikel({
        page: pageParam,
        kategori: kategori ?? undefined,
        cari: cariTertunda.trim() || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const artikel = q.data?.pages.flatMap((h) => h.data) ?? [];

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
        <Text style={styles.appbarTitle}>Edukasi</Text>
      </View>

      <View style={styles.cariWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.cari}
          placeholder="Cari artikel…"
          placeholderTextColor="#9AA5B1"
          value={cari}
          onChangeText={setCari}
          accessibilityLabel="Cari artikel edukasi"
        />
      </View>

      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...(kategoriQ.data ?? [])]}
          keyExtractor={(k, i) => k?.slug ?? `semua-${i}`}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}
          renderItem={({ item }) => {
            const slug = item?.slug ?? null;
            const aktif = kategori === slug;
            const label = item?.nama ?? "Semua";
            return (
              <Pressable
                style={[styles.chip, aktif && styles.chipAktif]}
                onPress={() => setKategori(slug)}
                accessibilityRole="button"
                accessibilityLabel={`Saring kategori ${label}`}
                accessibilityState={{ selected: aktif }}
              >
                <Text
                  style={[styles.chipTeks, aktif && { color: colors.white }]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat artikel…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={artikel}
          keyExtractor={(a) => a.slug}
          contentContainerStyle={
            artikel.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => <Kartu a={item} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="book-open"
              judul={
                cariTertunda.trim() || kategori
                  ? "Tidak ada yang cocok"
                  : "Belum ada artikel"
              }
              pesan={
                cariTertunda.trim() || kategori
                  ? "Coba kata pencarian lain atau pilih kategori yang berbeda."
                  : "Artikel edukasi pengelolaan sampah akan muncul di sini."
              }
              aksiLabel={
                cariTertunda.trim() || kategori ? "Tampilkan semua" : undefined
              }
              onAksi={
                cariTertunda.trim() || kategori
                  ? () => {
                      setCari("");
                      setKategori(null);
                    }
                  : undefined
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

/**
 * Kartu artikel di daftar.
 *
 * Bertipe `ArtikelRingkas` mengikuti apa yang benar-benar dikirim
 * `GET /artikel`: `kategori` berupa nama, dan `konten` maupun `didengarkan`
 * tidak ikut. Sebelumnya kartu ini dinyatakan sebagai `Artikel`, bentuk
 * detail, sehingga `kategori?.nama` selalu `undefined` dan lencananya tampil
 * kosong tanpa satu pun galat.
 */
function Kartu({ a }: { a: ArtikelRingkas }) {
  const kategori = namaKategori(a.kategori);
  const tipe = labelTipe(a);
  const menit = a.estimasi_baca_menit;

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/edukasi/${a.slug}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={[
        a.judul,
        kategori ? `kategori ${kategori}` : null,
        tipe,
        menit ? `${menit} menit baca` : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.gambar}>
        {a.thumbnail_url ? (
          <Image
            source={{ uri: urlMedia(a.thumbnail_url) }}
            style={styles.gambarIsi}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="book-open" size={22} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <LencanaArtikel a={a} />
        <Text style={styles.judul} numberOfLines={3}>
          {a.judul}
        </Text>
        <View style={styles.metaBaris}>
          {/* `null` untuk artikel yang belum dihitung peladen; tanpa penjaga
              ini barisnya berbunyi "null mnt". */}
          {menit != null && (
            <View style={styles.meta}>
              <Feather name="clock" size={12} color={colors.subtext} />
              <Text style={styles.metaTeks}>{menit} mnt</Text>
            </View>
          )}
          <View style={styles.meta}>
            <Feather name="eye" size={12} color={colors.subtext} />
            <Text style={styles.metaTeks}>{a.dilihat}</Text>
          </View>
          {/*
            Penanda unggulan menggantikan jumlah pendengar yang dulu di sini:
            `didengarkan` hanya ada pada detail artikel (§7.3), jadi angkanya
            tidak pernah benar-benar tampil di daftar.
          */}
          {a.is_unggulan && (
            <View style={styles.meta}>
              <Feather name="star" size={12} color={colors.brand} />
              <Text style={[styles.metaTeks, { color: colors.brand }]}>
                Pilihan
              </Text>
            </View>
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
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  cari: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    color: colors.text,
  },
  chipsWrap: { backgroundColor: colors.white, paddingBottom: 14 },
  chip: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipTeks: { fontSize: 13, color: colors.text, fontWeight: "600" },
  kartu: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  gambar: {
    width: 92,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambarIsi: { width: "100%", height: "100%" },
  judul: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 20,
    marginTop: 6,
  },
  metaBaris: { flexDirection: "row", gap: 14, marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTeks: { fontSize: 11, color: colors.subtext },
});
