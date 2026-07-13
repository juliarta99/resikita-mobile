import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";
import { updatePassword } from "@/lib/api";

export default function UbahPassword() {
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [konf, setKonf] = useState("");
  const [show, setShow] = useState({ lama: false, baru: false, konf: false });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!lama || !baru || !konf) return Alert.alert("Lengkapi", "Semua kolom wajib diisi.");
    if (baru.length < 8) return Alert.alert("Terlalu Pendek", "Password baru minimal 8 karakter.");
    if (baru !== konf) return Alert.alert("Tidak Cocok", "Konfirmasi password tidak sama.");
    setSaving(true);
    try {
      await updatePassword({ password_lama: lama, password: baru, password_confirmation: konf });
      Alert.alert("Berhasil", "Kata sandi berhasil diperbarui.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Gagal", e?.response?.data?.message ?? "Tidak dapat mengubah password.");
    } finally {
      setSaving(false);
    }
  };

  const Input = (p: { label: string; value: string; on: (t: string) => void; k: "lama" | "baru" | "konf"; ph: string }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{p.label}</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={p.value} onChangeText={p.on} placeholder={p.ph} placeholderTextColor="#9AA5B1" secureTextEntry={!show[p.k]} />
        <Pressable onPress={() => setShow((s) => ({ ...s, [p.k]: !s[p.k] }))} hitSlop={8}><Feather name={show[p.k] ? "eye-off" : "eye"} size={18} color={colors.subtext} /></Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.appbarTitle}>Ubah Password</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <View style={styles.info}>
          <View style={styles.infoIcon}><Feather name="lock" size={20} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Keamanan Akun</Text>
            <Text style={styles.infoDesc}>Gunakan password kuat: kombinasi huruf besar, huruf kecil, dan angka, minimal 8 karakter.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Input label="Password Saat Ini" value={lama} on={setLama} k="lama" ph="Masukkan password saat ini" />
          <Input label="Password Baru" value={baru} on={setBaru} k="baru" ph="Masukkan password baru" />
          <Input label="Konfirmasi Password Baru" value={konf} on={setKonf} k="konf" ph="Ulangi password baru" />
        </View>

        <Pressable style={[styles.save, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Ubah Password</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14 },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  info: { flexDirection: "row", gap: 12, backgroundColor: "#E4F3EC", borderRadius: radius.lg, padding: spacing.lg, marginBottom: 16 },
  infoIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  infoTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  infoDesc: { color: colors.subtext, fontSize: 13, marginTop: 4, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: 16 },
  label: { fontSize: 13, color: colors.text, marginBottom: 6, fontWeight: "500" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, color: colors.text },
  save: { backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saveText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
