import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateProfil } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const initials = (name: string) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function EditProfil() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [tgl, setTgl] = useState(user?.tanggal_lahir ?? "");
  const [jk, setJk] = useState<"L" | "P" | "">(
    (user?.jenis_kelamin as any) ?? "",
  );
  const [saving, setSaving] = useState(false);

  const simpan = async () => {
    if (!name.trim())
      return Alert.alert("Lengkapi", "Nama tidak boleh kosong.");
    if (tgl && !/^\d{4}-\d{2}-\d{2}$/.test(tgl))
      return Alert.alert(
        "Format Tanggal",
        "Gunakan format YYYY-MM-DD, mis. 1999-08-17.",
      );
    setSaving(true);
    try {
      await updateProfil({
        name: name.trim(),
        tanggal_lahir: tgl || null,
        jenis_kelamin: (jk || null) as any,
      });
      await refresh();
      Alert.alert("Tersimpan", "Profil berhasil diperbarui.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat menyimpan perubahan.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Edit Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(name || user?.name || "")}
            </Text>
          </View>
          <Text style={styles.avatarHint}>
            Foto profil memakai inisial nama
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Pribadi</Text>

          <Field label="Nama Lengkap" icon="user">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
              placeholderTextColor="#9AA5B1"
            />
          </Field>

          <Field label="Tanggal Lahir" icon="calendar">
            <TextInput
              style={styles.input}
              value={tgl ?? ""}
              onChangeText={setTgl}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9AA5B1"
              keyboardType="numbers-and-punctuation"
            />
          </Field>

          <Text style={styles.label}>Jenis Kelamin</Text>
          <View style={styles.jkRow}>
            {(["L", "P"] as const).map((v) => (
              <Pressable
                key={v}
                style={[styles.jkBtn, jk === v && styles.jkActive]}
                onPress={() => setJk(v)}
              >
                <Text
                  style={[styles.jkText, jk === v && { color: colors.white }]}
                >
                  {v === "L" ? "Laki-laki" : "Perempuan"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Read-only: dikelola sistem / dipakai untuk login & verifikasi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Akun</Text>
          <ReadOnly label="Email" value={user?.email || "-"} />
          <ReadOnly label="Nomor Telepon" value={user?.phone || "-"} />
          <ReadOnly label="NIK" value={user?.nik || "-"} />
          <ReadOnly label="ID Nasabah" value={user?.kode_qr || "-"} last />
          <Text style={styles.note}>
            Email, nomor telepon, dan NIK tidak dapat diubah sendiri. Hubungi
            admin bila perlu perubahan.
          </Text>
        </View>

        <Pressable
          style={[styles.save, saving && { opacity: 0.7 }]}
          onPress={simpan}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Simpan Perubahan</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.labelRow}>
        <Feather name={icon} size={14} color={colors.subtext} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}
function ReadOnly({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.roRow, !last && styles.roBorder]}>
      <Text style={styles.roLabel}>{label}</Text>
      <Text style={styles.roValue} numberOfLines={1}>
        {value}
      </Text>
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
  avatarWrap: { alignItems: "center", marginBottom: 18, gap: 8 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 30 },
  avatarHint: { color: colors.subtext, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: { fontSize: 13, color: colors.subtext, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    backgroundColor: colors.white,
  },
  jkRow: { flexDirection: "row", gap: 12 },
  jkBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  jkActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  jkText: { color: colors.text, fontWeight: "600" },
  roRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  roBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  roLabel: { color: colors.subtext, fontSize: 14 },
  roValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
  },
  note: { color: "#94A3B8", fontSize: 12, marginTop: 10, lineHeight: 17 },
  save: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
