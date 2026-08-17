import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
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
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useGalatForm } from "@/hooks/useGalatForm";

export default function Login() {
  const { masuk } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const galat = useGalatForm();

  const submit = async () => {
    galat.bersihkan();

    // Validasi sisi klien pun ditempelkan ke fieldnya, bukan ditumpuk jadi satu
    // kalimat di atas tombol: pengguna melihat langsung baris mana yang kurang.
    if (!email.trim()) return galat.tandai("email", "Email wajib diisi.");
    if (!password) return galat.tandai("password", "Kata sandi wajib diisi.");

    setLoading(true);
    try {
      await masuk(email, password);
      router.replace("/");
    } catch (e) {
      // `401` di layar ini berarti kredensial salah, bukan sesi habis, peladen
      // sengaja tidak membedakan email tak terdaftar dari kata sandi keliru,
      // jadi pesannya memang tidak bisa menunjuk satu field.
      galat.tangani(e, "Gagal masuk. Periksa koneksi Anda lalu coba lagi.");
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
          {/*
            Selalu ke beranda, bukan `router.back()`.

            Layar ini dicapai lewat banyak jalan — tombol kunci di tab bar,
            pengalihan `401`, atau tautan dari layar mana pun — dan sebagiannya
            memakai `replace`, sehingga tidak ada riwayat untuk dimundurkan.
            Pada kasus itu `back()` tidak melakukan apa-apa dan tombolnya
            terlihat rusak; pada kasus `401` ia justru melempar pengguna kembali
            ke layar yang baru saja menolaknya.
          */}
          <Pressable
            style={styles.back}
            onPress={() => router.replace("/beranda" as Href)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke beranda"
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
            <Text style={styles.brand}>Resikita</Text>
            <Text style={styles.tag}>Bersama Wujudkan Bumi Bersih</Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.title}>Selamat Datang Kembali</Text>
            <Text style={styles.subtitle}>
              Masuk untuk melanjutkan perjalanan
            </Text>

            <PesanGalat pesan={galat.umum} />

            <Field
              label="Email"
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
              label="Kata Sandi"
              icon="lock"
              placeholder="Masukkan kata sandi"
              secureTextEntry={!show}
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              rightIcon={show ? "eye-off" : "eye"}
              onRightPress={() => setShow(!show)}
              error={galat.field.password}
              accessibilityLabel="Kata sandi"
            />

            <Pressable
              onPress={() => router.push("/lupa-password")}
              accessibilityRole="button"
              accessibilityLabel="Lupa kata sandi"
              style={styles.forgotWrap}
            >
              <Text style={styles.forgot}>Lupa Kata Sandi?</Text>
            </Pressable>

            <Button
              label="Masuk"
              onPress={submit}
              loading={loading}
              style={{ marginTop: 6 }}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>Atau</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.rowCenter}>
              <Text style={styles.muted}>Belum punya akun? </Text>
              <Pressable
                onPress={() => router.replace("/register")}
                accessibilityRole="button"
                accessibilityLabel="Daftar akun baru"
              >
                <Text style={styles.link}>Daftar Sekarang</Text>
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
  header: { alignItems: "center", marginTop: 10, marginBottom: 20 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#DFF5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: 46, height: 46 },
  brand: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
  },
  tag: { color: colors.white70, fontSize: 13, marginTop: 4 },
  card: { marginHorizontal: spacing.lg, marginTop: 8, marginBottom: 24 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  // Dibungkus Pressable dengan tinggi minimum supaya tautan ini memenuhi
  // target sentuh 44 piksel, bukan sekadar teks setinggi barisnya.
  forgotWrap: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
  },
  forgot: { color: colors.link, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: 10, color: colors.subtext, fontSize: 12 },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  muted: { color: colors.subtext },
  link: { color: colors.link, fontWeight: "700" },
});
