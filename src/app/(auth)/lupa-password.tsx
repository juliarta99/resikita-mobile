import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Field, PesanGalat } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useGalatForm } from "@/hooks/useGalatForm";
import { lupaPassword, resetPassword } from "@/lib/api/auth";
import { notify } from "@/lib/dialog";

const PANJANG_SANDI_MINIMUM = 8;
const PETA_FIELD = { password_confirmation: "konfirmasi" };

type Langkah = "email" | "reset";

export default function LupaPassword() {
  const [langkah, setLangkah] = useState<Langkah>("email");
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const galat = useGalatForm();

  const kirimKode = async () => {
    galat.bersihkan();
    if (!email.trim()) return galat.tandai("email", "Email wajib diisi.");
    setLoading(true);
    try {
      await lupaPassword(email.trim());
      // Peladen sengaja menjawab 200 juga untuk email yang tidak terdaftar,
      // jadi tidak ada yang bisa dipastikan di sini selain melanjutkan.
      setLangkah("reset");
    } catch (e) {
      galat.tangani(e, "Gagal mengirim kode. Periksa koneksi Anda lalu ulangi.");
    } finally {
      setLoading(false);
    }
  };

  const simpanSandiBaru = async () => {
    galat.bersihkan();
    if (!kode.trim())
      return galat.tandai("kode", "Kode dari email wajib diisi.");
    if (password.length < PANJANG_SANDI_MINIMUM)
      return galat.tandai(
        "password",
        `Kata sandi minimal ${PANJANG_SANDI_MINIMUM} karakter.`,
      );
    if (password !== konfirmasi)
      return galat.tandai("konfirmasi", "Konfirmasi kata sandi tidak cocok.");

    setLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        kode: kode.trim(),
        password,
        password_confirmation: konfirmasi,
      });
      notify(
        "Kata sandi diperbarui",
        "Silakan masuk dengan kata sandi baru Anda.",
      );
      router.replace("/login");
    } catch (e) {
      galat.tangani(e, "Gagal mengatur ulang kata sandi.", PETA_FIELD);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.back}
            onPress={() =>
              // Dari langkah kedua, kembali berarti membetulkan emailnya —
              // bukan meninggalkan layar dan kehilangan kode yang sudah dikirim.
              langkah === "reset" ? setLangkah("email") : router.back()
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.icon}>
              <Feather name="key" size={28} color={colors.white} />
            </View>
            <Text style={styles.judul}>Lupa Kata Sandi</Text>
            <Text style={styles.tag}>
              {langkah === "email"
                ? "Kami akan mengirim kode ke email Anda"
                : "Masukkan kode dari email dan kata sandi baru"}
            </Text>
          </View>

          <Card style={styles.card}>
            <PesanGalat pesan={galat.umum} />

            {langkah === "email" ? (
              <>
                <Field
                  label="Email"
                  required
                  icon="mail"
                  placeholder="nama@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={galat.field.email}
                  accessibilityLabel="Alamat email akun Anda"
                />
                <Button
                  label="Kirim Kode"
                  icon="send"
                  onPress={kirimKode}
                  loading={loading}
                />
              </>
            ) : (
              <>
                <Text style={styles.terkirim}>
                  Kode dikirim ke <Text style={styles.tebal}>{email}</Text>
                </Text>
                <Field
                  label="Kode Verifikasi"
                  required
                  icon="hash"
                  placeholder="Masukkan kode dari email"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  value={kode}
                  onChangeText={setKode}
                  error={galat.field.kode}
                  accessibilityLabel="Kode verifikasi dari email"
                />
                <Field
                  label="Kata Sandi Baru"
                  required
                  icon="lock"
                  placeholder={`Minimal ${PANJANG_SANDI_MINIMUM} karakter`}
                  secureTextEntry={!show}
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  rightIcon={show ? "eye-off" : "eye"}
                  onRightPress={() => setShow(!show)}
                  error={galat.field.password}
                  accessibilityLabel="Kata sandi baru"
                />
                <Field
                  label="Konfirmasi Kata Sandi"
                  required
                  icon="lock"
                  placeholder="Ulangi kata sandi baru"
                  secureTextEntry={!show}
                  value={konfirmasi}
                  onChangeText={setKonfirmasi}
                  error={galat.field.konfirmasi}
                  accessibilityLabel="Konfirmasi kata sandi baru"
                />
                <Button
                  label="Simpan Kata Sandi"
                  onPress={simpanSandiBaru}
                  loading={loading}
                />
              </>
            )}

            <View style={styles.rowCenter}>
              <Text style={styles.muted}>Ingat kata sandi Anda? </Text>
              <Pressable
                onPress={() => router.replace("/login")}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke halaman masuk"
              >
                <Text style={styles.link}>Masuk</Text>
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { alignItems: "center", marginTop: 12, marginBottom: 20 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  judul: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
  },
  tag: {
    color: colors.white70,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    marginHorizontal: spacing.xl,
  },
  card: { marginHorizontal: spacing.lg, marginBottom: 24 },
  terkirim: {
    color: colors.subtext,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  tebal: { fontWeight: "700", color: colors.text },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  muted: { color: colors.subtext },
  link: { color: colors.link, fontWeight: "700" },
});
