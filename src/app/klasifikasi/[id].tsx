import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import KategoriBadge from "@/components/KategoriBadge";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { detailKlasifikasi, hapusKlasifikasi } from "@/lib/api/klasifikasi";
import { confirmDialog, notify } from "@/lib/dialog";
import { formatRupiahOpsional } from "@/lib/rupiah";

export default function DetailRiwayat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["klasifikasi", "detail", nomor],
    queryFn: () => detailKlasifikasi(nomor),
    enabled: Number.isFinite(nomor),
  });

  const hapusMutasi = useMutation({
    mutationFn: () => hapusKlasifikasi(nomor),
    onSuccess: async () => {
      // Riwayat dibatalkan supaya daftar di layar sebelumnya tidak menampilkan
      // entri yang barusan dihapus saat pengguna kembali ke sana.
      await qc.invalidateQueries({ queryKey: ["klasifikasi", "riwayat"] });
      router.back();
    },
    onError: () =>
      notify("Gagal", "Riwayat tidak dapat dihapus. Coba lagi sebentar."),
  });

  const hapus = async () => {
    const yakin = await confirmDialog(
      "Hapus Riwayat",
      "Riwayat ini beserta fotonya akan dihapus permanen.",
      "Hapus",
    );
    if (yakin) hapusMutasi.mutate();
  };

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <LoadingState pesan="Memuat detail…" />
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const c = q.data;
  const dibuat = new Date(c.created_at);
  const tanggal = dibuat.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Tanpa sebutan zona: timestamp dari API adalah UTC, dan `toLocaleTimeString`
  // sudah menerjemahkannya ke zona perangkat. Menempelkan "WIB" seperti versi
  // sebelumnya akan salah bagi pengguna di WITA dan WIT.
  const waktu = dibuat.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail Riwayat</Text>
        {/*
          Ikon "bagikan" versi sebelumnya tidak terpasang ke aksi apa pun —
          tombol yang tidak melakukan apa-apa lebih buruk daripada tidak ada
          tombol. Dihapus sampai ada fitur berbagi yang benar-benar ada.
        */}
        <Pressable
          onPress={hapus}
          hitSlop={8}
          disabled={hapusMutasi.isPending}
          accessibilityRole="button"
          accessibilityLabel="Hapus riwayat ini"
          accessibilityState={{ disabled: hapusMutasi.isPending }}
        >
          <Feather
            name="trash-2"
            size={20}
            color={hapusMutasi.isPending ? colors.muted : colors.danger}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {c.foto_url ? (
            <Image
              source={{ uri: c.foto_url }}
              style={styles.heroImg}
              accessibilityIgnoresInvertColors
              accessibilityLabel={`Foto ${c.jenis}`}
            />
          ) : (
            <Feather name="image" size={40} color="#CBD5E1" />
          )}
        </View>

        <View style={styles.body}>
          {!!c.catatan && (
            <View style={styles.peringatan}>
              <Feather name="alert-triangle" size={18} color="#B91C1C" />
              <Text style={styles.peringatanTeks}>{c.catatan}</Text>
            </View>
          )}

          <KategoriBadge kategori={c.kategori} label={c.kategori_label} />
          <Text style={styles.name}>{c.jenis}</Text>
          {!!c.kategori_deskripsi && (
            <Text style={styles.desc}>{c.kategori_deskripsi}</Text>
          )}

          <View style={styles.dtRow}>
            <View style={styles.dtCard}>
              <View style={styles.dtHead}>
                <Feather name="calendar" size={14} color={colors.subtext} />
                <Text style={styles.dtLabel}>Tanggal</Text>
              </View>
              <Text style={styles.dtVal}>{tanggal}</Text>
            </View>
            <View style={styles.dtCard}>
              <View style={styles.dtHead}>
                <Feather name="clock" size={14} color={colors.subtext} />
                <Text style={styles.dtLabel}>Waktu</Text>
              </View>
              <Text style={styles.dtVal}>{waktu}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Klasifikasi</Text>
            <InfoRow
              icon="target"
              label="Keyakinan AI"
              value={
                c.keyakinan_rendah
                  ? `${Math.round(c.confidence)}% — masih dugaan`
                  : `${Math.round(c.confidence)}%`
              }
            />
            {!!c.material && (
              <InfoRow icon="layers" label="Material" value={c.material} />
            )}
            <InfoRow
              icon="refresh-ccw"
              label="Dapat Didaur Ulang"
              value={c.dapat_didaur_ulang ? "Ya" : "Tidak"}
            />
            <InfoRow
              icon="trending-up"
              label="Perkiraan Nilai"
              value={formatRupiahOpsional(c.estimasi_nilai)}
            />
            <InfoRow
              icon="box"
              label="Estimasi Berat"
              value={
                c.estimasi_berat_kg != null ? `${c.estimasi_berat_kg} kg` : "—"
              }
              last
            />
          </View>

          {c.langkah_pengolahan.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Langkah Pengolahan</Text>
              {c.langkah_pengolahan.map((l, i) => (
                <View key={i} style={styles.langkah}>
                  <View style={styles.langkahNum}>
                    <Text style={styles.langkahNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.langkahText}>{l}</Text>
                </View>
              ))}
            </View>
          )}
          {!!c.rekomendasi_daur_ulang && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rekomendasi Daur Ulang</Text>
              <Text style={styles.desc}>{c.rekomendasi_daur_ulang}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoLeft}>
        <Feather name={icon} size={16} color={colors.brand} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  peringatan: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 14,
  },
  peringatanTeks: {
    flex: 1,
    color: "#7F1D1D",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 14,
  },
  hero: {
    height: 260,
    backgroundColor: "#DDE6E2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  body: { padding: spacing.lg },
  kat: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 12 },
  desc: { fontSize: 14, color: colors.subtext, marginTop: 8, lineHeight: 20 },
  dtRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  dtCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
  },
  dtHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  dtLabel: { color: colors.subtext, fontSize: 12 },
  dtVal: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { color: colors.text, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  langkah: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignItems: "flex-start",
  },
  langkahNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  langkahNumText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  langkahText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
});
