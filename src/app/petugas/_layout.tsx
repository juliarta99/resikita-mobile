import { Feather } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

/** Role yang dituntut seluruh endpoint `/petugas/*`. */
const ROLE_PETUGAS = "petugas";

/**
 * Gerbang area petugas.
 *
 * Ini gerbang **tampilan**, bukan gerbang keamanan — peladen tetap memeriksa
 * role pada setiap permintaan dan menjawab `403` bila tidak berwenang. Yang
 * dilakukan di sini hanya mencegah warga biasa tersesat ke layar yang seluruh
 * isinya akan gagal dimuat, dan memberi penjelasan alih-alih deretan galat.
 */
export default function PetugasLayout() {
  const { user, loading, punyaRole } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingState pesan="Memeriksa akses…" />
      </SafeAreaView>
    );
  }

  if (!user || !punyaRole(ROLE_PETUGAS)) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.tengah}>
          <View style={styles.ikon}>
            <Feather name="lock" size={28} color={colors.subtext} />
          </View>
          <Text style={styles.judul}>Area Petugas</Text>
          <Text style={styles.pesan}>
            {user
              ? "Akun Anda tidak terdaftar sebagai petugas operasional. Hubungi admin wilayah bila seharusnya punya akses."
              : "Masuk dengan akun petugas untuk membuka halaman ini."}
          </Text>
          <Pressable
            style={styles.tombol}
            onPress={() => (user ? router.back() : router.push("/login"))}
            accessibilityRole="button"
            accessibilityLabel={user ? "Kembali" : "Masuk ke akun petugas"}
          >
            <Text style={styles.tombolTeks}>{user ? "Kembali" : "Masuk"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  tengah: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  ikon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  judul: { fontSize: 16, fontWeight: "700", color: colors.text },
  pesan: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 21,
  },
  tombol: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolTeks: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
