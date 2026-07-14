import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getProdukDetail } from "@/lib/api";
import { cart, useCart } from "@/lib/cart";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export default function DetailProduk() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: p,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["produk", id],
    queryFn: () => getProdukDetail(id),
    retry: 1,
  });
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const items = useCart();
  const cartCount = items.reduce((n, i) => n + i.qty, 0);

  if (isLoading)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  if (isError || !p)
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Bar cartCount={cartCount} />
        <View style={{ alignItems: "center", marginTop: 50, gap: 12 }}>
          <Text style={{ color: colors.subtext }}>Gagal memuat produk.</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );

  const gambar: string[] = p.gambar ?? [];
  const habis = p.stok <= 0;

  const toCartItem = () => ({
    product_id: p.id,
    nama: p.nama,
    harga: p.harga,
    gambar: gambar[0] ?? null,
    umkm_id: p.umkm?.id,
    umkm: p.umkm?.nama,
    stok: p.stok,
  });

  const tambah = (): boolean => {
    const res = cart.add(toCartItem(), qty);
    if (res === "different_umkm") {
      Alert.alert(
        "Beda Toko",
        "Keranjang hanya bisa berisi produk dari satu toko. Kosongkan keranjang dan ganti?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ganti",
            style: "destructive",
            onPress: () => cart.replaceWith(toCartItem(), qty),
          },
        ],
      );
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Bar cartCount={cartCount} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.hero}>
          {gambar[imgIdx] ? (
            <Image source={{ uri: gambar[imgIdx] }} style={styles.heroImg} />
          ) : (
            <Feather name="image" size={40} color="#CBD5E1" />
          )}
        </View>
        {gambar.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, padding: spacing.md }}
          >
            {gambar.map((g, i) => (
              <Pressable
                key={i}
                onPress={() => setImgIdx(i)}
                style={[
                  styles.thumb,
                  imgIdx === i && { borderColor: colors.brand },
                ]}
              >
                <Image source={{ uri: g }} style={styles.img} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={{ padding: spacing.lg }}>
          <Text style={styles.nama}>{p.nama}</Text>
          <Text style={styles.harga}>{rp(p.harga)}</Text>
          <View style={styles.meta}>
            {p.jumlah_ulasan > 0 && (
              <View style={styles.ratingChip}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingChipText}>
                  {p.rating} ({p.jumlah_ulasan} ulasan)
                </Text>
              </View>
            )}
            {!!p.kategori && (
              <View style={styles.katBadge}>
                <Text style={styles.katText}>{p.kategori}</Text>
              </View>
            )}
            <Text style={styles.stok}>Stok: {p.stok}</Text>
          </View>

          {/* Toko */}
          {!!p.umkm && (
            <Pressable
              style={styles.toko}
              onPress={() => router.push(`/toko/${p.umkm.id}` as any)}
            >
              <View style={styles.tokoIcon}>
                <Feather name="home" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tokoNama}>{p.umkm.nama}</Text>
                {!!p.umkm.alamat && (
                  <Text style={styles.tokoAlamat} numberOfLines={1}>
                    {p.umkm.alamat}
                  </Text>
                )}
              </View>
              <View style={styles.kunjungi}>
                <Text style={styles.kunjungiText}>Kunjungi</Text>
              </View>
            </Pressable>
          )}

          {!!p.deskripsi && (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sectionTitle}>Deskripsi</Text>
              <Text style={styles.desc}>{p.deskripsi}</Text>
            </View>
          )}

          {(p.ulasan?.length ?? 0) > 0 && (
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sectionTitle}>
                Ulasan Toko ({p.jumlah_ulasan})
              </Text>
              {p.ulasan.map((u: any) => (
                <UlasanItem key={u.id} u={u} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottom}>
        {!user ? (
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
          >
            <Feather name="log-in" size={18} color={colors.white} />
            <Text style={styles.loginBtnText}>Masuk untuk Belanja</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.qtyBox}>
              <Pressable
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                hitSlop={6}
              >
                <Feather name="minus" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.qtyText}>{qty}</Text>
              <Pressable
                onPress={() => setQty((q) => Math.min(p.stok || 1, q + 1))}
                hitSlop={6}
              >
                <Feather name="plus" size={18} color={colors.text} />
              </Pressable>
            </View>
            <Pressable
              style={[styles.cartBtn, habis && { opacity: 0.5 }]}
              disabled={habis}
              onPress={() => {
                if (tambah())
                  Alert.alert("Ditambahkan", "Produk masuk ke keranjang.");
              }}
            >
              <Feather name="shopping-cart" size={16} color={colors.brand} />
              <Text style={styles.cartBtnText}>Keranjang</Text>
            </Pressable>
            <Pressable
              style={[styles.buyBtn, habis && { opacity: 0.5 }]}
              disabled={habis}
              onPress={() => {
                if (tambah()) router.push("/keranjang" as any);
              }}
            >
              <Text style={styles.buyBtnText}>
                {habis ? "Stok Habis" : "Beli Sekarang"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Bar({ cartCount, user }: { cartCount: number; user: any }) {
  return (
    <View style={styles.appbar}>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.appbarTitle}>Detail Produk</Text>
      {user && (
        <Pressable
          onPress={() => router.push("/keranjang" as any)}
          hitSlop={8}
          style={{ marginLeft: "auto" }}
        >
          <Feather name="shopping-cart" size={22} color={colors.text} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={13}
          color={i <= n ? "#F59E0B" : "#E2E8F0"}
        />
      ))}
    </View>
  );
}

function UlasanItem({ u }: { u: any }) {
  const tgl = u.tanggal
    ? new Date(u.tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  return (
    <View style={ulasanStyles.item}>
      <View style={ulasanStyles.head}>
        <View style={ulasanStyles.avatar}>
          <Text style={ulasanStyles.avatarText}>
            {(u.nama ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ulasanStyles.nama}>{u.nama}</Text>
          <Stars n={u.rating} />
        </View>
        {!!tgl && <Text style={ulasanStyles.tgl}>{tgl}</Text>}
      </View>
      {!!u.komentar && <Text style={ulasanStyles.komentar}>{u.komentar}</Text>}
    </View>
  );
}

const ulasanStyles = StyleSheet.create({
  item: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingVertical: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "700" },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text },
  tgl: { fontSize: 11, color: colors.subtext },
  komentar: { fontSize: 13, color: "#334155", lineHeight: 19, marginTop: 8 },
});

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
  retry: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  hero: {
    height: 300,
    backgroundColor: "#E9EFEC",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImg: { width: "100%", height: "100%" },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  img: { width: "100%", height: "100%" },
  nama: { fontSize: 20, fontWeight: "800", color: colors.text },
  harga: { fontSize: 24, fontWeight: "800", color: colors.brand, marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  katBadge: {
    backgroundColor: "#DCF3EA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  katText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  stok: { color: colors.subtext, fontSize: 13 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingChipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  toko: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  tokoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  tokoNama: { fontSize: 15, fontWeight: "700", color: colors.text },
  tokoAlamat: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  kunjungi: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  kunjungiText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  desc: { fontSize: 14, color: "#334155", lineHeight: 21 },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 46,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 46,
  },
  cartBtnText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  buyBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  loginBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    height: 48,
  },
  loginBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
