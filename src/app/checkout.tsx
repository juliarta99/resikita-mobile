import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { buatPesanan, cariTujuan, getSaldo, hitungOngkir } from "@/lib/api";
import { cart, CartItem, useCart } from "@/lib/cart";
import { storage } from "@/lib/storage";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// Baca field secara defensif (bentuk RajaOngkir bisa beragam)
const tujuanId = (d: any) =>
  d.id ?? d.destination_id ?? d.subdistrict_id ?? d.value;
const tujuanLabel = (d: any) =>
  d.label ??
  d.name ??
  ([d.subdistrict_name, d.district_name, d.city_name, d.province_name]
    .filter(Boolean)
    .join(", ") ||
    `Tujuan ${tujuanId(d)}`);
const opsiCost = (o: any) => Number(o.cost ?? o.value ?? o.price ?? 0);
const opsiKurir = (o: any) =>
  String(o.courier ?? o.code ?? o.name ?? "kurir").toUpperCase();
const opsiLayanan = (o: any) => o.service ?? o.description ?? "Reguler";
const opsiEtd = (o: any) => o.etd ?? o.estimasi ?? "";
const PREF_KEY = "checkout_prefs_v1";

export default function Checkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const items = useCart();
  const saldoQ = useQuery({ queryKey: ["saldo"], queryFn: getSaldo });
  const saldo = saldoQ.data ?? Number(user?.saldo ?? 0);

  const subtotal = items.reduce(
    (n: number, i: CartItem) => n + i.harga * i.qty,
    0,
  );

  const [alamat, setAlamat] = useState("");
  const [metode, setMetode] = useState<"saldo" | "midtrans">("saldo");
  const [loading, setLoading] = useState(false);

  // Ongkir / tujuan
  const [tujuanQ, setTujuanQ] = useState("");
  const [hasilTujuan, setHasilTujuan] = useState<any[]>([]);
  const [cariLoading, setCariLoading] = useState(false);
  const [tujuan, setTujuan] = useState<any | null>(null);
  const [opsiOngkir, setOpsiOngkir] = useState<any[]>([]);
  const [opsiLoading, setOpsiLoading] = useState(false);
  const [opsiDipilih, setOpsiDipilih] = useState<any | null>(null);

  const ongkir = opsiDipilih ? opsiCost(opsiDipilih) : 0;
  const grand = subtotal + ongkir;
  const saldoCukup = saldo >= grand;
  const bisaOrder =
    items.length > 0 &&
    alamat.trim().length > 0 &&
    (metode === "midtrans" || saldoCukup);

  // Cari tujuan (debounce)
  useEffect(() => {
    const q = tujuanQ.trim();
    if (q.length < 3) {
      setHasilTujuan([]);
      return;
    }
    let aktif = true;
    setCariLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await cariTujuan(q);
        if (aktif)
          setHasilTujuan(Array.isArray(data) ? data : (data?.data ?? []));
      } catch {
        if (aktif) setHasilTujuan([]);
      } finally {
        if (aktif) setCariLoading(false);
      }
    }, 500);
    return () => {
      aktif = false;
      clearTimeout(t);
    };
  }, [tujuanQ]);

  const hitungUntuk = async (d: any) => {
    if (!d || items.length === 0) return;
    setOpsiLoading(true);
    try {
      const res = await hitungOngkir({
        destination_id: Number(tujuanId(d)),
        items: items.map((i: CartItem) => ({
          product_id: i.product_id,
          qty: i.qty,
        })),
      });
      const opsi = Array.isArray(res?.opsi) ? res.opsi : [];
      setOpsiOngkir(opsi);
      setOpsiDipilih((prev: any) => prev ?? (opsi.length ? opsi[0] : null));
    } catch {
      setOpsiOngkir([]);
    } finally {
      setOpsiLoading(false);
    }
  };

  const pilihTujuan = (d: any) => {
    setTujuan(d);
    setHasilTujuan([]);
    setTujuanQ(tujuanLabel(d));
    setOpsiOngkir([]);
    setOpsiDipilih(null);
  };

  // Muat alamat & tujuan terakhir
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.get(PREF_KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.alamat) setAlamat(p.alamat);
        if (p.tujuan) {
          setTujuan(p.tujuan);
          setTujuanQ(p.tujuanLabel ?? tujuanLabel(p.tujuan));
        }
      } catch {}
    })();
  }, []);

  // Hitung ongkir otomatis saat tujuan tersedia (termasuk hasil restore) & keranjang siap
  useEffect(() => {
    if (tujuan && items.length > 0 && opsiOngkir.length === 0 && !opsiLoading) {
      hitungUntuk(tujuan);
    }
  }, [tujuan, items.length]);

  const hapusTersimpan = async () => {
    try {
      await storage.remove(PREF_KEY);
    } catch {}
    setAlamat("");
    setTujuan(null);
    setTujuanQ("");
    setHasilTujuan([]);
    setOpsiOngkir([]);
    setOpsiDipilih(null);
  };

  const buat = async () => {
    if (items.length === 0)
      return Alert.alert(
        "Keranjang Kosong",
        "Belum ada produk untuk dipesan.",
        [{ text: "Belanja", onPress: () => router.replace("/pasar" as any) }],
      );
    if (!alamat.trim())
      return Alert.alert("Alamat", "Isi alamat pengiriman terlebih dahulu.");
    if (metode === "saldo" && !saldoCukup)
      return Alert.alert(
        "Saldo Kurang",
        "Saldo tidak mencukupi. Pilih Midtrans atau isi saldo.",
      );

    setLoading(true);
    try {
      const res = await buatPesanan({
        items: items.map((i: CartItem) => ({
          product_id: i.product_id,
          qty: i.qty,
        })),
        metode_bayar: metode,
        alamat_kirim: alamat.trim(),
        ongkir,
        kurir: opsiDipilih
          ? `${opsiKurir(opsiDipilih)} ${opsiLayanan(opsiDipilih)}`
          : "Reguler",
      });
      const orderId = res?.pesanan?.id;
      storage
        .set(
          PREF_KEY,
          JSON.stringify({
            alamat: alamat.trim(),
            tujuan,
            tujuanLabel: tujuanQ,
          }),
        )
        .catch(() => {});
      cart.clear();
      qc.invalidateQueries({ queryKey: ["saldo"] });
      qc.invalidateQueries({ queryKey: ["pesanan"] });

      if (metode === "midtrans" && res?.snap_token) {
        router.replace({
          pathname: "/bayar",
          params: { snap_token: res.snap_token, title: "Pembayaran Pesanan" },
        } as any);
      } else {
        Alert.alert(
          "Pesanan Dibuat",
          "Pembayaran dengan saldo berhasil. Terima kasih!",
          [
            {
              text: "Lihat Pesanan",
              onPress: () =>
                router.replace(
                  (orderId ? `/pesanan/${orderId}` : "/pesanan") as any,
                ),
            },
          ],
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat membuat pesanan.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Checkout</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alamat */}
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={styles.cardHead}>
              <Feather name="map-pin" size={18} color={colors.brand} />
              <Text style={styles.cardTitle}>Alamat Pengiriman</Text>
            </View>
            {(alamat.length > 0 || tujuan) && (
              <Pressable onPress={hapusTersimpan} hitSlop={8}>
                <Text style={styles.resetLink}>Reset</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.penerima}>
            {user?.name}
            {user?.phone ? ` • ${user.phone}` : ""}
          </Text>
          <TextInput
            style={styles.alamatInput}
            value={alamat}
            onChangeText={setAlamat}
            placeholder="Tulis alamat lengkap: jalan, no, RT/RW, kelurahan..."
            placeholderTextColor="#9AA5B1"
            multiline
          />
        </View>

        {/* Tujuan + Ongkir */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Feather name="truck" size={18} color={colors.brand} />
            <Text style={styles.cardTitle}>Pengiriman</Text>
          </View>
          <Text style={styles.label}>Kota / Kecamatan Tujuan</Text>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              value={tujuanQ}
              onChangeText={(t) => {
                setTujuanQ(t);
                setTujuan(null);
                setOpsiOngkir([]);
                setOpsiDipilih(null);
              }}
              placeholder="mis. Kuta, Denpasar..."
              placeholderTextColor="#9AA5B1"
            />
            {cariLoading && (
              <ActivityIndicator size="small" color={colors.brand} />
            )}
          </View>
          {hasilTujuan.length > 0 && (
            <View style={styles.dropdown}>
              {hasilTujuan.slice(0, 6).map((d, i) => (
                <Pressable
                  key={tujuanId(d) ?? i}
                  style={styles.dropItem}
                  onPress={() => pilihTujuan(d)}
                >
                  <Feather name="map-pin" size={14} color={colors.subtext} />
                  <Text style={styles.dropText} numberOfLines={2}>
                    {tujuanLabel(d)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {opsiLoading && (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
          )}
          {opsiOngkir.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Pilih Layanan</Text>
              {opsiOngkir.map((o, i) => {
                const aktif = opsiDipilih === o;
                return (
                  <Pressable
                    key={i}
                    style={[styles.opsi, aktif && styles.opsiActive]}
                    onPress={() => setOpsiDipilih(o)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.opsiNama}>
                        {opsiKurir(o)} • {opsiLayanan(o)}
                      </Text>
                      {!!opsiEtd(o) && (
                        <Text style={styles.opsiEtd}>
                          Estimasi {opsiEtd(o)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.opsiHarga}>{rp(opsiCost(o))}</Text>
                    <Feather
                      name={aktif ? "check-circle" : "circle"}
                      size={20}
                      color={aktif ? colors.brand : "#CBD5E1"}
                      style={{ marginLeft: 8 }}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
          {tujuan && !opsiLoading && opsiOngkir.length === 0 && (
            <Text style={styles.hintErr}>
              Ongkir tidak tersedia untuk tujuan ini. Coba tujuan lain.
            </Text>
          )}
        </View>

        {/* Produk */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Produk Pesanan</Text>
          {items.map((it: CartItem) => (
            <View key={it.product_id} style={styles.prodRow}>
              <View style={styles.prodThumb}>
                {it.gambar ? (
                  <Image source={{ uri: it.gambar }} style={styles.img} />
                ) : (
                  <Feather name="image" size={18} color="#CBD5E1" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodNama} numberOfLines={2}>
                  {it.nama}
                </Text>
                <Text style={styles.prodHarga}>{rp(it.harga)}</Text>
              </View>
              <Text style={styles.prodQty}>x{it.qty}</Text>
            </View>
          ))}
        </View>

        {/* Metode pembayaran */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Metode Pembayaran</Text>
          <Pressable
            style={[styles.pay, metode === "saldo" && styles.payActive]}
            onPress={() => setMetode("saldo")}
          >
            <View style={styles.payIcon}>
              <Feather name="credit-card" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Saldo Niti Resik</Text>
              <Text
                style={[styles.paySub, !saldoCukup && { color: colors.danger }]}
              >
                {rp(saldo)}
                {!saldoCukup ? " • tidak cukup" : " • langsung terpotong"}
              </Text>
            </View>
            <Feather
              name={metode === "saldo" ? "check-circle" : "circle"}
              size={22}
              color={metode === "saldo" ? colors.brand : "#CBD5E1"}
            />
          </Pressable>
          <Pressable
            style={[styles.pay, metode === "midtrans" && styles.payActive]}
            onPress={() => setMetode("midtrans")}
          >
            <View style={styles.payIcon}>
              <Feather name="smartphone" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payTitle}>Midtrans</Text>
              <Text style={styles.paySub}>
                Transfer bank, e-wallet, QRIS, kartu
              </Text>
            </View>
            <Feather
              name={metode === "midtrans" ? "check-circle" : "circle"}
              size={22}
              color={metode === "midtrans" ? colors.brand : "#CBD5E1"}
            />
          </Pressable>
        </View>

        {/* Ringkasan */}
        <View style={styles.card}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Subtotal</Text>
            <Text style={styles.sumValue}>{rp(subtotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Ongkir</Text>
            <Text
              style={[
                styles.sumValue,
                ongkir === 0 && { color: colors.subtext },
              ]}
            >
              {opsiDipilih ? rp(ongkir) : "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <View>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalValue}>{rp(grand)}</Text>
        </View>
        <Pressable
          style={[styles.orderBtn, (!bisaOrder || loading) && { opacity: 0.5 }]}
          onPress={buat}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.orderText}>Buat Pesanan</Text>
          )}
        </Pressable>
      </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resetLink: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  penerima: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  alamatInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 70,
    color: colors.text,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.subtext,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, color: colors.text },
  dropdown: {
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: radius.md,
    marginTop: 6,
    overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropText: { flex: 1, color: colors.text, fontSize: 13 },
  opsi: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  opsiActive: { borderColor: colors.brand, backgroundColor: "#F1F8F5" },
  opsiNama: { fontSize: 14, fontWeight: "700", color: colors.text },
  opsiEtd: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  opsiHarga: { fontSize: 14, fontWeight: "800", color: colors.brand },
  hintErr: { color: colors.danger, fontSize: 12, marginTop: 10 },
  prodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  prodThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  prodNama: { fontSize: 13, fontWeight: "600", color: colors.text },
  prodHarga: {
    fontSize: 13,
    color: colors.brand,
    fontWeight: "700",
    marginTop: 2,
  },
  prodQty: { color: colors.subtext, fontWeight: "600" },
  pay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  payActive: { borderColor: colors.brand, backgroundColor: "#F1F8F5" },
  payIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  payTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  paySub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sumLabel: { color: colors.subtext, fontSize: 14 },
  sumValue: { color: colors.text, fontWeight: "600" },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { color: colors.subtext, fontSize: 13 },
  totalValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  orderBtn: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  orderText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
