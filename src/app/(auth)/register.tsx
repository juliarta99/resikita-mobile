import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
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
import { WilayahPicker } from "@/components/WilayahPicker";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useGalatForm } from "@/hooks/useGalatForm";
import { useWilayah } from "@/hooks/useWilayah";

const PANJANG_SANDI_MINIMUM = 8;

/**
 * Nama field peladen yang di layar ini punya nama berbeda.
 *
 * Peladen melaporkan ketidakcocokan konfirmasi pada field `password`, sementara
 * yang salah ketik hampir selalu barisnya konfirmasi. Tanpa pemetaan ini pesan
 * "Konfirmasi kata sandi tidak cocok" menempel di baris kata sandi — persis
 * baris yang sebenarnya sudah benar.
 */
const PETA_FIELD = { password_confirmation: "konfirmasi" };

export default function Register() {
  const { daftar } = useAuth();
  const wilayah = useWilayah();
  const galat = useGalatForm();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [show, setShow] = useState(false);
  const [isiWilayah, setIsiWilayah] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    galat.bersihkan();

    if (!name.trim()) return galat.tandai("name", "Nama lengkap wajib diisi.");
    if (!email.trim()) return galat.tandai("email", "Email wajib diisi.");
    if (password.length < PANJANG_SANDI_MINIMUM)
      return galat.tandai(
        "password",
        `Kata sandi minimal ${PANJANG_SANDI_MINIMUM} karakter.`,
      );
    if (password !== konfirmasi)
      return galat.tandai("konfirmasi", "Konfirmasi kata sandi tidak cocok.");

    setLoading(true);
    try {
      await daftar({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: konfirmasi,
        // Keduanya opsional di kontrak. Mengirim string kosong berbeda dari
        // tidak mengirim sama sekali — peladen akan memvalidasi nilai kosong
        // itu dan menolaknya.
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(wilayah.wilayahId ? { wilayah_id: wilayah.wilayahId } : {}),
      });
      router.replace("/verify-otp");
    } catch (e) {
      const terpasang = galat.tangani(
        e,
        "Pendaftaran gagal. Periksa koneksi Anda lalu coba lagi.",
        PETA_FIELD,
      );
      // Galat wilayah tidak akan terlihat selama bagian yang melipatnya tertutup.
      if (terpasang.wilayah_id) setIsiWilayah(true);
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
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logo}>
              <Image
                source={require("@/assets/images/logo-primary.png")}
                style={styles.logoImg}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text style={styles.brand}>Bergabung dengan Resikita</Text>
            <Text style={styles.tag}>Mulai perjalanan hijau Anda hari ini</Text>
          </View>

          <Card style={styles.card}>
            <PesanGalat pesan={galat.umum} />

            <Field
              label="Nama Lengkap"
              required
              icon="user"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              error={galat.field.name}
              accessibilityLabel="Nama lengkap"
            />
            <Field
              label="Email"
              required
              icon="mail"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              error={galat.field.email}
              accessibilityLabel="Alamat email"
            />
            <Field
              label="Nomor WhatsApp"
              icon="phone"
              placeholder="08xxxxxxxxxx (opsional)"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              error={galat.field.phone}
              hint="Hanya dipakai untuk mengirim notifikasi. Boleh dikosongkan."
              accessibilityLabel="Nomor WhatsApp, opsional"
            />

            <Field
              label="Kata Sandi"
              required
              icon="lock"
              placeholder={`Minimal ${PANJANG_SANDI_MINIMUM} karakter`}
              secureTextEntry={!show}
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              rightIcon={show ? "eye-off" : "eye"}
              onRightPress={() => setShow(!show)}
              error={galat.field.password}
              accessibilityLabel="Kata sandi"
            />
            <Field
              label="Konfirmasi Kata Sandi"
              required
              icon="lock"
              placeholder="Ulangi kata sandi"
              secureTextEntry={!show}
              autoComplete="new-password"
              value={konfirmasi}
              onChangeText={setKonfirmasi}
              error={galat.field.konfirmasi}
              accessibilityLabel="Konfirmasi kata sandi"
            />

            {/*
              Wilayah opsional dan terlipat secara bawaan. Ia menajamkan jawaban
              chatbot dan menentukan fasilitas mana yang ditampilkan, tapi
              menjadikannya syarat berarti empat pilihan lagi sebelum seseorang
              bisa memakai aplikasinya sama sekali.
            */}
            <Pressable
              style={styles.wilayahToggle}
              onPress={() => setIsiWilayah((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Isi domisili sekarang"
              accessibilityState={{ expanded: isiWilayah }}
            >
              <Feather name="map-pin" size={16} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.wilayahJudul}>Domisili (opsional)</Text>
                <Text style={styles.wilayahSub}>
                  Membantu kami menampilkan fasilitas terdekat. Bisa diisi nanti
                  di profil.
                </Text>
              </View>
              <Feather
                name={isiWilayah ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.subtext}
              />
            </Pressable>

            {isiWilayah && (
              <View style={{ marginTop: spacing.md }}>
                <WilayahPicker
                  wilayah={wilayah}
                  error={galat.field.wilayah_id}
                />
              </View>
            )}

            <Button
              label="Daftar Sekarang"
              onPress={submit}
              loading={loading}
              style={{ marginTop: 6 }}
            />

            <View style={styles.rowCenter}>
              <Text style={styles.muted}>Sudah punya akun? </Text>
              <Pressable
                onPress={() => router.replace("/login")}
                accessibilityRole="button"
                accessibilityLabel="Masuk ke akun yang sudah ada"
              >
                <Text style={styles.link}>Masuk</Text>
              </Pressable>
            </View>
          </Card>

          <Text style={styles.terms}>
            Dengan mendaftar, Anda menyetujui{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/syarat")}
            >
              Syarat & Ketentuan
            </Text>{" "}
            dan{" "}
            <Text
              style={styles.termsLink}
              onPress={() => router.push("/privasi")}
            >
              Kebijakan Privasi
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { alignItems: "center", marginTop: 8, marginBottom: 16 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#DFF5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: 46, height: 46 },
  brand: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  tag: { color: colors.white70, fontSize: 13, marginTop: 4 },
  card: { marginHorizontal: spacing.lg, marginTop: 4 },
  wilayahToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC",
    marginBottom: spacing.sm,
  },
  wilayahJudul: { fontSize: 14, fontWeight: "600", color: colors.text },
  wilayahSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    lineHeight: 17,
  },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  muted: { color: colors.subtext },
  link: { color: colors.link, fontWeight: "700" },
  terms: {
    color: colors.white70,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
    marginHorizontal: 40,
    lineHeight: 16,
  },
  termsLink: {
    color: colors.white,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
