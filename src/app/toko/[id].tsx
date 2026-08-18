import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
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
import { daftarProduk, detailUmkm } from "@/lib/api/produk";
import { formatRupiah } from "@/lib/rupiah";
import type { Produk } from "@/types/produk";
import { urlMedia } from "@/lib/media";

export default function DetailToko() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);

  const tokoQ = useQuery({
    queryKey: ["umkm", "detail", nomor],
    queryFn: () => detailUmkm(nomor),
    enabled: Number.isFinite(nomor),
  });

  const produkQ = useInfiniteQuery({
    queryKey: ["produk", "umkm", nomor],
    queryFn: ({ pageParam }) =>
      daftarProduk({ page: pageParam, umkm_id: nomor }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
    enabled: Number.isFinite(nomor),
  });

  const produk = produkQ.data?.pages.flatMap((h) => h.data) ?? [];

  const appbar = (
    <View style={styles.appbar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.appbarTitle} numberOfLines={1}>
        {tokoQ.data?.nama ?? "Toko"}
      </Text>
    </View>
  );

  if (tokoQ.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat toko…" />
      </SafeAreaView>
    );
  }

  if (tokoQ.isError || !tokoQ.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={tokoQ.error} onCobaLagi={() => tokoQ.refetch()} />
      </SafeAreaView>
    );
  }

  const t = tokoQ.data;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <FlatList
        data={produk}
        keyExtractor={(p) => p.slug}
        numColumns={2}
        columnWrapperStyle={
          produk.length > 0
            ? { gap: 12, paddingHorizontal: spacing.md }
            : undefined
        }
        contentContainerStyle={{ paddingBottom: 30, gap: 12 }}
        ListHeaderComponent={
          <View style={styles.identitas}>
            <View style={styles.logo}>
              {t.foto_url ? (
                <Image
                  source={{ uri: urlMedia(t.foto_url) }}
                  style={styles.logoIsi}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Feather name="shopping-bag" size={26} color={colors.brand} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.namaBaris}>
                <Text style={styles.nama}>{t.nama}</Text>
                {t.is_verified && (
                  <Feather name="check-circle" size={16} color={colors.brand} />
                )}
              </View>
              {!!t.deskripsi && (
                <Text style={styles.deskripsi}>{t.deskripsi}</Text>
              )}
              {!!t.alamat && (
                <View style={styles.alamatBaris}>
                  <Feather name="map-pin" size={13} color={colors.subtext} />
                  <Text style={styles.alamat} numberOfLines={2}>
                    {[t.alamat, t.wilayah?.nama_lengkap]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              )}
              <View style={styles.metaBaris}>
                {/*
                  Jumlah produk diambil dari agregat peladen, bukan dari panjang
                  halaman yang kebetulan sudah termuat, daftar ini bergulir tak
                  berhingga, jadi angkanya dulu bertambah sendiri saat pengguna
                  menggulir.
                */}
                <Text style={styles.jumlah}>
                  {t.jumlah_produk != null
                    ? `${t.jumlah_produk} produk`
                    : produkQ.isLoading
                      ? "Memuat produk…"
                      : `${produk.length} produk`}
                </Text>
                {t.rating_rata != null && (
                  <View style={styles.rating}>
                    <Feather name="star" size={13} color="#F59E0B" />
                    <Text style={styles.metaTeks}>
                      {t.rating_rata.toFixed(1)}
                      {t.jumlah_ulasan ? ` (${t.jumlah_ulasan} ulasan)` : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => <KartuProduk p={item} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (produkQ.hasNextPage && !produkQ.isFetchingNextPage)
            produkQ.fetchNextPage();
        }}
        ListFooterComponent={
          produkQ.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.brand}
              style={{ marginVertical: 16 }}
            />
          ) : null
        }
        ListEmptyComponent={
          produkQ.isLoading ? (
            <LoadingState pesan="Memuat produk…" />
          ) : produkQ.isError ? (
            <ErrorState
              error={produkQ.error}
              onCobaLagi={() => produkQ.refetch()}
            />
          ) : (
            <EmptyState
              icon="shopping-bag"
              judul="Belum ada produk"
              pesan="Toko ini belum memajang produk apa pun."
              aksiLabel="Lihat Produk Lain"
              onAksi={() => router.push("/pasar" as Href)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function KartuProduk({ p }: { p: Produk }) {
  // `tersedia` dihitung peladen dari `is_active && stok > 0`. Menghitung
  // `stok > 0` sendiri melewatkan produk yang stoknya ada tapi dinonaktifkan.
  const habis = !p.tersedia;

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/produk/${p.slug}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${p.nama}, ${formatRupiah(p.harga)}${habis ? ", tidak tersedia" : ""}`}
    >
      <View style={styles.gambar}>
        {p.foto_utama_url ? (
          <Image
            source={{ uri: urlMedia(p.foto_utama_url) }}
            style={styles.gambarIsi}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={26} color="#CBD5E1" />
        )}
        {habis && (
          <View style={styles.habisTanda}>
            <Text style={styles.habisTeks}>
              {p.stok > 0 ? "Tidak Dijual" : "Stok Habis"}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.kartuIsi}>
        <Text style={styles.produkNama} numberOfLines={2}>
          {p.nama}
        </Text>
        <Text style={styles.harga}>{formatRupiah(p.harga)}</Text>
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
  appbarTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  identitas: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: 4,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoIsi: { width: "100%", height: "100%" },
  namaBaris: { flexDirection: "row", alignItems: "center", gap: 6 },
  nama: { flexShrink: 1, fontSize: 18, fontWeight: "800", color: colors.text },
  deskripsi: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 18,
  },
  metaBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
    flexWrap: "wrap",
  },
  metaTeks: { fontSize: 12, color: colors.subtext },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  alamatBaris: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginTop: 6,
  },
  alamat: { flex: 1, fontSize: 12, color: colors.subtext, lineHeight: 17 },
  jumlah: { fontSize: 12, color: colors.brand, fontWeight: "600" },
  kartu: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  gambar: {
    height: 130,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  gambarIsi: { width: "100%", height: "100%" },
  habisTanda: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  habisTeks: { color: colors.white, fontWeight: "700", fontSize: 12 },
  kartuIsi: { padding: 10, gap: 3 },
  produkNama: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 18,
  },
  harga: { fontSize: 15, fontWeight: "800", color: colors.brand },
});
