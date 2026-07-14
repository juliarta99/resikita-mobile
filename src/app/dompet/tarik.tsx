import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { ajukanPenarikan, getSaldo } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const MIN = 50000;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const CHIPS = [50000, 100000, 150000, 200000];
const INFO = [
  "Minimal penarikan Rp 50.000",
  "Proses 1–2 hari kerja",
  "Gratis biaya admin",
  "Pastikan data rekening benar",
];

export default function Tarik() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const saldoQ = useQuery({ queryKey: ["saldo"], queryFn: getSaldo });
  const saldo = saldoQ.data ?? Number(user?.saldo ?? 0);

  const [jumlah, setJumlah] = useState("");
  const [namaBank, setNamaBank] = useState("");
  const [noRek, setNoRek] = useState("");
  const [atasNama, setAtasNama] = useState("");
  const [loading, setLoading] = useState(false);

  const angka = Number(jumlah.replace(/\D/g, "")) || 0;

  const submit = async () => {
    if (angka < MIN)
      return Alert.alert("Jumlah Kurang", `Minimal penarikan ${rp(MIN)}.`);
    if (angka > saldo)
      return Alert.alert("Saldo Kurang", "Jumlah melebihi saldo tersedia.");
    if (!namaBank.trim() || !noRek.trim() || !atasNama.trim())
      return Alert.alert("Lengkapi", "Isi data rekening dengan lengkap.");
    setLoading(true);
    try {
      await ajukanPenarikan({
        jumlah: angka,
        nama_bank: namaBank.trim(),
        no_rekening: noRek.trim(),
        atas_nama: atasNama.trim(),
      });
      qc.invalidateQueries({ queryKey: ["saldo"] });
      qc.invalidateQueries({ queryKey: ["penarikan"] });
      Alert.alert(
        "Berhasil",
        "Permintaan penarikan diajukan. Menunggu persetujuan admin.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/dompet/riwayat" as any),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat mengajukan penarikan.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Tarik Saldo</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <View style={styles.saldoCard}>
          <View style={styles.saldoTop}>
            <Text style={styles.saldoLabel}>Saldo Tersedia</Text>
            <Feather name="credit-card" size={20} color={colors.white} />
          </View>
          <Text style={styles.saldoValue}>{rp(saldo)}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoHead}>
            <Feather name="info" size={18} color="#2563EB" />
            <Text style={styles.infoTitle}>Informasi Penting</Text>
          </View>
          {INFO.map((t, i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={styles.infoNum}>{i + 1}.</Text>
              <Text style={styles.infoText}>{t}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>
          Jumlah Penarikan <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <View style={styles.amountWrap}>
          <Text style={styles.rpPrefix}>Rp</Text>
          <TextInput
            style={styles.amount}
            value={angka ? angka.toLocaleString("id-ID") : ""}
            onChangeText={(t) => setJumlah(t)}
            placeholder="0"
            placeholderTextColor="#9AA5B1"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable
              key={c}
              style={styles.chip}
              onPress={() => setJumlah(String(c))}
            >
              <Text style={styles.chipText}>{c / 1000}K</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Rekening Tujuan</Text>
          <Field label="Nama Bank" icon="home">
            <TextInput
              style={styles.input}
              value={namaBank}
              onChangeText={setNamaBank}
              placeholder="mis. BCA / BRI / Mandiri"
              placeholderTextColor="#9AA5B1"
            />
          </Field>
          <Field label="Nomor Rekening" icon="credit-card">
            <TextInput
              style={styles.input}
              value={noRek}
              onChangeText={setNoRek}
              placeholder="Masukkan nomor rekening"
              placeholderTextColor="#9AA5B1"
              keyboardType="number-pad"
            />
          </Field>
          <Field label="Atas Nama" icon="user">
            <TextInput
              style={styles.input}
              value={atasNama}
              onChangeText={setAtasNama}
              placeholder="Nama pemilik rekening"
              placeholderTextColor="#9AA5B1"
            />
          </Field>
        </View>

        <Pressable
          style={[styles.submit, loading && { opacity: 0.7 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Ajukan Penarikan</Text>
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
      <Text style={styles.label}>
        {label} <Text style={{ color: colors.danger }}>*</Text>
      </Text>
      <View style={styles.inputRow}>
        <Feather name={icon} size={16} color={colors.subtext} />
        {children}
      </View>
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
  saldoCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  saldoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saldoLabel: { color: colors.white70, fontSize: 13 },
  saldoValue: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  info: {
    backgroundColor: "#EFF4FF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 16,
  },
  infoHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  infoTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  infoNum: { color: "#2563EB", fontWeight: "700", fontSize: 13 },
  infoText: { flex: 1, color: "#334155", fontSize: 13, lineHeight: 18 },
  label: {
    fontSize: 14,
    color: colors.text,
    marginTop: 18,
    marginBottom: 8,
    fontWeight: "600",
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 56,
  },
  rpPrefix: { color: colors.subtext, fontSize: 18, marginRight: 8 },
  amount: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.text },
  chips: { flexDirection: "row", gap: 10, marginTop: 12 },
  chip: {
    flex: 1,
    backgroundColor: "#B7E4CE",
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  chipText: { color: colors.brand, fontWeight: "700" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: colors.white,
  },
  input: { flex: 1, color: colors.text, height: "100%" },
  submit: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  submitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
