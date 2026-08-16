import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
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
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useBottomPad } from "@/hooks/useBottomPad";
import { useKeranjang } from "@/hooks/useKeranjang";
import { confirmDialog } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";
import type { ItemKeranjang, KelompokKeranjang } from "@/types/produk";

export default function Keranjang() {
  const k = useKeranjang();
  const pad = useBottomPad();

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
      <Text style={styles.appbarTitle}>Keranjang</Text>
    </View>
  );

  if (k.query.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat keranjang…" />
      </SafeAreaView>
    );
  }

  if (k.query.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={k.query.error} onCobaLagi={() => k.query.refetch()} />
      </SafeAreaView>
    );
  }

  if (k.toko.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <EmptyState
          icon="shopping-cart"
          judul="Keranjang masih kosong"
          pesan="Produk daur ulang dari UMKM binaan akan muncul di sini setelah Anda menambahkannya."
          aksiLabel="Lihat Produk"
          onAksi={() => router.push("/pasar" as Href)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }}
      >
        {/*
          Satu kartu per toko, tapi **satu** tombol checkout untuk semuanya.
          Peladen memecah belanja lintas toko menjadi beberapa pesanan sendiri
          dan menuntut pilihan pengiriman untuk *setiap* toko dalam satu
          permintaan — checkout per toko yang dulu ada di sini selalu ditolak
          karena toko lain di keranjang tidak ikut disebutkan.
        */}
        {k.toko.map((t) => (
          <KartuToko key={t.umkm?.id ?? t.subtotal} t={t} k={k} />
        ))}

        {k.toko.length > 1 && (
          <Text style={styles.catatan}>
            Keranjang Anda berisi produk dari {k.toko.length} toko. Belanja ini
            akan dipecah menjadi {k.toko.length} pesanan dengan ongkos kirim
            masing-masing.
          </Text>
        )}
      </ScrollView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>
            Subtotal {k.jumlahItem} barang · belum termasuk ongkir
          </Text>
          <Text style={styles.barNilai}>{formatRupiah(k.totalBelanja)}</Text>
        </View>
        <Pressable
          style={styles.checkout}
          onPress={() => router.push("/checkout" as Href)}
          accessibilityRole="button"
          accessibilityLabel={`Lanjut ke checkout, subtotal ${formatRupiah(k.totalBelanja)}`}
        >
          <Text style={styles.checkoutTeks}>Checkout</Text>
        </Pressable>
      </BottomBar>
    </SafeAreaView>
  );
}

function KartuToko({
  t,
  k,
}: {
  t: KelompokKeranjang;
  k: ReturnType<typeof useKeranjang>;
}) {
  const item = t.item ?? [];
  const jumlah = item.reduce((n, it) => n + (it.qty ?? 0), 0);

  return (
    <View style={styles.kartuToko}>
      <Pressable
        style={styles.tokoKepala}
        onPress={() =>
          t.umkm?.id ? router.push(`/toko/${t.umkm.id}` as Href) : undefined
        }
        disabled={!t.umkm?.id}
        accessibilityRole="button"
        accessibilityLabel={`Kunjungi toko ${t.umkm?.nama ?? "ini"}`}
      >
        <View style={styles.tokoLogo}>
          {t.umkm?.foto_url ? (
            <Image
              source={{ uri: t.umkm.foto_url }}
              style={styles.tokoLogoIsi}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Feather name="shopping-bag" size={16} color={colors.brand} />
          )}
        </View>
        <Text style={styles.tokoNama} numberOfLines={1}>
          {t.umkm?.nama ?? "Toko"}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.subtext} />
      </Pressable>

      {item.map((it) => (
        <BarisItem key={it.id} it={it} k={k} />
      ))}

      <View style={styles.tokoKaki}>
        <Text style={styles.subtotalLabel}>
          Subtotal {jumlah} barang · {t.berat_gram} gram
        </Text>
        <Text style={styles.subtotalNilai}>{formatRupiah(t.subtotal)}</Text>
      </View>
    </View>
  );
}

function BarisItem({
  it,
  k,
}: {
  it: ItemKeranjang;
  k: ReturnType<typeof useKeranjang>;
}) {
  const p = it.produk;
  const stok = p?.stok ?? 0;
  const tidakTersedia = !p?.tersedia;

  const hapus = async () => {
    const yakin = await confirmDialog(
      "Hapus dari keranjang",
      `${p?.nama ?? "Produk ini"} akan dikeluarkan dari keranjang.`,
      "Hapus",
    );
    // Kuncinya slug produk — bukan `it.id`, yang adalah id baris keranjang.
    if (yakin && p?.slug) k.hapus.mutate(p.slug);
  };

  const ubah = (qty: number) => {
    if (!p?.id) return;
    k.ubahQty.mutate({ produk_id: p.id, qty });
  };

  return (
    <View style={styles.item}>
      <View style={styles.gambar}>
        {p?.foto_utama_url ? (
          <Image
            source={{ uri: p.foto_utama_url }}
            style={styles.gambarIsi}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={22} color="#CBD5E1" />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.nama} numberOfLines={2}>
          {p?.nama ?? "Produk"}
        </Text>
        <Text style={styles.harga}>{formatRupiah(it.subtotal)}</Text>

        {tidakTersedia && (
          <Text style={styles.peringatanStok}>
            {stok > 0
              ? "Sedang tidak dijual — akan dikeluarkan saat checkout."
              : "Stok habis — hapus dari keranjang untuk melanjutkan."}
          </Text>
        )}

        <View style={styles.aksi}>
          <View style={styles.qtyWrap}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => ubah(it.qty - 1)}
              disabled={it.qty <= 1 || k.sedangUbah}
              accessibilityRole="button"
              accessibilityLabel={`Kurangi jumlah ${p?.nama ?? "produk"}`}
              accessibilityState={{ disabled: it.qty <= 1 || k.sedangUbah }}
            >
              <Feather
                name="minus"
                size={16}
                color={it.qty <= 1 ? "#CBD5E1" : colors.text}
              />
            </Pressable>
            <Text style={styles.qty} accessibilityLabel={`Jumlah ${it.qty}`}>
              {it.qty}
            </Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => ubah(it.qty + 1)}
              disabled={(stok > 0 && it.qty >= stok) || k.sedangUbah}
              accessibilityRole="button"
              accessibilityLabel={`Tambah jumlah ${p?.nama ?? "produk"}`}
              accessibilityState={{
                disabled: (stok > 0 && it.qty >= stok) || k.sedangUbah,
              }}
            >
              <Feather
                name="plus"
                size={16}
                color={stok > 0 && it.qty >= stok ? "#CBD5E1" : colors.text}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={hapus}
            hitSlop={8}
            style={styles.hapus}
            accessibilityRole="button"
            accessibilityLabel={`Hapus ${p?.nama ?? "produk"} dari keranjang`}
          >
            {k.hapus.isPending ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Feather name="trash-2" size={18} color={colors.danger} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
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
  kartuToko: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 14,
  },
  tokoKepala: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tokoLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tokoLogoIsi: { width: "100%", height: "100%" },
  tokoNama: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  item: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    marginBottom: 4,
  },
  gambar: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambarIsi: { width: "100%", height: "100%" },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text },
  harga: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand,
    marginTop: 4,
  },
  peringatanStok: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    lineHeight: 16,
  },
  aksi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  hapus: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tokoKaki: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  subtotalLabel: { flex: 1, fontSize: 12, color: colors.subtext },
  subtotalNilai: { fontSize: 16, fontWeight: "800", color: colors.brand },
  barLabel: { fontSize: 12, color: colors.subtext },
  barNilai: { fontSize: 18, fontWeight: "800", color: colors.brand },
  checkout: {
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 26,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  checkoutTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  catatan: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
});
