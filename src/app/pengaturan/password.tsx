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
import { ubahPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/error";
import { notify } from "@/lib/dialog";

const PANJANG_MINIMUM = 8;

export default function UbahPassword() {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [tampak, setTampak] = useState({
    lama: false,
    baru: false,
    konfirmasi: false,
  });
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<Record<string, string>>({});

  const simpan = useMutation({
    mutationFn: () =>
      ubahPassword({
        password_lama: lama,
        password: baru,
        password_confirmation: konfirmasi,
      }),
    onSuccess: () => {
      notify("Berhasil", "Kata sandi Anda sudah diperbarui.");
      router.back();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setErrorField({
          password_lama: e.pesanField("password_lama") ?? "",
          password: e.pesanField("password") ?? "",
        });
        setError(e.errors ? "" : e.pesanUntukPengguna);
      } else {
        setError("Kata sandi tidak dapat diubah.");
      }
    },
  });

  const submit = () => {
    setError("");
    setErrorField({});
    if (!lama || !baru || !konfirmasi)
      return setError("Semua kolom wajib diisi.");
    if (baru.length < PANJANG_MINIMUM)
      return setError(`Kata sandi baru minimal ${PANJANG_MINIMUM} karakter.`);
    if (baru !== konfirmasi)
      return setError("Konfirmasi kata sandi tidak sama.");
    if (baru === lama)
      return setError("Kata sandi baru harus berbeda dari yang lama.");
    simpan.mutate();
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
        <Text style={styles.appbarTitle}>Ubah Kata Sandi</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.info}>
            <View style={styles.infoIkon}>
              <Feather name="lock" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoJudul}>Keamanan Akun</Text>
              <Text style={styles.infoTeks}>
                Gunakan kata sandi yang kuat: gabungan huruf besar, huruf kecil,
                dan angka, minimal {PANJANG_MINIMUM} karakter.
              </Text>
            </View>
          </View>

          <View style={styles.kartu}>
            {/*
              `Isian` didefinisikan di luar komponen ini dengan sengaja.
              Versi sebelumnya mendefinisikannya di dalam badan komponen,
              sehingga setiap render menghasilkan tipe komponen baru — React
              melepas lalu memasang ulang TextInput-nya, dan fokus keyboard
              hilang setiap satu huruf diketik.
            */}
            <Isian
              label="Kata Sandi Saat Ini"
              nilai={lama}
              onUbah={setLama}
              placeholder="Masukkan kata sandi saat ini"
              tampak={tampak.lama}
              onToggle={() => setTampak((s) => ({ ...s, lama: !s.lama }))}
              error={errorField.password_lama}
              autoComplete="current-password"
            />
            <Isian
              label="Kata Sandi Baru"
              nilai={baru}
              onUbah={setBaru}
              placeholder={`Minimal ${PANJANG_MINIMUM} karakter`}
              tampak={tampak.baru}
              onToggle={() => setTampak((s) => ({ ...s, baru: !s.baru }))}
              error={errorField.password}
              autoComplete="new-password"
            />
            <Isian
              label="Konfirmasi Kata Sandi Baru"
              nilai={konfirmasi}
              onUbah={setKonfirmasi}
              placeholder="Ulangi kata sandi baru"
              tampak={tampak.konfirmasi}
              onToggle={() =>
                setTampak((s) => ({ ...s, konfirmasi: !s.konfirmasi }))
              }
              autoComplete="new-password"
            />
          </View>

          {!!error && (
            <Text style={styles.galat} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable
            style={[styles.simpan, simpan.isPending && { opacity: 0.7 }]}
            onPress={submit}
            disabled={simpan.isPending}
            accessibilityRole="button"
            accessibilityLabel="Simpan kata sandi baru"
            accessibilityState={{ busy: simpan.isPending }}
          >
            {simpan.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.simpanTeks}>Ubah Kata Sandi</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Isian({
  label,
  nilai,
  onUbah,
  placeholder,
  tampak,
  onToggle,
  error,
  autoComplete,
}: {
  label: string;
  nilai: string;
  onUbah: (v: string) => void;
  placeholder: string;
  tampak: boolean;
  onToggle: () => void;
  error?: string;
  autoComplete?: "current-password" | "new-password";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.inputWrap, !!error && { borderColor: colors.danger }]}
      >
        <TextInput
          style={styles.input}
          value={nilai}
          onChangeText={onUbah}
          placeholder={placeholder}
          placeholderTextColor="#9AA5B1"
          secureTextEntry={!tampak}
          autoComplete={autoComplete}
          accessibilityLabel={label}
        />
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          style={styles.mata}
          accessibilityRole="button"
          accessibilityLabel={
            tampak ? `Sembunyikan ${label}` : `Tampilkan ${label}`
          }
        >
          <Feather
            name={tampak ? "eye-off" : "eye"}
            size={18}
            color={colors.subtext}
          />
        </Pressable>
      </View>
      {!!error && <Text style={styles.galatField}>{error}</Text>}
    </View>
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
  info: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#E4F3EC",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 16,
  },
  infoIkon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  infoJudul: { fontSize: 14, fontWeight: "700", color: colors.text },
  infoTeks: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
    marginTop: 3,
  },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
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
  mata: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  galatField: { color: colors.danger, fontSize: 12, marginTop: 4 },
  galat: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  simpan: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  simpanTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
