import { Button, Card } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { resendOtp } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyOtp() {
  const { verifyOtp } = useAuth();
  const params = useLocalSearchParams<{ phone: string; dev_kode?: string }>();
  const phone = String(params.phone ?? "");

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputs = useRef<(TextInput | null)[]>([]);
  const [counter, setCounter] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (counter <= 0) return;
    const t = setTimeout(() => setCounter((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [counter]);

  const setDigit = (i: number, v: string) => {
    const val = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0)
      inputs.current[i - 1]?.focus();
  };

  const kode = digits.join("");

  const submit = async () => {
    setError("");
    if (kode.length !== 6) return setError("Masukkan 6 digit kode.");
    setLoading(true);
    try {
      await verifyOtp(phone, kode);
      router.replace("/beranda");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Kode salah atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  };

  const kirimUlang = async () => {
    if (counter > 0) return;
    try {
      const res = await resendOtp(phone);
      setCounter(60);
      setError("");
      if (res?.data?.dev_kode) setError(`(dev) Kode: ${res.data.dev_kode}`);
    } catch {
      setError("Gagal mengirim ulang kode.");
    }
  };

  const mm = String(Math.floor(counter / 60)).padStart(2, "0");
  const ss = String(counter % 60).padStart(2, "0");

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
        <Feather name="arrow-left" size={24} color={colors.white} />
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.icon}>
          <Feather name="message-circle" size={30} color={colors.white} />
        </View>
        <Text style={styles.title}>Verifikasi WhatsApp</Text>
        <Text style={styles.sub}>Kode verifikasi telah dikirim ke</Text>
        <Text style={styles.phone}>{phone}</Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r;
              }}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.otpBox}
            />
          ))}
        </View>

        {!!params.dev_kode && (
          <Text style={styles.dev}>(dev) Kode: {params.dev_kode}</Text>
        )}

        <Pressable onPress={kirimUlang} disabled={counter > 0}>
          <Text style={styles.resend}>
            {counter > 0 ? (
              <>
                Kirim ulang kode dalam{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {mm}:{ss}
                </Text>
              </>
            ) : (
              "Kirim ulang kode"
            )}
          </Text>
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Verifikasi"
          icon="check"
          onPress={submit}
          loading={loading}
          disabled={kode.length !== 6}
          style={{ marginTop: 12 }}
        />

        <View style={styles.line} />
        <View style={styles.rowCenter}>
          <Text style={styles.muted}>Tidak menerima kode? </Text>
          <Text style={styles.link}>Hubungi Bantuan</Text>
        </View>
      </Card>

      <Text style={styles.note}>
        Kode OTP bersifat rahasia. Jangan bagikan kepada siapa pun.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: 20,
  },
  card: { marginHorizontal: spacing.lg, alignItems: "center" },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 14 },
  sub: { color: colors.subtext, marginTop: 6 },
  phone: { color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 },
  otpRow: { flexDirection: "row", gap: 8, marginTop: 22 },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: "center",
    fontSize: 22,
    color: colors.text,
  },
  dev: { color: colors.link, marginTop: 10, fontWeight: "600" },
  resend: { color: colors.subtext, marginTop: 18 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  line: {
    height: 1,
    backgroundColor: colors.border,
    alignSelf: "stretch",
    marginVertical: 18,
  },
  rowCenter: { flexDirection: "row", justifyContent: "center" },
  muted: { color: colors.subtext },
  link: { color: colors.text, fontWeight: "700" },
  note: {
    color: colors.white70,
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginHorizontal: 30,
  },
});
