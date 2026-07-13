import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";

type QA = { q: string; a: string };
const FAQ: { grup: string; items: QA[] }[] = [
  {
    grup: "Umum",
    items: [
      { q: "Apa itu Niti Resik?", a: "Niti Resik adalah platform ekonomi sirkular pengelolaan sampah untuk Kabupaten Badung, Bali. Kamu bisa memilah sampah, menyetor ke Bank Sampah untuk mendapat saldo, memakai Klasifikasi AI, hingga melaporkan masalah sampah di sekitarmu." },
      { q: "Bagaimana cara mendaftar?", a: "Buka halaman Daftar, isi nama, NIK, nomor telepon, dan data diri, lalu verifikasi lewat kode OTP yang dikirim ke nomormu. Setelah aktif, kamu langsung memperoleh ID Nasabah." },
      { q: "Apakah aplikasi ini gratis?", a: "Ya. Seluruh fitur inti Niti Resik gratis untuk warga. Tidak ada biaya pendaftaran maupun biaya administrasi penarikan saldo." },
    ],
  },
  {
    grup: "Bank Sampah",
    items: [
      { q: "Bagaimana cara menyetor sampah?", a: "Pilah sampahmu berdasarkan jenis (plastik, kertas, logam, kaca, organik). Kunjungi Bank Sampah terdekat, lalu tunjukkan QR Code/ID Nasabah kepada petugas agar setoran tercatat dan saldo bertambah." },
      { q: "Berapa harga sampah per kg?", a: "Harga mengikuti Katalog Harga Real-Time di aplikasi dan dapat berubah sewaktu-waktu sesuai kebijakan bank sampah setempat." },
      { q: "Bagaimana cara menarik saldo?", a: "Buka menu Tarik Saldo, isi jumlah (minimal sesuai ketentuan), lalu masukkan data rekening tujuan. Penarikan diproses 1–2 hari kerja setelah disetujui." },
    ],
  },
  {
    grup: "Klasifikasi AI",
    items: [
      { q: "Apa itu Klasifikasi AI?", a: "Fitur untuk memindai foto sampah dan mengetahui jenis, kategori (organik/anorganik/B3/residu), serta cara pengolahan yang disarankan." },
      { q: "Apakah hasil AI selalu akurat?", a: "Tidak selalu. Hasil bersifat bantuan; pastikan foto jelas dan terang. Bila ragu, ikuti panduan pemilahan atau tanyakan ke petugas bank sampah." },
    ],
  },
  {
    grup: "Laporan & Peta",
    items: [
      { q: "Bagaimana melaporkan tumpukan sampah?", a: "Buka fitur Lapor, unggah foto, pilih kategori, dan tandai lokasi di peta. Laporanmu diteruskan ke pihak terkait untuk ditindaklanjuti." },
      { q: "Apakah lokasi saya disimpan?", a: "Lokasi hanya digunakan saat kamu memakai fitur peta atau membuat laporan, untuk menampilkan fasilitas terdekat dan menandai titik laporan." },
    ],
  },
];

export default function Bantuan() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const term = q.toLowerCase();
  const grup = FAQ.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.q.toLowerCase().includes(term) || it.a.toLowerCase().includes(term)),
  })).filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Bantuan & FAQ</Text>
      </View>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput style={styles.search} placeholder="Cari pertanyaan..." placeholderTextColor="#9AA5B1" value={q} onChangeText={setQ} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {grup.length === 0 ? (
          <Text style={styles.empty}>Tidak ada pertanyaan yang cocok.</Text>
        ) : grup.map((g) => (
          <View key={g.grup} style={styles.card}>
            <Text style={styles.grup}>{g.grup}</Text>
            {g.items.map((it) => {
              const id = g.grup + it.q;
              const expanded = open === id;
              return (
                <View key={id} style={styles.qaWrap}>
                  <Pressable style={styles.qRow} onPress={() => setOpen(expanded ? null : id)}>
                    <Text style={styles.qText}>{it.q}</Text>
                    <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.subtext} />
                  </Pressable>
                  {expanded && <Text style={styles.aText}>{it.a}</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14 },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingBottom: 14 },
  search: { flex: 1, height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, color: colors.text },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: 16 },
  grup: { fontSize: 15, fontWeight: "700", color: colors.text, padding: 8 },
  qaWrap: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  qRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12 },
  qText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  aText: { fontSize: 13, color: colors.subtext, lineHeight: 20, paddingHorizontal: 12, paddingBottom: 14 },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 30 },
});
