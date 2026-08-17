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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { daftarUmkm } from "@/lib/api/produk";
import type { Umkm } from "@/types/produk";
import { urlMedia } from "@/lib/media";

export default function DirektoriUmkm() {
  const [cari, setCari] = useState("");
  const cariTertunda = useDebounce(cari);

  const q = useInfiniteQuery({
    queryKey: ["umkm", "daftar", cariTertunda],
    queryFn: ({ pageParam }) =>
      daftarUmkm({ page: pageParam, cari: cariTertunda.trim() || undefined }),
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
        <View style={{ flex: 1 }}>
          <Text style={styles.appbarTitle}>Direktori UMKM</Text>
          <Text style={styles.appbarSub}>Pengrajin produk daur ulang</Text>
        </View>
      </View>

      <View style={styles.cariWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.cari}
          placeholder="Cari nama UMKM…"
          placeholderTextColor="#9AA5B1"
          value={cari}
          onChangeText={setCari}
          accessibilityLabel="Cari UMKM"
        />
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat UMKM…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={
            daftar.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => <Kartu u={item} />}
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
            cariTertunda.trim() ? (
              <EmptyState
                icon="search"
                judul="Tidak ada yang cocok"
                pesan="Coba kata pencarian yang lain."
                aksiLabel="Hapus pencarian"
                onAksi={() => setCari("")}
              />
            ) : (
              <EmptyState
                icon="shopping-bag"
                judul="Belum ada UMKM terdaftar"
                pesan="Pengrajin produk daur ulang yang bergabung akan muncul di sini."
                aksiLabel="Lihat Produk"
                onAksi={() => router.push("/pasar" as Href)}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ u }: { u: Umkm }) {
  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/toko/${u.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`Kunjungi toko ${u.nama}${u.alamat ? `, ${u.alamat}` : ""}`}
    >
      <View style={styles.logo}>
        {u.foto_url ? (
          <Image
            source={{ uri: urlMedia(u.foto_url) }}
            style={styles.logoIsi}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="shopping-bag" size={20} color={colors.brand} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.namaBaris}>
          <Text style={styles.nama} numberOfLines={1}>
            {u.nama}
          </Text>
          {u.is_verified && (
            <Feather name="check-circle" size={14} color={colors.brand} />
          )}
        </View>
        {!!u.alamat && (
          <Text style={styles.alamat} numberOfLines={2}>
            {u.alamat}
          </Text>
        )}
        <View style={styles.metaBaris}>
          {u.jumlah_produk != null && (
            <Text style={styles.meta}>{u.jumlah_produk} produk</Text>
          )}
          {u.rating_rata != null && (
            <View style={styles.rating}>
              <Feather name="star" size={12} color="#F59E0B" />
              <Text style={styles.meta}>
                {u.rating_rata.toFixed(1)}
                {u.jumlah_ulasan ? ` (${u.jumlah_ulasan})` : ""}
              </Text>
            </View>
          )}
          {u.jarak_km != null && (
            <Text style={styles.meta}>{u.jarak_km.toFixed(1)} km</Text>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.subtext} />
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
    paddingVertical: 12,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  appbarSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
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
  kartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoIsi: { width: "100%", height: "100%" },
  namaBaris: { flexDirection: "row", alignItems: "center", gap: 6 },
  nama: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  alamat: { fontSize: 12, color: colors.subtext, marginTop: 3, lineHeight: 17 },
  metaBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 5,
    flexWrap: "wrap",
  },
  meta: { fontSize: 11, color: colors.subtext },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
});
