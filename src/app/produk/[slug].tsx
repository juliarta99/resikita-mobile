import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useBottomPad } from "@/hooks/useBottomPad";
import { useKeranjang } from "@/hooks/useKeranjang";
import { ApiError } from "@/lib/api/error";
import { detailProduk, ulasanProduk } from "@/lib/api/produk";
import { notify } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";
import { urlMedia } from "@/lib/media";

export default function DetailProduk() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const pad = useBottomPad();
  const keranjang = useKeranjang();
  const [qty, setQty] = useState(1);

  const q = useQuery({
    queryKey: ["produk", "detail", slug],
    queryFn: () => detailProduk(slug),
    enabled: !!slug,
  });

  const ulasanQ = useQuery({
    queryKey: ["produk", "ulasan", slug],
    queryFn: () => ulasanProduk(slug, { per_page: 3 }),
    enabled: !!slug,
  });

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
      <Text style={styles.appbarTitle}>Detail Produk</Text>
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
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat produk…" />
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const p = q.data;
  // `tersedia` dihitung peladen dari `is_active && stok > 0`; ia satu-satunya
  // dasar mengaktifkan tombol beli.
  const habis = !p.tersedia;
  const maksimal = Math.max(1, Math.min(p.stok, 99));
  // Endpoint detail tidak mengirim `foto_utama_url`, sampulnya diambil dari
  // elemen `foto` yang bertanda `is_utama`.
  const foto = p.foto ?? [];
  const sampul = foto.find((f) => f.is_utama) ?? foto[0];

  /**
   * Menambah produk dari toko mana pun tidak lagi perlu mengosongkan keranjang.
   *
   * Peladen mengelompokkan keranjang per toko, jadi aturan "satu pesanan satu
   * UMKM" ditegakkan saat checkout, bukan saat menambah. Versi sebelumnya
   * menanyakan "ganti isi keranjang?" setiap kali pengguna melirik produk dari
   * penjual lain; itu memaksakan batasan pesanan ke tempat yang salah.
   */
  const tambah = () => {
    if (!user) {
      router.push("/login" as Href);
      return;
    }
    keranjang.tambah.mutate(
      { produk_id: p.id, qty },
      {
        onSuccess: () =>
          notify("Ditambahkan", `${p.nama} masuk ke keranjang Anda.`),
        onError: (e: unknown) =>
          notify(
            "Gagal",
            e instanceof ApiError
              ? e.pesanUntukPengguna
              : "Produk tidak dapat ditambahkan.",
          ),
      },
    );
  };

  const ulasan = ulasanQ.data?.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView contentContainerStyle={{ paddingBottom: pad }}>
        <View style={styles.hero}>
          {sampul ? (
            <Image
              source={{ uri: urlMedia(sampul.url) }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              accessibilityLabel={`Foto ${p.nama}`}
            />
          ) : (
            <Feather name="image" size={40} color="#CBD5E1" />
          )}
        </View>

        {foto.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galeri}
          >
            {foto.map((f, i) => (
              <Image
                key={f.id}
                source={{ uri: urlMedia(f.url) }}
                style={styles.galeriFoto}
                accessibilityIgnoresInvertColors
                accessibilityLabel={`Foto ${i + 1} dari ${foto.length}`}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.isi}>
          <Text style={styles.nama}>{p.nama}</Text>
          <Text style={styles.harga}>{formatRupiah(p.harga)}</Text>

          <View style={styles.metaBaris}>
            <View style={styles.meta}>
              <Feather name="box" size={14} color={colors.subtext} />
              <Text style={styles.metaTeks}>
                {habis
                  ? p.stok > 0
                    ? "Sedang tidak dijual"
                    : "Stok habis"
                  : `Stok ${p.stok}`}
              </Text>
            </View>
            <View style={styles.meta}>
              <Feather name="package" size={14} color={colors.subtext} />
              <Text style={styles.metaTeks}>{p.berat_gram} gram</Text>
            </View>
            {p.rating_rata != null && (
              <View style={styles.meta}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.metaTeks}>
                  {p.rating_rata.toFixed(1)}
                  {p.jumlah_ulasan ? ` · ${p.jumlah_ulasan} ulasan` : ""}
                </Text>
              </View>
            )}
          </View>

          {!!p.bahan_baku && (
            <View style={styles.bahan}>
              <Feather name="refresh-cw" size={14} color={colors.brand} />
              <Text style={styles.bahanTeks}>
                Dibuat dari{" "}
                <Text style={{ fontWeight: "700" }}>{p.bahan_baku}</Text>
              </Text>
            </View>
          )}

          {!!p.umkm && (
            <Pressable
              style={styles.toko}
              onPress={() => router.push(`/toko/${p.umkm!.id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Kunjungi toko ${p.umkm.nama}`}
            >
              <View style={styles.tokoIkon}>
                {p.umkm.foto_url ? (
                  <Image
                    source={{ uri: urlMedia(p.umkm.foto_url) }}
                    style={styles.tokoLogo}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Feather name="shopping-bag" size={18} color={colors.brand} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tokoNama} numberOfLines={1}>
                  {p.umkm.nama}
                </Text>
                {!!(p.umkm.wilayah?.nama_lengkap ?? p.umkm.alamat) && (
                  <Text style={styles.tokoAlamat} numberOfLines={1}>
                    {p.umkm.wilayah?.nama_lengkap ?? p.umkm.alamat}
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={colors.subtext} />
            </Pressable>
          )}

          {!!p.deskripsi && (
            <>
              <Text style={styles.judulBagian}>Deskripsi</Text>
              <Text style={styles.deskripsi}>{p.deskripsi}</Text>
            </>
          )}

          <Text style={styles.judulBagian}>Ulasan Pembeli</Text>
          {ulasanQ.isLoading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
          ) : ulasan.length === 0 ? (
            <Text style={styles.kosong}>
              Belum ada ulasan untuk produk ini.
            </Text>
          ) : (
            ulasan.map((u) => (
              <View key={u.id} style={styles.ulasan}>
                <View style={styles.ulasanKepala}>
                  <Text style={styles.ulasanNama}>
                    {u.penulis?.name ?? "Pembeli"}
                  </Text>
                  <View style={styles.bintang}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Feather
                        key={n}
                        name="star"
                        size={12}
                        color={n <= u.rating ? "#F59E0B" : "#E2E8F0"}
                      />
                    ))}
                  </View>
                </View>
                {!!u.komentar && (
                  <Text style={styles.ulasanTeks}>{u.komentar}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={styles.qtyWrap}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => setQty((n) => Math.max(1, n - 1))}
            disabled={qty <= 1 || habis}
            accessibilityRole="button"
            accessibilityLabel="Kurangi jumlah"
            accessibilityState={{ disabled: qty <= 1 || habis }}
          >
            <Feather
              name="minus"
              size={16}
              color={qty <= 1 || habis ? "#CBD5E1" : colors.text}
            />
          </Pressable>
          <Text style={styles.qty} accessibilityLabel={`Jumlah ${qty}`}>
            {qty}
          </Text>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => setQty((n) => Math.min(maksimal, n + 1))}
            disabled={qty >= maksimal || habis}
            accessibilityRole="button"
            accessibilityLabel="Tambah jumlah"
            accessibilityState={{ disabled: qty >= maksimal || habis }}
          >
            <Feather
              name="plus"
              size={16}
              color={qty >= maksimal || habis ? "#CBD5E1" : colors.text}
            />
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.tambah,
            (habis || keranjang.sedangUbah) && styles.tambahMati,
          ]}
          onPress={tambah}
          disabled={habis || keranjang.sedangUbah}
          accessibilityRole="button"
          accessibilityLabel={
            habis
              ? "Stok habis"
              : user
                ? `Tambah ${qty} ${p.nama} ke keranjang`
                : "Masuk untuk berbelanja"
          }
          accessibilityState={{
            disabled: habis,
            busy: keranjang.sedangUbah,
          }}
        >
          {keranjang.sedangUbah ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Feather name="shopping-cart" size={17} color={colors.white} />
              <Text style={styles.tambahTeks}>
                {habis
                  ? "Stok Habis"
                  : user
                    ? "Tambah ke Keranjang"
                    : "Masuk untuk Belanja"}
              </Text>
            </>
          )}
        </Pressable>
      </BottomBar>
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
  keranjangBtn: {
    marginLeft: "auto",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Lencana jumlah barang, bentuknya sama dengan yang di tab Pasar. */
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
  hero: {
    height: 280,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  isi: { padding: spacing.lg },
  nama: { fontSize: 20, fontWeight: "800", color: colors.text },
  harga: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.brand,
    marginTop: 6,
  },
  galeri: { gap: 8, paddingHorizontal: spacing.lg, paddingTop: 10 },
  galeriFoto: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
  },
  metaBaris: {
    flexDirection: "row",
    gap: 18,
    marginTop: 10,
    flexWrap: "wrap",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaTeks: { fontSize: 13, color: colors.subtext },
  bahan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
  },
  bahanTeks: { flex: 1, fontSize: 13, color: colors.brand, lineHeight: 18 },
  toko: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 18,
    minHeight: 44,
  },
  tokoIkon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tokoLogo: { width: "100%", height: "100%" },
  tokoNama: { fontSize: 14, fontWeight: "700", color: colors.text },
  tokoAlamat: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  judulBagian: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 22,
    marginBottom: 8,
  },
  deskripsi: { fontSize: 14, color: colors.text, lineHeight: 21 },
  kosong: { fontSize: 13, color: colors.subtext, lineHeight: 19 },
  ulasan: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  ulasanKepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ulasanNama: { fontSize: 13, fontWeight: "700", color: colors.text },
  bintang: { flexDirection: "row", gap: 2 },
  ulasanTeks: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 6,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  qtyBtn: {
    width: 40,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    minWidth: 30,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  tambah: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tambahMati: { backgroundColor: colors.muted },
  tambahTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
