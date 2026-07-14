import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getKategoriProduk, getProduk } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

type Kategori = { id: number; nama: string; jumlah: number };

export default function Pasar() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [katId, setKatId] = useState<number | null>(null);
  const [grid, setGrid] = useState(true);
  const items = useCart();
  const cartCount = items.reduce((n, i) => n + i.qty, 0);

  const katQ = useQuery({
    queryKey: ["kategori-produk"],
    queryFn: getKategoriProduk,
  });
  const kategori: Kategori[] = katQ.data ?? [];
  const totalSemua = kategori.reduce((n, k) => n + (k.jumlah || 0), 0);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["produk", q, katId],
    queryFn: ({ pageParam = 1 }) =>
      getProduk({
        page: pageParam,
        ...(q ? { q } : {}),
        ...(katId ? { kategori_id: katId } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last: any) =>
      last?.current_page < last?.last_page ? last.current_page + 1 : undefined,
  });

  const produk: any[] = data?.pages.flatMap((p: any) => p.data ?? []) ?? [];
  const total = data?.pages[0]?.total ?? produk.length;

  const Header = (
    <View>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.search}
          placeholder="Cari produk ramah lingkungan..."
          placeholderTextColor="#9AA5B1"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {/* Chip kategori */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label={`Semua${totalSemua ? ` (${totalSemua})` : ""}`}
          active={katId === null}
          onPress={() => setKatId(null)}
        />
        {kategori.map((k) => (
          <Chip
            key={k.id}
            label={`${k.nama} (${k.jumlah})`}
            active={katId === k.id}
            onPress={() => setKatId(k.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <Text style={styles.count}>{total} produk</Text>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleBtn, grid && styles.toggleActive]}
            onPress={() => setGrid(true)}
          >
            <Feather
              name="grid"
              size={16}
              color={grid ? colors.white : colors.subtext}
            />
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, !grid && styles.toggleActive]}
            onPress={() => setGrid(false)}
          >
            <Feather
              name="list"
              size={16}
              color={!grid ? colors.white : colors.subtext}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Text style={styles.appbarTitle}>E-Commerce</Text>
        <View style={styles.appbarActions}>
          {user && (
            <>
              <Pressable
                onPress={() => router.push("/pesanan" as Href)}
                hitSlop={8}
              >
                <Feather name="clock" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push("/keranjang" as Href)}
                hitSlop={8}
              >
                <Feather name="shopping-cart" size={22} color={colors.text} />
                {cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount}</Text>
                  </View>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      <FlatList
        key={grid ? "grid" : "list"}
        data={produk}
        keyExtractor={(item: any, i) => `${item.id}-${i}`}
        numColumns={grid ? 2 : 1}
        columnWrapperStyle={
          grid ? { justifyContent: "space-between" } : undefined
        }
        ListHeaderComponent={Header}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        renderItem={({ item }) =>
          grid ? <GridCard p={item} /> : <ListCard p={item} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <Text style={styles.empty}>Belum ada produk.</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.brand}
              style={{ marginVertical: 16 }}
            />
          ) : (
            <View style={{ height: 8 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: "center", marginTop: 30, gap: 10 }}>
      <Text style={{ color: colors.subtext }}>Gagal memuat produk.</Text>
      <Pressable onPress={onRetry} style={styles.retry}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
      </Pressable>
    </View>
  );
}

function GridCard({ p }: { p: any }) {
  return (
    <Pressable
      style={styles.gridCard}
      onPress={() => router.push(`/produk/${p.id}` as any)}
    >
      <View style={styles.gridImg}>
        {p.gambar ? (
          <Image source={{ uri: p.gambar }} style={styles.img} />
        ) : (
          <Feather name="image" size={28} color="#CBD5E1" />
        )}
        {p.stok <= 0 && (
          <View style={styles.habis}>
            <Text style={styles.habisText}>Habis</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={styles.nama} numberOfLines={2}>
          {p.nama}
        </Text>
        <Text style={styles.harga}>{rp(p.harga)}</Text>
        <Text style={styles.toko} numberOfLines={1}>
          {p.umkm?.nama}
        </Text>
        {p.jumlah_ulasan > 0 && (
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {p.rating} ({p.jumlah_ulasan})
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ListCard({ p }: { p: any }) {
  return (
    <Pressable
      style={styles.listCard}
      onPress={() => router.push(`/produk/${p.id}` as any)}
    >
      <View style={styles.listImg}>
        {p.gambar ? (
          <Image source={{ uri: p.gambar }} style={styles.img} />
        ) : (
          <Feather name="image" size={24} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nama} numberOfLines={2}>
          {p.nama}
        </Text>
        <Text style={styles.toko}>{p.umkm?.nama}</Text>
        <Text style={styles.harga}>{rp(p.harga)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.stok}>Stok: {p.stok}</Text>
          {p.jumlah_ulasan > 0 && (
            <>
              <Feather name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {p.rating} ({p.jumlah_ulasan})
              </Text>
            </>
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
  appbarTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  appbarActions: { flexDirection: "row", gap: 20, alignItems: "center" },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  search: { flex: 1, color: colors.text },
  chips: { gap: 8, paddingBottom: 4, paddingRight: 4 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brand },
  chipText: { fontWeight: "700", color: colors.subtext, fontSize: 13 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  count: { color: colors.subtext, fontWeight: "600" },
  viewToggle: { flexDirection: "row", gap: 6 },
  toggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: { backgroundColor: colors.brand },
  gridCard: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  gridImg: {
    height: 130,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: "100%" },
  habis: {
    position: "absolute",
    inset: 0 as any,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  habisText: { color: "#fff", fontWeight: "700" },
  listCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  listImg: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 19 },
  harga: { fontSize: 15, fontWeight: "800", color: colors.brand, marginTop: 4 },
  toko: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  stok: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingText: { fontSize: 12, color: colors.subtext, fontWeight: "600" },
  retry: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
});
