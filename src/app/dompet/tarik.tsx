import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
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

import { PesanGalat } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useGalatForm } from "@/hooks/useGalatForm";
import { ajukanPenarikan, saldoDompet } from "@/lib/api/dompet";
import { notify } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";

/**
 * Nominal cepat, saran tampilan, bukan aturan.
 *
 * Batas minimum penarikan **tidak** ditetapkan di sini. Versi sebelumnya
 * menanam `MIN = 50000` dan menolak permintaan sebelum sampai ke peladen; kalau
 * kebijakan berubah, klien diam-diam tidak sepakat dengan peladen dan pengguna
 * ditolak oleh aturan yang sudah tidak berlaku. Angka minimumnya kini datang
 * dari respons saldo (`penarikan_minimum`) dan hanya dipakai untuk menjelaskan,
 * bukan untuk menolak.
 */
const NOMINAL_CEPAT = [50_000, 100_000, 150_000, 200_000];

export default function Tarik() {
  const qc = useQueryClient();
  const saldoQ = useQuery({
    queryKey: ["dompet", "saldo"],
    queryFn: saldoDompet,
  });
  const saldo = saldoQ.data?.saldo ?? 0;
  const minimum = saldoQ.data?.penarikan_minimum ?? null;

  const [jumlah, setJumlah] = useState("");
  const [namaBank, setNamaBank] = useState("");
  const [noRek, setNoRek] = useState("");
  const [atasNama, setAtasNama] = useState("");
  const galat = useGalatForm();

  const angka = Number(jumlah.replace(/\D/g, "")) || 0;
  const melebihiSaldo = angka > saldo;

  const ajukan = useMutation({
    mutationFn: () =>
      ajukanPenarikan({
        jumlah: angka,
        // Nama bank opsional di kontrak; string kosong justru akan divalidasi.
        ...(namaBank.trim() ? { nama_bank: namaBank.trim() } : {}),
        no_rekening: noRek.trim(),
        atas_nama: atasNama.trim(),
      }),
    onSuccess: async () => {
      // Saldo sudah dipotong saat pengajuan dibuat, bukan saat disetujui.
      await qc.invalidateQueries({ queryKey: ["dompet"] });
      notify(
        "Permintaan diajukan",
        "Saldo Anda sudah dipotong dan akan dikembalikan bila pengajuan ditolak.",
      );
      router.replace("/dompet/penarikan" as Href);
    },
    onError: (e: unknown) =>
      galat.tangani(e, "Tidak dapat mengajukan penarikan. Coba lagi."),
  });

  const submit = () => {
    galat.bersihkan();
    if (angka <= 0)
      return galat.tandai("jumlah", "Isi jumlah yang ingin ditarik.");
    // Satu-satunya pemeriksaan nominal di klien: saldo yang tersedia sudah
    // diketahui pasti dari `/dompet/saldo`, jadi menahan di sini menghemat satu
    // perjalanan bolak-balik tanpa menduplikasi kebijakan apa pun. Batas
    // minimum dan maksimum tetap urusan peladen.
    if (melebihiSaldo)
      return galat.tandai(
        "jumlah",
        `Jumlah melebihi saldo Anda (${formatRupiah(saldo)}).`,
      );
    if (!noRek.trim())
      return galat.tandai("no_rekening", "Nomor rekening wajib diisi.");
    if (!atasNama.trim())
      return galat.tandai("atas_nama", "Nama pemilik rekening wajib diisi.");
    ajukan.mutate();
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
        <Text style={styles.appbarTitle}>Tarik Saldo</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.saldoCard}>
            <View style={styles.saldoTop}>
              <Text style={styles.saldoLabel}>Saldo Tersedia</Text>
              <Feather name="credit-card" size={20} color={colors.white} />
            </View>
            <Text
              style={styles.saldoValue}
              accessibilityLabel={`Saldo tersedia ${formatRupiah(saldo)}`}
            >
              {saldoQ.isLoading ? "—" : formatRupiah(saldo)}
            </Text>
          </View>

          <PesanGalat pesan={galat.umum} />

          <Text
            style={[
              styles.label,
              (!!galat.field.jumlah || melebihiSaldo) && {
                color: colors.danger,
              },
            ]}
          >
            Jumlah Penarikan <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <View
            style={[
              styles.nominalWrap,
              (melebihiSaldo || !!galat.field.jumlah) && {
                borderColor: colors.danger,
                backgroundColor: "#FEF2F2",
              },
            ]}
          >
            <Text style={styles.rpPrefix}>Rp</Text>
            <TextInput
              style={styles.nominalInput}
              keyboardType="number-pad"
              value={angka ? angka.toLocaleString("id-ID") : ""}
              onChangeText={setJumlah}
              placeholder="0"
              placeholderTextColor="#9AA5B1"
              accessibilityLabel="Jumlah penarikan dalam rupiah"
            />
          </View>
          {galat.field.jumlah ? (
            <Text
              style={styles.errField}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galat.field.jumlah}
            </Text>
          ) : melebihiSaldo ? (
            <Text style={styles.errField} accessibilityLiveRegion="polite">
              Melebihi saldo Anda ({formatRupiah(saldo)}).
            </Text>
          ) : minimum ? (
            <Text style={styles.bantuField}>
              Penarikan minimum {formatRupiah(minimum)}.
            </Text>
          ) : null}

          <View style={styles.chips}>
            {NOMINAL_CEPAT.map((n) => (
              <Pressable
                key={n}
                style={[styles.chip, n > saldo && styles.chipMati]}
                onPress={() => setJumlah(String(n))}
                disabled={n > saldo}
                accessibilityRole="button"
                accessibilityLabel={`Isi ${formatRupiah(n)}`}
                accessibilityState={{ disabled: n > saldo }}
              >
                <Text
                  style={[styles.chipTeks, n > saldo && { color: "#94A3B8" }]}
                >
                  {formatRupiah(n)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            Rekening Tujuan <Text style={{ color: colors.danger }}>*</Text>
          </Text>

          <Isian
            label="Nama Bank"
            nilai={namaBank}
            onUbah={setNamaBank}
            placeholder="mis. BCA, BRI, Mandiri"
            error={galat.field.nama_bank}
          />
          <Isian
            label="Nomor Rekening"
            nilai={noRek}
            onUbah={setNoRek}
            placeholder="Nomor rekening tujuan"
            keyboard="number-pad"
            error={galat.field.no_rekening}
          />
          <Isian
            label="Atas Nama"
            nilai={atasNama}
            onUbah={setAtasNama}
            placeholder="Nama pemilik rekening"
            error={galat.field.atas_nama}
          />

          <View style={styles.catatan}>
            <Feather name="info" size={16} color="#2563EB" />
            <Text style={styles.catatanTeks}>
              Pastikan nama pemilik rekening sama dengan yang tertera di buku
              tabungan. Penarikan yang datanya keliru akan tertolak oleh bank.
            </Text>
          </View>

          <Pressable
            style={[styles.kirim, ajukan.isPending && { opacity: 0.7 }]}
            onPress={submit}
            disabled={ajukan.isPending}
            accessibilityRole="button"
            accessibilityLabel="Ajukan penarikan saldo"
            accessibilityState={{ busy: ajukan.isPending }}
          >
            {ajukan.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kirimTeks}>Ajukan Penarikan</Text>
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
  keyboard,
  error,
}: {
  label: string;
  nilai: string;
  onUbah: (v: string) => void;
  placeholder: string;
  keyboard?: "number-pad";
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.isianLabel, !!error && { color: colors.danger }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.isianInput,
          !!error && {
            borderColor: colors.danger,
            backgroundColor: "#FEF2F2",
          },
        ]}
        value={nilai}
        onChangeText={onUbah}
        placeholder={placeholder}
        placeholderTextColor="#9AA5B1"
        keyboardType={keyboard}
        accessibilityLabel={label}
      />
      {!!error && (
        <Text
          style={styles.errField}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
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
    marginBottom: spacing.lg,
  },
  saldoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  saldoLabel: { color: colors.white70, fontSize: 13 },
  saldoValue: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  nominalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 56,
  },
  rpPrefix: { fontSize: 16, fontWeight: "700", color: colors.subtext },
  nominalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.white,
  },
  chipMati: { borderColor: colors.border, backgroundColor: "#F8FAFC" },
  chipTeks: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  isianLabel: { fontSize: 13, color: colors.subtext, marginBottom: 6 },
  isianInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    backgroundColor: colors.white,
  },
  catatan: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 6,
  },
  catatanTeks: { flex: 1, fontSize: 12, color: "#1E40AF", lineHeight: 18 },
  errField: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  bantuField: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  kirim: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  kirimTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
