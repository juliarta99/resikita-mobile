import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { daftarPesanan } from "@/lib/api/pesanan";
import { formatRupiah } from "@/lib/rupiah";
import { metaStatusPesanan } from "@/lib/statusPesanan";
import type { StatusPesanan } from "@/types/enums";
import type { Pesanan } from "@/types/pesanan";
import { urlMedia } from "@/lib/media";

const TAB: { kunci: string; label: string; status?: StatusPesanan }[] = [
  { kunci: "semua", label: "Semua" },
  { kunci: "menunggu_bayar", label: "Belum Bayar", status: "menunggu_bayar" },
  { kunci: "dikirim", label: "Dikirim", status: "dikirim" },
  { kunci: "selesai", label: "Selesai", status: "selesai" },
];

export default function DaftarPesanan() {
  const [tab, setTab] = useState("semua");
  const status = TAB.find((t) => t.kunci === tab)?.status;

  const q = useInfiniteQuery({
    queryKey: ["pesanan", "daftar", tab],
    queryFn: ({ pageParam }) => daftarPesanan({ page: pageParam, status }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const daftar = q.data?.pages.flatMap((h) => h.data) ?? [];

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
        <Text style={styles.appbarTitle}>Pesanan Saya</Text>
      </View>

      <View style={styles.tabs}>
        {TAB.map((t) => {
          const aktif = tab === t.kunci;
          return (
            <Pressable
              key={t.kunci}
              style={[styles.tab, aktif && styles.tabAktif]}
              onPress={() => setTab(t.kunci)}
              accessibilityRole="tab"
              accessibilityLabel={`Tampilkan pesanan ${t.label.toLowerCase()}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text style={[styles.tabTeks, aktif && { color: colors.white }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat pesanan…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(p) => p.kode}
          contentContainerStyle={
            daftar.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => <KartuPesanan p={item} />}
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
            tab === "semua" ? (
              <EmptyState
                icon="package"
                judul="Belum ada pesanan"
                pesan="Produk yang Anda beli dari UMKM binaan akan muncul di sini."
                aksiLabel="Lihat Produk"
                onAksi={() => router.push("/pasar" as Href)}
              />
            ) : (
              <EmptyState
                icon="inbox"
                judul="Tidak ada di kategori ini"
                pesan="Coba lihat tab lain."
                aksiLabel="Tampilkan semua"
                onAksi={() => setTab("semua")}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function KartuPesanan({ p }: { p: Pesanan }) {
  const s = metaStatusPesanan(p.status);
  // Kuncinya `item`, bukan `items`, salah satu huruf di sini membuat seluruh
  // kartu kosong karena `pertama` selalu `undefined`.
  const item = p.item ?? [];
  const pertama = item[0];
  const sisa = item.length - 1;

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/pesanan/${p.kode}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Pesanan ${p.kode}, ${s.label}, total ${formatRupiah(p.total)}`}
    >
      <View style={styles.kepala}>
        <Text style={styles.kode}>{p.kode}</Text>
        <View style={[styles.status, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusTeks, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      {!!pertama && (
        <View style={styles.item}>
          <View style={styles.gambar}>
            {pertama.produk?.foto_utama_url ? (
              <Image
                source={{ uri: urlMedia(pertama.produk.foto_utama_url) }}
                style={styles.gambarIsi}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Feather name="image" size={20} color="#CBD5E1" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nama} numberOfLines={2}>
              {pertama.nama}
            </Text>
            <Text style={styles.qty}>
              {pertama.qty} barang
              {sisa > 0 ? ` · +${sisa} produk lain` : ""}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.kaki}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.total}>{formatRupiah(p.total)}</Text>
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTeks: { fontSize: 12, fontWeight: "600", color: colors.text },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  kepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kode: { fontSize: 13, fontWeight: "700", color: colors.text },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  item: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  gambar: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambarIsi: { width: "100%", height: "100%" },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text },
  qty: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  kaki: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  totalLabel: { fontSize: 13, color: colors.subtext },
  total: { fontSize: 16, fontWeight: "800", color: colors.brand },
});
