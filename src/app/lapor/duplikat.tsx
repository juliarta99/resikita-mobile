import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import { colors, radius, spacing } from "@/constants/theme";
import { duplikatSementara } from "@/lib/duplikatSementara";
import { rupaStatus } from "@/lib/warnaStatus";
import type { LaporanRingkas } from "@/types/laporan";

function tanggalTerbaca(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KonfirmasiDuplikat() {
  // Dibaca sekali saat mount: penampungnya sengaja berumur pendek, dan membaca
  // ulang tiap render akan mengambil nilai yang sudah dibersihkan.
  const [kandidat] = useState<LaporanRingkas[]>(() =>
    duplikatSementara.ambilKandidat(),
  );
  // Dinamai lengkap supaya tidak menutupi `radius` dari tema di dalam komponen.
  const [radiusMeter] = useState(() => duplikatSementara.ambilRadius());
  const [dipilih, setDipilih] = useState<number | null>(
    duplikatSementara.yangDipilih()?.id ?? null,
  );

  const gabung = () => {
    const pilihan = kandidat.find((k) => k.id === dipilih) ?? null;
    duplikatSementara.pilih(pilihan);
    router.back();
  };

  const laporTerpisah = () => {
    duplikatSementara.pilih(null);
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke formulir laporan"
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Laporan Serupa</Text>
      </View>

      {kandidat.length === 0 ? (
        <EmptyState
          icon="check-circle"
          judul="Tidak ada laporan serupa"
          pesan="Silakan lanjutkan mengirim laporan Anda."
          aksiLabel="Kembali"
          onAksi={() => router.back()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        >
          <View style={styles.banner}>
            <Feather name="info" size={18} color="#8A6D1B" />
            <Text style={styles.bannerTeks}>
              Sudah ada laporan dalam radius {radiusMeter} meter dari titik yang
              Anda pilih. Menggabungkan laporan membuat petugas menangani satu
              masalah sekali, bukan berkali-kali, dan Anda tetap menerima kabar
              perkembangannya.
            </Text>
          </View>

          {kandidat.map((k) => {
            const aktif = dipilih === k.id;
            const rupa = rupaStatus(k.status_warna);
            return (
              <Pressable
                key={k.id}
                style={[styles.kartu, aktif && styles.kartuAktif]}
                onPress={() => setDipilih(aktif ? null : k.id)}
                accessibilityRole="radio"
                accessibilityLabel={`${k.judul}, status ${k.status_label}${k.alamat ? `, di ${k.alamat}` : ""}`}
                accessibilityState={{ selected: aktif }}
              >
                <View style={styles.kartuAtas}>
                  <Text style={styles.judul} numberOfLines={2}>
                    {k.judul}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      aktif && { borderColor: colors.brand },
                    ]}
                  >
                    {aktif && <View style={styles.radioIsi} />}
                  </View>
                </View>

                <Text style={styles.tiket}>{k.tiket}</Text>

                <View style={styles.metaBaris}>
                  {!!k.alamat && (
                    <View style={styles.meta}>
                      <Feather
                        name="map-pin"
                        size={13}
                        color={colors.subtext}
                      />
                      <Text style={styles.metaTeks} numberOfLines={1}>
                        {k.alamat}
                      </Text>
                    </View>
                  )}
                  {!!k.created_at && (
                    <View style={styles.meta}>
                      <Feather name="clock" size={13} color={colors.subtext} />
                      <Text style={styles.metaTeks}>
                        {tanggalTerbaca(k.created_at)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label dan warnanya datang dari peladen; tabel status lokal
                    yang dulu ada di sini selalu tertinggal setiap kali enum
                    bertambah. */}
                <View style={[styles.status, { backgroundColor: rupa.bg }]}>
                  <Text style={[styles.statusTeks, { color: rupa.fg }]}>
                    {k.status_label}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Pressable
            style={[styles.tombolUtama, !dipilih && styles.tombolMati]}
            onPress={gabung}
            disabled={!dipilih}
            accessibilityRole="button"
            accessibilityLabel="Gabungkan ke laporan yang dipilih"
            accessibilityState={{ disabled: !dipilih }}
          >
            <Feather name="git-merge" size={18} color={colors.white} />
            <Text style={styles.tombolUtamaTeks}>Gabungkan ke Laporan Ini</Text>
          </Pressable>

          {/*
            Jalan keluar ini harus selalu ada. Kemiripan lokasi bukan bukti
            kesamaan masalah, dua tumpukan sampah berbeda bisa berjarak sepuluh
            meter, dan hanya pelapor yang berdiri di sana yang tahu.
          */}
          <Pressable
            style={styles.tombolKedua}
            onPress={laporTerpisah}
            accessibilityRole="button"
            accessibilityLabel="Kirim sebagai laporan terpisah"
          >
            <Text style={styles.tombolKeduaTeks}>
              Ini masalah lain, lapor terpisah
            </Text>
          </Pressable>
        </ScrollView>
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
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEF9E7",
    borderWidth: 1,
    borderColor: "#F5E6A8",
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  bannerTeks: { flex: 1, color: "#8A6D1B", fontSize: 13, lineHeight: 19 },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: spacing.md,
    marginBottom: 12,
  },
  kartuAktif: { borderColor: colors.brand, backgroundColor: "#F3FBF7" },
  kartuAtas: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  judul: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioIsi: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  tiket: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  metaBaris: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTeks: { flexShrink: 1, fontSize: 12, color: colors.subtext },
  status: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  tombolUtama: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
  tombolMati: { backgroundColor: colors.muted },
  tombolUtamaTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  tombolKedua: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  tombolKeduaTeks: { color: colors.link, fontWeight: "700", fontSize: 14 },
});
