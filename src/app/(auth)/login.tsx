import { Button, Card, Field } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
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

export default function Login() {
  const { login } = useAuth();
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (nik.length < 3 || !password) {
      setError("NIK dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await login(nik.trim(), password);
      router.replace("/beranda");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Gagal masuk. Coba lagi.");
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
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logo}>
              <Feather name="feather" size={30} color={colors.brand} />
            </View>
            <Text style={styles.brand}>Niti Resik</Text>
            <Text style={styles.tag}>Ekonomi Sirkular untuk Bumi Bersih</Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.title}>Selamat Datang Kembali</Text>
            <Text style={styles.subtitle}>
              Masuk untuk melanjutkan perjalanan hijau Anda
            </Text>

            <Field
              label="Nomor Induk Kependudukan (NIK)"
              icon="credit-card"
              placeholder="Masukkan 16 digit NIK"
              keyboardType="number-pad"
              value={nik}
              onChangeText={setNik}
              maxLength={16}
            />
            <Field
              label="Password"
              icon="lock"
              placeholder="Masukkan password"
              secureTextEntry={!show}
              value={password}
              onChangeText={setPassword}
              rightIcon={show ? "eye-off" : "eye"}
              onRightPress={() => setShow(!show)}
            />

            <Text style={styles.forgot}>Lupa Password?</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Masuk"
              onPress={submit}
              loading={loading}
              disabled={!nik || !password}
              style={{ marginTop: 6 }}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>Atau</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.rowCenter}>
              <Text style={styles.muted}>Belum punya akun? </Text>
              <Pressable onPress={() => router.replace("/register")}>
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
  forgot: {
    color: colors.link,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
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
