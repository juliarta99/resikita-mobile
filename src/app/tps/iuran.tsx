import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useKeanggotaanTps } from "@/hooks/useKeanggotaanTps";
import { bayarIuran } from "@/lib/api/fasilitas";
import { ApiError } from "@/lib/api/error";
import { confirmDialog, notify } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";
import type { TpsIuran } from "@/types/fasilitas";

/**
 * Warna lencana status, mengikuti `status_warna` dari peladen.
 *
 * Namanya yang menentukan, bukan tebakan klien atas nilai `status` — dengan
 * begitu web dan mobile menandai tagihan yang sama dengan warna yang sama.
 * Nilai di luar daftar jatuh ke abu-abu netral, bukan menghilang.
 */
const WARNA_STATUS: Record<string, { bg: string; fg: string }> = {
  green: { bg: "#DCF3EA", fg: colors.brand },
  amber: { bg: "#FEF3C7", fg: "#B45309" },
  red: { bg: "#FEE2E2", fg: "#B91C1C" },
  gray: { bg: "#E2E8F0", fg: "#475569" },
};

const warnaStatus = (nama: string) => WARNA_STATUS[nama] ?? WARNA_STATUS.gray;

/** `2026-03` → `Maret 2026`. Nilai yang tak terbaca ditampilkan apa adanya. */
function labelPeriode(periode: string): string {
  const tanggal = new Date(`${periode}-01T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) return periode;
  return tanggal.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export default function TagihanIuran() {
  const qc = useQueryClient();
  const [sedangBayar, setSedangBayar] = useState<number | null>(null);

  /**
   * Tagihan datang bersama keanggotaan, bukan dari endpoint sendiri.
   *
   * `GET /tps/keanggotaan-saya` (§13.1) mengembalikan TPS beserta **12 periode
   * terakhir** sekaligus. Tidak ada `GET /tps/iuran` berhalaman — versi
   * sebelumnya memanggil endpoint yang tidak pernah ada, jadi layar ini tidak
   * bisa dibuka sama sekali.
   */
  const q = useKeanggotaanTps();
  const keanggotaan = q.data ?? null;
  const tagihan = keanggotaan?.tagihan ?? [];

  const bayar = useMutation({
    mutationFn: (id: number) => bayarIuran(id),
    onSuccess: async () => {
      setSedangBayar(null);
      // Saldo ikut berubah: pembayaran iuran **selalu** memotong saldo
      // Resikita (§13.4) — tidak ada jalur Midtrans untuk tagihan ini.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tps"] }),
        qc.invalidateQueries({ queryKey: ["dompet"] }),
      ]);
      notify("Iuran lunas", "Tagihan dibayar dari saldo Resikita Anda.");
    },
    onError: (e: unknown) => {
      setSedangBayar(null);
      notify(
        "Pembayaran gagal",
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Pembayaran tidak dapat diproses.",
      );
    },
  });

  const konfirmasiBayar = async (it: TpsIuran) => {
    const ya = await confirmDialog(
      `Bayar ${formatRupiah(it.jumlah)}?`,
      `Iuran periode ${labelPeriode(it.periode)} akan dipotong dari saldo Resikita Anda.`,
      "Bayar",
    );
    if (!ya) return;
    setSedangBayar(it.id);
    bayar.mutate(it.id);
  };

  const appbar = (
    <View style={styles.appbar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.appbarTitle}>Tagihan Iuran</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat tagihan…" />
      </SafeAreaView>
    );
  }

  if (q.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  // `data: null` berarti belum jadi anggota — keadaan normal, bukan galat.
  if (!keanggotaan) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <EmptyState
          icon="home"
          judul="Belum jadi anggota TPS"
          pesan="Tagihan iuran muncul setelah Anda terdaftar sebagai anggota sebuah TPS."
          aksiLabel="Cari TPS"
          onAksi={() => router.push("/tps" as Href)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <Pressable
        style={styles.tpsKotak}
        onPress={() => router.push(`/tps/${keanggotaan.tps.id}` as Href)}
        accessibilityRole="button"
        accessibilityLabel={`Anda anggota ${keanggotaan.tps.nama}. Buka detailnya`}
      >
        <Feather name="home" size={16} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tpsLabel}>TPS Anda</Text>
          <Text style={styles.tpsNama} numberOfLines={1}>
            {keanggotaan.tps.nama}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.brand} />
      </Pressable>

      <FlatList
        data={tagihan}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={
          tagihan.length === 0
            ? styles.kosongWrap
            : { padding: spacing.lg, paddingBottom: 30 }
        }
        renderItem={({ item }) => (
          <KartuIuran
            it={item}
            memproses={sedangBayar === item.id}
            onBayar={() => konfirmasiBayar(item)}
          />
        )}
        ListHeaderComponent={
          tagihan.length > 0 ? (
            <Text style={styles.catatan}>
              Menampilkan 12 periode terakhir. Pembayaran dipotong dari saldo
              Resikita.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="check-circle"
            judul="Tidak ada tagihan"
            pesan={
              keanggotaan.tps.is_berbayar
                ? "Belum ada tagihan iuran yang diterbitkan untuk keanggotaan Anda."
                : "TPS ini tidak memungut iuran bulanan."
            }
          />
        }
      />
    </SafeAreaView>
  );
}

function KartuIuran({
  it,
  memproses,
  onBayar,
}: {
  it: TpsIuran;
  memproses: boolean;
  onBayar: () => void;
}) {
  const warna = warnaStatus(it.status_warna);
  const dibayar = it.dibayar_at
    ? new Date(it.dibayar_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <View style={styles.kartu}>
      <View style={styles.kepala}>
        <View style={{ flex: 1 }}>
          <Text style={styles.periode}>{labelPeriode(it.periode)}</Text>
          <Text style={styles.jumlah}>{formatRupiah(it.jumlah)}</Text>
        </View>
        {/* Label statusnya dari peladen, bukan dirangkai di sini — kata yang
            dibaca warga harus sama persis dengan yang di web. */}
        <View style={[styles.status, { backgroundColor: warna.bg }]}>
          <Text style={[styles.statusTeks, { color: warna.fg }]}>
            {it.status_label}
          </Text>
        </View>
      </View>

      {!!dibayar && (
        <Text style={styles.tempo}>
          Dibayar {dibayar}
          {it.metode_bayar ? ` · ${it.metode_bayar}` : ""}
        </Text>
      )}

      {/* `bisa_dibayar` datang dari peladen supaya klien tidak menghitung ulang
          aturan transisi statusnya sendiri. */}
      {it.bisa_dibayar && (
        <Pressable
          style={[styles.tombol, memproses && { opacity: 0.6 }]}
          onPress={onBayar}
          disabled={memproses}
          accessibilityRole="button"
          accessibilityLabel={`Bayar iuran ${labelPeriode(it.periode)} sebesar ${formatRupiah(it.jumlah)} dari saldo`}
          accessibilityState={{ busy: memproses, disabled: memproses }}
        >
          {memproses ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Feather name="credit-card" size={15} color={colors.white} />
              <Text style={styles.tombolTeks}>Bayar dari Saldo</Text>
            </>
          )}
        </Pressable>
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
  tpsKotak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#DCF3EA",
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.lg,
    marginTop: 14,
    minHeight: 44,
  },
  tpsLabel: { fontSize: 11, fontWeight: "700", color: colors.brand },
  tpsNama: { fontSize: 14, fontWeight: "700", color: colors.text },
  catatan: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
    marginBottom: 12,
  },
  kosongWrap: { flexGrow: 1 },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  kepala: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  periode: { fontSize: 13, color: colors.subtext },
  jumlah: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  tempo: { fontSize: 12, color: colors.subtext, marginTop: 8 },
  tombol: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    marginTop: 14,
  },
  tombolTeks: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
