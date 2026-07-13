import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "Penerimaan Syarat",
    points: [
      "Dengan mengunduh dan menggunakan Niti Resik, kamu setuju terikat pada Syarat & Ketentuan ini.",
      "Jika tidak setuju, mohon untuk tidak menggunakan aplikasi.",
      "Kamu harus berusia minimal 17 tahun atau memiliki izin orang tua/wali.",
    ],
  },
  {
    title: "Akun & Keamanan",
    points: [
      "Kamu bertanggung jawab menjaga kerahasiaan akun dan kata sandi.",
      "Data yang didaftarkan harus benar dan dapat dipertanggungjawabkan.",
      "Segala aktivitas pada akunmu menjadi tanggung jawabmu.",
    ],
  },
  {
    title: "Penggunaan Layanan",
    points: [
      "Layanan bank sampah, saldo, dan penarikan mengikuti ketentuan yang berlaku di aplikasi.",
      "Saldo hasil setoran tidak dapat dipindahtangankan selain melalui penarikan resmi.",
      "Dilarang menyalahgunakan fitur, memalsukan setoran, atau merugikan pengguna lain.",
    ],
  },
  {
    title: "Batasan Tanggung Jawab",
    points: [
      "Hasil Klasifikasi AI bersifat bantuan dan tidak menjamin akurasi 100%.",
      "Niti Resik berupaya menjaga layanan tetap tersedia, namun tidak menjamin bebas gangguan.",
    ],
  },
];

export default function Syarat() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Syarat & Ketentuan</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Feather name="file-text" size={22} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Syarat & Ketentuan Penggunaan</Text>
            <Text style={styles.introDesc}>Harap membaca dengan saksama. Dengan menggunakan aplikasi, kamu menyetujui ketentuan ini.</Text>
          </View>
        </View>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            {s.points.map((p, i) => (
              <View key={i} style={styles.liRow}><Text style={styles.dot}>•</Text><Text style={styles.li}>{p}</Text></View>
            ))}
          </View>
        ))}
        <Text style={styles.footer}>Berlaku sejak: Juli 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14 },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  intro: { flexDirection: "row", gap: 12, backgroundColor: "#E4F3EC", borderRadius: radius.lg, padding: spacing.lg, marginBottom: 16 },
  introIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  introTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  introDesc: { color: colors.subtext, fontSize: 13, marginTop: 4, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10 },
  liRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dot: { color: colors.brand, fontSize: 15, lineHeight: 20 },
  li: { flex: 1, fontSize: 14, color: colors.subtext, lineHeight: 20 },
  footer: { textAlign: "center", color: "#94A3B8", fontSize: 12 },
});
