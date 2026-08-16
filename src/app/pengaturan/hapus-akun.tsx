import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { hapusAkun } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/error";
import { confirmDialog, notify } from "@/lib/dialog";

/**
 * Kata yang harus diketik untuk melanjutkan.
 *
 * Menuntut kata sandi saja tidak cukup: pengguna sering mengetiknya secara
 * refleks. Mengetik kata ini memaksa satu momen sadar bahwa yang sedang terjadi
 * adalah penghapusan akun, bukan sekadar verifikasi biasa.
 */
const KATA_KONFIRMASI = "HAPUS";

const YANG_HILANG = [
  "Saldo yang belum ditarik",
  "Riwayat setoran, laporan, dan klasifikasi",
  "Pesanan dan ulasan yang pernah Anda buat",
  "Percakapan dengan asisten",
];

export default function HapusAkun() {
  const { keluar } = useAuth();
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [tampak, setTampak] = useState(false);
  const [error, setError] = useState("");

  const hapus = useMutation({
    mutationFn: () => hapusAkun(password),
    onSuccess: async () => {
      // Sesi lokal tetap dibersihkan lewat `keluar()` supaya token, cache
      // Query, dan token push ikut dicabut — peladen menghapus akunnya, tapi
      // sisa keadaan di perangkat ini urusan kita.
      await keluar();
      notify(
        "Akun dihapus",
        "Terima kasih pernah menjadi bagian dari Resikita.",
      );
      router.replace("/");
    },
    onError: (e: unknown) =>
      setError(
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Akun tidak dapat dihapus. Coba lagi.",
      ),
  });

  const submit = async () => {
    setError("");
    if (!password) return setError("Masukkan kata sandi Anda.");
    if (konfirmasi.trim().toUpperCase() !== KATA_KONFIRMASI)
      return setError(`Ketik ${KATA_KONFIRMASI} untuk melanjutkan.`);

    const yakin = await confirmDialog(
      "Hapus akun secara permanen?",
      "Seluruh data Anda akan dihapus dan tidak bisa dikembalikan. Pastikan saldo Anda sudah ditarik.",
      "Hapus Akun",
    );
    if (yakin) hapus.mutate();
  };

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
        <Text style={styles.appbarTitle}>Hapus Akun</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.peringatan}>
            <View style={styles.peringatanIkon}>
              <Feather name="alert-triangle" size={22} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.peringatanJudul}>
                Tindakan ini tidak bisa dibatalkan
              </Text>
              <Text style={styles.peringatanTeks}>
                Setelah dihapus, akun Anda tidak dapat dipulihkan dan Anda perlu
                mendaftar dari awal bila ingin kembali.
              </Text>
            </View>
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Yang ikut terhapus</Text>
            {YANG_HILANG.map((t) => (
              <View key={t} style={styles.baris}>
                <Feather name="x" size={14} color={colors.danger} />
                <Text style={styles.barisTeks}>{t}</Text>
              </View>
            ))}
            {/*
              Peringatan saldo ditaruh terpisah dan paling menonjol: ini
              satu-satunya kerugian yang bisa diukur dengan uang, dan
              satu-satunya yang masih bisa dicegah pengguna sebelum menekan
              tombol.
            */}
            <Pressable
              style={styles.tarikDulu}
              onPress={() => router.push("/dompet/tarik")}
              accessibilityRole="button"
              accessibilityLabel="Tarik saldo saya lebih dulu"
            >
              <Feather name="credit-card" size={16} color={colors.brand} />
              <Text style={styles.tarikDuluTeks}>
                Tarik saldo saya lebih dulu
              </Text>
              <Feather name="chevron-right" size={16} color={colors.brand} />
            </Pressable>
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Konfirmasi</Text>

            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan kata sandi Anda"
                placeholderTextColor="#9AA5B1"
                secureTextEntry={!tampak}
                autoComplete="current-password"
                accessibilityLabel="Kata sandi Anda"
              />
              <Pressable
                onPress={() => setTampak((v) => !v)}
                hitSlop={10}
                style={styles.mata}
                accessibilityRole="button"
                accessibilityLabel={
                  tampak ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
              >
                <Feather
                  name={tampak ? "eye-off" : "eye"}
                  size={18}
                  color={colors.subtext}
                />
              </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>
              Ketik {KATA_KONFIRMASI} untuk melanjutkan
            </Text>
            <TextInput
              style={styles.inputPolos}
              value={konfirmasi}
              onChangeText={setKonfirmasi}
              placeholder={KATA_KONFIRMASI}
              placeholderTextColor="#9AA5B1"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={`Ketik kata ${KATA_KONFIRMASI} untuk mengonfirmasi penghapusan akun`}
            />
          </View>

          {!!error && (
            <Text style={styles.galat} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable
            style={[styles.hapus, hapus.isPending && { opacity: 0.7 }]}
            onPress={submit}
            disabled={hapus.isPending}
            accessibilityRole="button"
            accessibilityLabel="Hapus akun saya secara permanen"
            accessibilityState={{ busy: hapus.isPending }}
          >
            {hapus.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.hapusTeks}>Hapus Akun Saya</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.batal}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Batalkan dan kembali"
          >
            <Text style={styles.batalTeks}>Batal, saya urung</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  peringatan: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 16,
  },
  peringatanIkon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  peringatanJudul: { fontSize: 15, fontWeight: "700", color: "#7F1D1D" },
  peringatanTeks: {
    fontSize: 13,
    color: "#7F1D1D",
    lineHeight: 19,
    marginTop: 4,
  },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  kartuJudul: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  baris: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  barisTeks: { flex: 1, fontSize: 13, color: colors.subtext, lineHeight: 19 },
  tarikDulu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    marginTop: 10,
  },
  tarikDuluTeks: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
  },
  label: { fontSize: 13, color: colors.subtext, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 14,
    paddingRight: 4,
    height: 50,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  inputPolos: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
    color: colors.text,
    fontSize: 15,
    letterSpacing: 2,
    fontWeight: "700",
  },
  mata: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  galat: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  hapus: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  hapusTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  batal: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  batalTeks: { color: colors.link, fontWeight: "700", fontSize: 14 },
});
