import { Button, Card, Field } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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

export default function Register() {
  const { register } = useAuth();
  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [tgl, setTgl] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [jk, setJk] = useState<"L" | "P" | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const submit = async () => {
    setError("");
    if (nik.length !== 16) return setError("NIK harus 16 digit.");
    if (!name.trim()) return setError("Nama lengkap wajib diisi.");
    if (!tgl) return setError("Tanggal lahir wajib diisi.");
    if (!jk) return setError("Jenis kelamin wajib dipilih.");
    if (!phone.trim()) return setError("Nomor handphone wajib diisi.");
    if (password.length < 8) return setError("Password minimal 8 karakter.");
    if (password !== konfirmasi)
      return setError("Konfirmasi password tidak cocok.");

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        nik,
        tanggal_lahir: fmt(tgl),
        jenis_kelamin: jk,
        phone: phone.trim(),
        password,
      });
      router.replace({
        pathname: "/verify-otp",
        params: { phone: res.data.phone, dev_kode: res.data.dev_kode ?? "" },
      });
    } catch (e: any) {
      const errs = e?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      setError(
        errs
          ? Object.values(errs)[0]?.[0]
          : (e?.response?.data?.message ?? "Registrasi gagal."),
      );
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
          >
            <Feather name="arrow-left" size={24} color={colors.white} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logo}>
              <Feather name="feather" size={26} color={colors.brand} />
            </View>
            <Text style={styles.brand}>Bergabung dengan Niti Resik</Text>
            <Text style={styles.tag}>Mulai perjalanan hijau Anda hari ini</Text>
          </View>

          <Card style={styles.card}>
            <Field
              label="NIK"
              required
              icon="credit-card"
              placeholder="16 digit NIK"
              keyboardType="number-pad"
              maxLength={16}
              value={nik}
              onChangeText={setNik}
            />
            <Field
              label="Nama Lengkap"
              required
              icon="user"
              placeholder="Masukkan nama lengkap"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>
              Tanggal Lahir <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <Pressable style={styles.dateBox} onPress={() => setShowDate(true)}>
              <Feather
                name="calendar"
                size={18}
                color={colors.subtext}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ color: tgl ? colors.text : "#9AA5B1", fontSize: 15 }}
              >
                {tgl ? fmt(tgl) : "Pilih tanggal"}
              </Text>
            </Pressable>
            {showDate && (
              <DateTimePicker
                value={tgl ?? new Date(2000, 0, 1)}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, d) => {
                  setShowDate(Platform.OS === "ios");
                  if (d) setTgl(d);
                }}
              />
            )}

            <Text style={[styles.label, { marginTop: spacing.md }]}>
              Jenis Kelamin <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <View style={styles.jkRow}>
              {(["L", "P"] as const).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setJk(v)}
                  style={[styles.jkBtn, jk === v && styles.jkActive]}
                >
                  <Text
                    style={[
                      styles.jkText,
                      jk === v && { color: colors.brand, fontWeight: "700" },
                    ]}
                  >
                    {v === "L" ? "Laki-laki" : "Perempuan"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ height: spacing.md }} />
            <Field
              label="Nomor Handphone"
              required
              icon="phone"
              placeholder="08xxxxxxxxxx"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Field
              label="Password"
              required
              icon="lock"
              placeholder="Minimal 8 karakter"
              secureTextEntry={!show}
              value={password}
              onChangeText={setPassword}
              rightIcon={show ? "eye-off" : "eye"}
              onRightPress={() => setShow(!show)}
            />
            <Field
              label="Konfirmasi Password"
              required
              icon="lock"
              placeholder="Ulangi password"
              secureTextEntry={!show}
              value={konfirmasi}
              onChangeText={setKonfirmasi}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Daftar Sekarang"
              onPress={submit}
              loading={loading}
              style={{ marginTop: 6 }}
            />

            <View style={styles.rowCenter}>
              <Text style={styles.muted}>Sudah punya akun? </Text>
              <Pressable onPress={() => router.replace("/login")}>
                <Text style={styles.link}>Masuk</Text>
              </Pressable>
            </View>
          </Card>

          <Text style={styles.terms}>
            Dengan mendaftar, Anda menyetujui Syarat & Ketentuan dan Kebijakan
            Privasi
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
  brand: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  tag: { color: colors.white70, fontSize: 13, marginTop: 4 },
  card: { marginHorizontal: spacing.lg, marginTop: 4 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  jkRow: { flexDirection: "row", gap: 12 },
  jkBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  jkActive: { borderColor: colors.brand, backgroundColor: "#EAF7F1" },
  jkText: { color: colors.text, fontSize: 14 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
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
});
