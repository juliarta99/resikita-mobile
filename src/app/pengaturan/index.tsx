import { colors, radius, spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Pengaturan() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Pengaturan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Keamanan & Privasi</Text>
          <Baris
            icon="user"
            judul="Edit Profil"
            sub="Nama, kontak, dan domisili"
            ke="/profil/edit"
          />
          <Baris
            icon="lock"
            judul="Ubah Kata Sandi"
            sub="Perbarui kata sandi akun"
            ke="/pengaturan/password"
          />
          <Baris
            icon="bell"
            judul="Notifikasi"
            sub="Kabar laporan, setoran, dan pesanan"
            ke="/notifikasi"
          />
        </View>

        {/*
          Penghapusan akun dipisah ke kartunya sendiri di bagian paling bawah,
          dengan warna merah. Menaruhnya sebaris dengan menu biasa membuatnya
          terlalu mudah tersentuh, dan ini satu-satunya aksi di layar ini yang
          tidak bisa dibatalkan.
        */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>Zona Berbahaya</Text>
          <Pressable
            style={styles.row}
            onPress={() => router.push("/pengaturan/hapus-akun" as Href)}
            accessibilityRole="button"
            accessibilityLabel="Hapus akun saya"
          >
            <View style={[styles.icon, { backgroundColor: colors.danger }]}>
              <Feather name="trash-2" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: colors.danger }]}>
                Hapus Akun
              </Text>
              <Text style={styles.rowSub}>
                Menghapus seluruh data Anda secara permanen
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#CBD5E1" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Baris({
  icon,
  judul,
  sub,
  ke,
}: {
  icon: keyof typeof Feather.glyphMap;
  judul: string;
  sub: string;
  ke: string;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(ke as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${judul}. ${sub}`}
    >
      <View style={styles.icon}>
        <Feather name={icon} size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{judul}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#CBD5E1" />
    </Pressable>
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
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
});
