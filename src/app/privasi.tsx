import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";

const SECTIONS: { title: string; points: string[] }[] = [
  {
    title: "Informasi yang Kami Kumpulkan",
    points: [
      "Informasi pribadi: nama, NIK, email, nomor telepon, dan tanggal lahir yang kamu berikan saat mendaftar.",
      "Informasi transaksi: data setoran sampah, penarikan saldo, dan riwayat pembelian.",
      "Informasi lokasi: hanya saat kamu memakai fitur peta atau membuat laporan.",
      "Data penggunaan: bagaimana kamu berinteraksi dengan fitur aplikasi.",
    ],
  },
  {
    title: "Bagaimana Kami Menggunakan Informasi",
    points: [
      "Menjalankan layanan bank sampah, pencatatan setoran, dan penarikan saldo.",
      "Menampilkan fasilitas terdekat dan menindaklanjuti laporan sampah.",
      "Meningkatkan kualitas layanan dan pengalaman pengguna.",
      "Mengirim notifikasi terkait akun dan transaksimu.",
    ],
  },
  {
    title: "Perlindungan Data",
    points: [
      "Kata sandi disimpan dalam bentuk terenkripsi.",
      "Akses data dibatasi hanya untuk keperluan layanan.",
      "Kami tidak menjual data pribadimu kepada pihak ketiga.",
    ],
  },
  {
    title: "Hak Kamu",
    points: [
      "Mengakses dan memperbarui data profil melalui menu Edit Profil.",
      "Meminta penghapusan akun dengan menghubungi admin.",
    ],
  },
];

export default function Privasi() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Kebijakan Privasi</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Feather name="shield" size={22} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Privasi Anda Penting Bagi Kami</Text>
            <Text style={styles.introDesc}>Kebijakan ini menjelaskan bagaimana Niti Resik mengumpulkan, menggunakan, dan melindungi informasi pribadimu.</Text>
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
        <Text style={styles.footer}>Terakhir diperbarui: Juli 2026</Text>
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
