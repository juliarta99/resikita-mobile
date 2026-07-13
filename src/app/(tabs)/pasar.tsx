import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getProduk } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
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

export default function Pasar() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["produk"],
    queryFn: () => getProduk(),
  });
  const produk = (data?.data ?? []) as any[];

  const beli = () => (user ? router.push("/beranda") : router.push("/login"));

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Pasar Daur Ulang</Text>
        <Text style={styles.sub}>Produk ramah lingkungan dari UMKM lokal</Text>
      </View>
      <View style={styles.sheet}>
        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            data={produk}
            numColumns={2}
            keyExtractor={(i) => String(i.id)}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={beli}>
                <View style={styles.thumb}>
                  {item.gambar ? (
                    <Image source={{ uri: item.gambar }} style={styles.img} />
                  ) : (
                    <Feather name="image" size={28} color="#CBD5E1" />
                  )}
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {item.nama}
                </Text>
                <Text style={styles.umkm} numberOfLines={1}>
                  {item.umkm?.nama}
                </Text>
                <Text style={styles.price}>
                  Rp {Number(item.harga).toLocaleString("id-ID")}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Belum ada produk.</Text>
            }
          />
        )}
        {!user && (
          <View style={styles.loginNote}>
            <Feather name="lock" size={14} color={colors.subtext} />
            <Text style={styles.loginNoteText}>
              Masuk untuk berbelanja & checkout
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 14 },
  title: { color: colors.white, fontSize: 22, fontWeight: "700" },
  sub: { color: colors.white70, fontSize: 13, marginTop: 2 },
  sheet: {
    flex: 1,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    borderRadius: radius.md,
    padding: 10,
  },
  thumb: {
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  img: { width: "100%", height: "100%" },
  name: { fontSize: 13, fontWeight: "600", color: colors.text },
  umkm: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "800", color: colors.brand, marginTop: 6 },
  empty: { textAlign: "center", color: colors.subtext, marginTop: 30 },
  loginNote: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  loginNoteText: { color: colors.subtext, fontSize: 12 },
});
