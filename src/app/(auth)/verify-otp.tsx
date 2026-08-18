import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, PesanGalat } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useGalatForm } from "@/hooks/useGalatForm";
import { kirimKodeVerifikasi, verifikasiKode } from "@/lib/api/auth";
import type { KanalVerifikasi } from "@/types/auth";

const PANJANG_KODE = 6;
const JEDA_KIRIM_ULANG_DETIK = 60;

export default function VerifyOtp() {
  const { user, refresh } = useAuth();
  const params = useLocalSearchParams<{ kanal?: string }>();
  // Email dan WhatsApp punya sepasang endpoint sendiri-sendiri; tidak ada
  // endpoint OTP generik dengan field `tujuan`.
  const kanal: KanalVerifikasi = params.kanal === "phone" ? "phone" : "email";

  const alamat = kanal === "phone" ? (user?.phone ?? "") : (user?.email ?? "");

  const [terkirim, setTerkirim] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(PANJANG_KODE).fill(""));
  const inputs = useRef<(TextInput | null)[]>([]);
  const [counter, setCounter] = useState(0);
  const [mengirim, setMengirim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const galat = useGalatForm();

  useEffect(() => {
    if (counter <= 0) return;
    const t = setTimeout(() => setCounter((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [counter]);

  const kode = digits.join("");

  /**
   * Kode dikirim atas perintah pengguna, bukan otomatis saat layar terbuka.
   *
   * `POST /auth/daftar` **sudah** mengirim kode ke email begitu akun dibuat.
   * Kalau layar ini ikut mengirim satu lagi saat dibuka, kode pertama mendadak
   * tidak berlaku, dan pengguna yang sudah membuka emailnya mengetik kode yang
   * baru saja dibatalkan. Tombol di bawah untuk yang kodenya memang tidak
   * sampai, dan batasnya 6 permintaan per menit karena tiap panggilan mengirim
   * pesan sungguhan.
   */
  const kirim = async () => {
    galat.bersihkan();
    setInfo("");
    setMengirim(true);
    try {
      await kirimKodeVerifikasi(kanal);
      setTerkirim(true);
      setCounter(JEDA_KIRIM_ULANG_DETIK);
      setInfo(`Kode dikirim ke ${alamat}.`);
    } catch (e) {
      galat.tangani(e, "Gagal mengirim kode. Coba lagi.");
    } finally {
      setMengirim(false);
    }
  };

  const setDigit = (i: number, v: string) => {
    const angka = v.replace(/\D/g, "");
    if (!angka) {
      const kosong = [...digits];
      kosong[i] = "";
      setDigits(kosong);
      return;
    }
    // Tempel kode utuh dari aplikasi email menyebar ke seluruh kotak, bukan
    // menumpuk di kotak pertama.
    const berikutnya = [...digits];
    for (let n = 0; n < angka.length && i + n < PANJANG_KODE; n++) {
      berikutnya[i + n] = angka[n];
    }
    setDigits(berikutnya);
    const tujuanFokus = Math.min(i + angka.length, PANJANG_KODE - 1);
    inputs.current[tujuanFokus]?.focus();
  };

  const onKey = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0)
      inputs.current[i - 1]?.focus();
  };

  const submit = async () => {
    galat.bersihkan();
    if (kode.length !== PANJANG_KODE)
      return galat.tandai("kode", `Masukkan ${PANJANG_KODE} digit kode.`);
    setLoading(true);
    try {
      await verifikasiKode(kanal, kode);
      // Respons verifikasi bermuatan `null`; status terverifikasi diambil dari
      // profil yang dimuat ulang.
      await refresh();
      router.replace("/");
    } catch (e) {
      galat.tangani(e, "Kode salah atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  };

  const mm = String(Math.floor(counter / 60)).padStart(2, "0");
  const ss = String(counter % 60).padStart(2, "0");

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Feather name="arrow-left" size={24} color={colors.white} />
      </Pressable>

      <Card style={styles.card}>
        <PesanGalat pesan={galat.umum} style={{ alignSelf: "stretch" }} />

        <View style={styles.icon}>
          <Feather
            name={kanal === "phone" ? "message-circle" : "mail"}
            size={30}
            color={colors.white}
          />
        </View>
        <Text style={styles.title}>
          {kanal === "phone" ? "Verifikasi WhatsApp" : "Verifikasi Email"}
        </Text>
        <Text style={styles.sub}>
          {terkirim
            ? "Masukkan kode yang kami kirim ke"
            : `Kami akan mengirim kode ${PANJANG_KODE} digit ke`}
        </Text>
        <Text style={styles.alamat}>{alamat || "akun Anda"}</Text>

        {!terkirim ? (
          <Button
            label="Kirim Kode"
            icon="send"
            onPress={kirim}
            loading={mengirim}
            style={{ marginTop: 22, alignSelf: "stretch" }}
          />
        ) : (
          <>
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
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={PANJANG_KODE}
                  style={[styles.otpBox, !!galat.field.kode && styles.otpGalat]}
                  accessibilityLabel={`Digit ke-${i + 1} dari ${PANJANG_KODE}`}
                />
              ))}
            </View>
            {!!galat.field.kode && (
              <Text
                style={styles.galatKode}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {galat.field.kode}
              </Text>
            )}

            <Pressable
              onPress={kirim}
              disabled={counter > 0 || mengirim}
              style={styles.kirimUlangWrap}
              accessibilityRole="button"
              accessibilityLabel="Kirim ulang kode"
              accessibilityState={{ disabled: counter > 0 }}
            >
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

            <Button
              label="Verifikasi"
              icon="check"
              onPress={submit}
              loading={loading}
              disabled={kode.length !== PANJANG_KODE}
              style={{ marginTop: 12, alignSelf: "stretch" }}
            />
          </>
        )}

        {!!info && (
          <Text style={styles.info} accessibilityLiveRegion="polite">
            {info}
          </Text>
        )}

        <View style={styles.line} />
        {/*
          Akun sudah aktif dan tokennya sudah dipegang sejak pendaftaran, jadi
          verifikasi bukan gerbang masuk. Menahan pengguna di layar ini akan
          menjebak siapa pun yang salah ketik emailnya.
        */}
        <Pressable
          onPress={() => router.replace("/")}
          style={styles.nantiWrap}
          accessibilityRole="button"
          accessibilityLabel="Lewati verifikasi untuk sekarang"
        >
          <Text style={styles.link}>Nanti Saja</Text>
        </Pressable>
      </Card>

      <Text style={styles.note}>
        Kode verifikasi bersifat rahasia. Jangan bagikan kepada siapa pun.
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
  sub: { color: colors.subtext, marginTop: 6, textAlign: "center" },
  alamat: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 2,
    textAlign: "center",
  },
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
  kirimUlangWrap: { minHeight: 44, justifyContent: "center", marginTop: 12 },
  resend: { color: colors.subtext },
  otpGalat: { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
  galatKode: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 17,
  },
  info: {
    color: colors.link,
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  line: {
    height: 1,
    backgroundColor: colors.border,
    alignSelf: "stretch",
    marginVertical: 18,
  },
  nantiWrap: { minHeight: 44, justifyContent: "center" },
  link: { color: colors.link, fontWeight: "700" },
  note: {
    color: colors.white70,
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginHorizontal: 30,
  },
});
