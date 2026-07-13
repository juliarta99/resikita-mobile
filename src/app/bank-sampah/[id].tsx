import { colors, radius, spacing } from "@/constants/theme";
import { getBankSampahDetail } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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

export default function BankSampahDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: bs, isLoading } = useQuery({
    queryKey: ["bank-sampah", id],
    queryFn: () => getBankSampahDetail(id),
  });

  if (isLoading || !bs) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail Bank Sampah</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.hero}>
          {bs.foto ? (
            <Image source={{ uri: bs.foto }} style={styles.heroImg} />
          ) : (
            <Feather name="refresh-ccw" size={40} color={colors.brand} />
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{bs.nama}</Text>
          <View style={styles.row}>
            <Feather name="users" size={14} color={colors.subtext} />
            <Text style={styles.rowText}>{bs.jumlah_nasabah} nasabah</Text>
          </View>
          <View style={styles.row}>
            <Feather name="map-pin" size={14} color={colors.subtext} />
            <Text style={styles.rowText}>{bs.alamat}</Text>
          </View>
          {bs.jarak_km != null && (
            <View style={styles.row}>
              <Feather name="navigation" size={14} color={colors.subtext} />
              <Text style={styles.rowText}>
                {bs.jarak_km} km dari lokasi Anda
              </Text>
            </View>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Feather name="users" size={18} color={colors.brand} />
              <Text style={styles.statLabel}>Total Nasabah</Text>
              <Text style={styles.statVal}>{bs.jumlah_nasabah}</Text>
            </View>
            <View style={styles.stat}>
              <Feather name="phone" size={18} color={colors.brand} />
              <Text style={styles.statLabel}>Kontak</Text>
              <Text style={styles.statVal} numberOfLines={1}>
                {bs.no_hp ?? "-"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi</Text>
            <Text style={styles.infoText}>
              Bank sampah menerima setoran sampah terpilah dari masyarakat. Bawa
              sampah Anda dan tunjukkan QR identitas untuk mencatat setoran ke
              saldo.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  hero: {
    height: 170,
    backgroundColor: "#DCEFE7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  body: { padding: spacing.lg },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  rowText: { color: colors.subtext, fontSize: 14, flex: 1 },
  stats: { flexDirection: "row", gap: 12, marginTop: 18 },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    gap: 6,
  },
  statLabel: { color: colors.subtext, fontSize: 12 },
  statVal: { color: colors.text, fontSize: 18, fontWeight: "800" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  infoText: { color: colors.subtext, fontSize: 14, lineHeight: 20 },
});
