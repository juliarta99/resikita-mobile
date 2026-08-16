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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeranjang } from "@/hooks/useKeranjang";
import { daftarProduk, kategoriProduk } from "@/lib/api/produk";
import { formatRupiah } from "@/lib/rupiah";
import type { Produk } from "@/types/produk";

export default function Pasar() {
  const insets = useSafeAreaInsets();
  const keranjang = useKeranjang();
  // Penyaring kategori memakai **slug**, bukan id — `kategori_id` yang dulu
  // dikirim di sini tidak dikenali peladen dan diabaikan diam-diam, sehingga
  // memilih kategori apa pun tetap menampilkan seluruh produk.
  const [kategoriSlug, setKategoriSlug] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const cariTertunda = useDebounce(cari);

  const kategoriQ = useQuery({
    queryKey: ["produk", "kategori"],
    queryFn: kategoriProduk,
    staleTime: 30 * 60_000,
  });

  const q = useInfiniteQuery({
    queryKey: ["produk", "daftar", kategoriSlug, cariTertunda],
    queryFn: ({ pageParam }) =>
      daftarProduk({
        page: pageParam,
        kategori: kategoriSlug ?? undefined,
        cari: cariTertunda.trim() || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const produk = q.data?.pages.flatMap((h) => h.data) ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.kepala}>
        <View style={styles.judulBaris}>
          <Text style={styles.judul}>Pasar Daur Ulang</Text>
          <Pressable
            onPress={() => router.push("/umkm" as Href)}
            hitSlop={10}
            style={styles.keranjangBtn}
            accessibilityRole="button"
            accessibilityLabel="Direktori UMKM"
          >
            <Feather name="users" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/keranjang" as Href)}
            hitSlop={10}
            style={styles.keranjangBtn}
            accessibilityRole="button"
            accessibilityLabel={
              keranjang.jumlahItem > 0
                ? `Keranjang, ${keranjang.jumlahItem} barang`
                : "Keranjang, kosong"
            }
          >
            <Feather name="shopping-cart" size={22} color={colors.text} />
            {keranjang.jumlahItem > 0 && (
              <View style={styles.lencana}>
                <Text style={styles.lencanaTeks}>
                  {keranjang.jumlahItem > 99 ? "99+" : keranjang.jumlahItem}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.cariWrap}>
          <Feather name="search" size={18} color={colors.subtext} />
          <TextInput
            style={styles.cari}
            placeholder="Cari produk…"
            placeholderTextColor="#9AA5B1"
            value={cari}
            onChangeText={setCari}
            accessibilityLabel="Cari produk"
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...(kategoriQ.data ?? [])]}
          keyExtractor={(k, i) => (k ? k.slug : `semua-${i}`)}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          renderItem={({ item }) => {
            const slug = item?.slug ?? null;
            const aktif = kategoriSlug === slug;
            const label = item?.nama ?? "Semua";
            return (
              <Pressable
                style={[styles.chip, aktif && styles.chipAktif]}
                onPress={() => setKategoriSlug(slug)}
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
        <LoadingState pesan="Memuat produk…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={produk}
          keyExtractor={(p) => p.slug}
          numColumns={2}
          columnWrapperStyle={
            produk.length > 0 ? { gap: 12, paddingHorizontal: spacing.md } : undefined
          }
          contentContainerStyle={
            produk.length === 0
              ? { flexGrow: 1 }
              : { paddingVertical: spacing.md, gap: 12, paddingBottom: 30 }
          }
          renderItem={({ item }) => <KartuProduk p={item} />}
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
              icon="shopping-bag"
              judul={
                cariTertunda.trim() || kategoriSlug
                  ? "Tidak ada yang cocok"
                  : "Belum ada produk"
              }
              pesan={
                cariTertunda.trim() || kategoriSlug
                  ? "Coba kata pencarian lain atau pilih kategori yang berbeda."
                  : "Produk dari UMKM binaan akan muncul di sini."
              }
              aksiLabel={
                cariTertunda.trim() || kategoriSlug ? "Tampilkan semua" : undefined
              }
              onAksi={
                cariTertunda.trim() || kategoriSlug
                  ? () => {
                      setCari("");
                      setKategoriSlug(null);
                    }
                  : undefined
              }
            />
          }
        />
      )}
    </View>
  );
}

function KartuProduk({ p }: { p: Produk }) {
  // `tersedia` sudah menggabungkan `is_active` dan stok di sisi peladen.
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
            source={{ uri: p.foto_utama_url }}
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
        <Text style={styles.nama} numberOfLines={2}>
          {p.nama}
        </Text>
        <Text style={styles.harga}>{formatRupiah(p.harga)}</Text>
        {!!p.umkm && (
          <Text style={styles.umkm} numberOfLines={1}>
            {p.umkm.nama}
          </Text>
        )}
        {p.rating_rata != null && (
          <View style={styles.rating}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingTeks}>
              {p.rating_rata.toFixed(1)}
              {p.jumlah_ulasan ? ` (${p.jumlah_ulasan})` : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  kepala: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    gap: 12,
  },
  judulBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  judul: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text },
  keranjangBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  lencana: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  lencanaTeks: { color: colors.white, fontSize: 10, fontWeight: "700" },
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 44,
  },
  cari: { flex: 1, color: colors.text },
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
  nama: { fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 18 },
  harga: { fontSize: 15, fontWeight: "800", color: colors.brand },
  umkm: { fontSize: 11, color: colors.subtext },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingTeks: { fontSize: 11, color: colors.subtext },
});
