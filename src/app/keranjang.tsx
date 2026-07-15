import BottomBar from "@/components/BottomBar";
import { colors, radius, spacing } from "@/constants/theme";
import { cart, CartItem, useCart } from "@/lib/cart";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const GRATIS_MIN = 50000;

export default function Keranjang() {
  const items = useCart();
  const subtotal = items.reduce(
    (n: number, i: CartItem) => n + i.harga * i.qty,
    0,
  );
  const gratisOngkir = subtotal >= GRATIS_MIN;

  return (
    // edges "bottom" dipakai agar state kosong (tanpa bar) juga aman
    // dari tombol navigasi HP.
    <SafeAreaView
      style={styles.screen}
      edges={items.length === 0 ? ["top", "bottom"] : ["top"]}
    >
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Keranjang Belanja</Text>
        <Text style={styles.appbarSub}>{items.length} item</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="shopping-cart" size={30} color={colors.brand} />
          </View>
          <Text style={styles.emptyText}>Keranjang masih kosong</Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/pasar" as any)}
          >
            <Text style={styles.emptyBtnText}>Mulai Belanja</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Bar di layar ini IKUT ALUR konten (bukan melayang), sehingga
              ScrollView tidak perlu paddingBottom tambahan. */}
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 20 }}
          >
            {items.length > 0 && (
              <Text style={styles.tokoName}>{items[0].umkm}</Text>
            )}
            {items.map((it: CartItem) => (
              <View key={it.product_id} style={styles.card}>
                <View style={styles.thumb}>
                  {it.gambar ? (
                    <Image source={{ uri: it.gambar }} style={styles.img} />
                  ) : (
                    <Feather name="image" size={22} color="#CBD5E1" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nama} numberOfLines={2}>
                    {it.nama}
                  </Text>
                  <Text style={styles.harga}>{rp(it.harga)}</Text>
                  <View style={styles.qtyRow}>
                    <View style={styles.qtyBox}>
                      <Pressable
                        onPress={() => cart.setQty(it.product_id, it.qty - 1)}
                        hitSlop={6}
                      >
                        <Feather name="minus" size={16} color={colors.text} />
                      </Pressable>
                      <Text style={styles.qtyText}>{it.qty}</Text>
                      <Pressable
                        onPress={() => cart.setQty(it.product_id, it.qty + 1)}
                        hitSlop={6}
                      >
                        <Feather name="plus" size={16} color={colors.text} />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => cart.remove(it.product_id)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            <View
              style={[
                styles.ongkirNote,
                { backgroundColor: gratisOngkir ? "#E4F3EC" : "#FEF3C7" },
              ]}
            >
              <Feather
                name={gratisOngkir ? "check-circle" : "info"}
                size={18}
                color={gratisOngkir ? colors.brand : "#B45309"}
              />
              <Text style={styles.ongkirText}>
                {gratisOngkir
                  ? "Gratis Ongkir! Belanja min. Rp50.000 terpenuhi."
                  : `Belanja Rp${(GRATIS_MIN - subtotal).toLocaleString("id-ID")} lagi untuk gratis ongkir.`}
              </Text>
            </View>
          </ScrollView>

          {/* `static` = bar ikut alur konten, tidak melayang menimpa layar.
              Ruang untuk tombol navigasi HP tetap ditangani BottomBar. */}
          <BottomBar static>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>
                Subtotal ({items.length} item)
              </Text>
              <Text style={styles.sumValue}>{rp(subtotal)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Ongkir</Text>
              <Text
                style={[
                  styles.sumValue,
                  gratisOngkir && { color: colors.brand },
                ]}
              >
                {gratisOngkir ? "GRATIS" : "-"}
              </Text>
            </View>
            <View style={[styles.sumRow, { marginTop: 6 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{rp(subtotal)}</Text>
            </View>
            <Pressable
              style={styles.checkoutBtn}
              onPress={() => router.push("/checkout" as any)}
            >
              <Text style={styles.checkoutText}>
                Checkout (
                {items.reduce((n: number, i: CartItem) => n + i.qty, 0)})
              </Text>
            </Pressable>
          </BottomBar>
        </>
      )}
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
  appbarSub: { marginLeft: "auto", color: colors.subtext, fontSize: 13 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 30,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DCEFE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyText: { color: colors.brand, fontSize: 15, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: colors.white, fontWeight: "700" },
  tokoName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 19 },
  harga: { fontSize: 15, fontWeight: "800", color: colors.brand, marginTop: 4 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 36,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    minWidth: 18,
    textAlign: "center",
  },
  ongkirNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 4,
  },
  ongkirText: { flex: 1, fontSize: 13, color: "#334155" },
  // styles.bottom DIHAPUS — latar, garis atas, padding, dan ruang nav bar HP
  // kini ditangani komponen <BottomBar static>.
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sumLabel: { color: colors.subtext, fontSize: 14 },
  sumValue: { color: colors.text, fontWeight: "600" },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  checkoutBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  checkoutText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
