import { colors, radius, spacing } from "@/constants/theme";
import { getTokoDetail } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export default function DetailToko() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: t,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["toko", id],
    queryFn: () => getTokoDetail(id),
    retry: 1,
  });

  if (isLoading)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  if (isError || !t)
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.appbarPlain}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.appbarTitle}>Detail Toko</Text>
        </View>
        <View style={{ alignItems: "center", marginTop: 50, gap: 12 }}>
          <Text style={{ color: colors.subtext }}>Gagal memuat toko.</Text>
          <Pressable onPress={() => refetch()} style={styles.retry}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Coba Lagi</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );

  const produk: any[] = t.produk ?? [];

  return (
    <SafeAreaView style={styles.screenGreen} edges={["top"]}>
      {/* Header hijau */}
      <View style={styles.header}>
        <View style={styles.headBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.headTitle}>Detail Toko</Text>
        </View>
        <View style={styles.storeRow}>
          <View style={styles.storeLogo}>
            {t.foto ? (
              <Image source={{ uri: t.foto }} style={styles.logoImg} />
            ) : (
              <Feather name="home" size={28} color={colors.white} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{t.nama}</Text>
            {t.jumlah_ulasan > 0 && (
              <View style={styles.storeRating}>
                <Feather name="star" size={14} color="#FCD34D" />
                <Text style={styles.storeRatingText}>
                  {t.rating} • {t.jumlah_ulasan} ulasan
                </Text>
              </View>
            )}
            {!!t.alamat && (
              <Text style={styles.storeMeta} numberOfLines={1}>
                {t.alamat}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat value={`${produk.length}`} label="Produk" />
          <Stat
            value={produk.reduce((n, p) => n + (p.stok || 0), 0).toString()}
            label="Total Stok"
          />
        </View>
        <View style={styles.ctaRow}>
          {!!t.no_hp && (
            <Pressable
              style={styles.ctaWhite}
              onPress={() => Linking.openURL(`tel:${t.no_hp}`)}
            >
              <Feather name="phone" size={16} color={colors.brand} />
              <Text style={styles.ctaWhiteText}>Telepon</Text>
            </Pressable>
          )}
          {t.lat != null && t.lng != null && (
            <Pressable
              style={styles.ctaOutline}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`,
                )
              }
            >
              <Feather name="map-pin" size={16} color={colors.white} />
              <Text style={styles.ctaOutlineText}>Lokasi</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        {!!t.deskripsi && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tentang Toko</Text>
            <Text style={styles.desc}>{t.deskripsi}</Text>
            {!!t.alamat && (
              <Info icon="map-pin" label="Lokasi" value={t.alamat} />
            )}
            {!!t.no_hp && <Info icon="phone" label="Kontak" value={t.no_hp} />}
          </View>
        )}

        {(t.ulasan?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ulasan ({t.jumlah_ulasan})</Text>
            {t.ulasan.map((u: any) => {
              const tgl = u.tanggal
                ? new Date(u.tanggal).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";
              return (
                <View key={u.id} style={styles.ulasanItem}>
                  <View style={styles.ulasanHead}>
                    <View style={styles.ulasanAvatar}>
                      <Text style={styles.ulasanAvatarText}>
                        {(u.nama ?? "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ulasanNama}>{u.nama}</Text>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Feather
                            key={i}
                            name="star"
                            size={13}
                            color={i <= u.rating ? "#F59E0B" : "#E2E8F0"}
                          />
                        ))}
                      </View>
                    </View>
                    {!!tgl && <Text style={styles.ulasanTgl}>{tgl}</Text>}
                  </View>
                  {!!u.komentar && (
                    <Text style={styles.ulasanKomentar}>{u.komentar}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Produk ({produk.length})</Text>
        <View style={styles.grid}>
          {produk.map((p) => (
            <Pressable
              key={p.id}
              style={styles.prodCard}
              onPress={() => router.push(`/produk/${p.id}` as any)}
            >
              <View style={styles.prodImg}>
                {p.gambar?.[0] ? (
                  <Image source={{ uri: p.gambar[0] }} style={styles.logoImg} />
                ) : (
                  <Feather name="image" size={24} color="#CBD5E1" />
                )}
              </View>
              <View style={{ padding: 10 }}>
                <Text style={styles.prodNama} numberOfLines={2}>
                  {p.nama}
                </Text>
                <Text style={styles.prodHarga}>{rp(p.harga)}</Text>
                <Text style={styles.prodStok}>Stok: {p.stok}</Text>
              </View>
            </Pressable>
          ))}
          {produk.length === 0 && (
            <Text style={styles.empty}>Belum ada produk.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);
const Info = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Feather name={icon} size={16} color={colors.brand} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  screenGreen: { flex: 1, backgroundColor: colors.brand },
  appbarPlain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  retry: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
  },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  headTitle: { fontSize: 18, fontWeight: "700", color: colors.white },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  storeName: { fontSize: 20, fontWeight: "800", color: colors.white },
  storeMeta: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  storeRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  storeRatingText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { color: colors.white, fontSize: 20, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  ctaRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  ctaWhite: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    height: 46,
  },
  ctaWhiteText: { color: colors.brand, fontWeight: "700" },
  ctaOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: radius.md,
    height: 46,
  },
  ctaOutlineText: { color: colors.white, fontWeight: "700" },
  body: {
    flex: 1,
    backgroundColor: "#EEF3F1",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  desc: { color: "#334155", fontSize: 14, lineHeight: 21, marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 10,
  },
  infoLabel: { color: colors.subtext, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 14, marginTop: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  prodCard: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  prodImg: {
    height: 120,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  prodNama: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 18,
  },
  prodHarga: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brand,
    marginTop: 4,
  },
  prodStok: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  ulasanItem: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 12,
  },
  ulasanHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  ulasanAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  ulasanAvatarText: { color: colors.brand, fontWeight: "700" },
  ulasanNama: { fontSize: 14, fontWeight: "600", color: colors.text },
  ulasanTgl: { fontSize: 11, color: colors.subtext },
  ulasanKomentar: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginTop: 8,
  },
  empty: {
    color: colors.subtext,
    textAlign: "center",
    marginTop: 20,
    width: "100%",
  },
});
