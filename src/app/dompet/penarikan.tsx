import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
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
import { riwayatPenarikan } from "@/lib/api/dompet";
import { formatRupiah } from "@/lib/rupiah";
import { rupaStatus } from "@/lib/warnaStatus";
import type { PenarikanSaldo } from "@/types/dompet";
import type { StatusPenarikan } from "@/types/enums";

/**
 * Ikon tiap status penarikan.
 *
 * Hanya ikonnya yang ditentukan di sini. Label dan warnanya datang dari peladen
 * lewat `status_label` dan `status_warna`, versi sebelumnya menyimpan tabel
 * status sendiri lengkap dengan daftar ejaan yang "masuk akal", dan menampilkan
 * nilai enum mentah begitu peladen memakai kata yang tidak ada di daftar itu.
 */
const IKON_STATUS: Record<StatusPenarikan, keyof typeof Feather.glyphMap> = {
  menunggu: "clock",
  disetujui: "check-circle",
  selesai: "check",
  ditolak: "x-circle",
};

const waktuLengkap = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RiwayatPenarikan() {
  const q = useInfiniteQuery({
    queryKey: ["dompet", "penarikan"],
    queryFn: ({ pageParam }) => riwayatPenarikan({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const daftar = q.data?.pages.flatMap((h) => h.data) ?? [];

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
        <Text style={styles.appbarTitle}>Riwayat Penarikan</Text>
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat penarikan…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={
            daftar.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => <Kartu p={item} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="arrow-up-circle"
              judul="Belum ada penarikan"
              pesan="Saldo hasil setoran bisa ditarik ke rekening bank Anda kapan saja."
              aksiLabel="Tarik Saldo"
              onAksi={() => router.push("/dompet/tarik" as Href)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ p }: { p: PenarikanSaldo }) {
  const rupa = rupaStatus(p.status_warna);
  const ikon = IKON_STATUS[p.status] ?? "circle";
  const waktu = p.created_at ? waktuLengkap(p.created_at) : "";

  return (
    <View
      style={styles.kartu}
      accessible
      accessibilityLabel={`Penarikan ${formatRupiah(p.jumlah)}${p.nama_bank ? ` ke ${p.nama_bank}` : ""} atas nama ${p.atas_nama}, status ${p.status_label}${waktu ? `, ${waktu}` : ""}`}
    >
      <View style={styles.kepala}>
        <Text style={styles.jumlah}>{formatRupiah(p.jumlah)}</Text>
        <View style={[styles.status, { backgroundColor: rupa.bg }]}>
          <Feather name={ikon} size={12} color={rupa.fg} />
          <Text style={[styles.statusTeks, { color: rupa.fg }]}>
            {p.status_label}
          </Text>
        </View>
      </View>

      <View style={styles.rekening}>
        <Feather name="credit-card" size={14} color={colors.subtext} />
        {/* Nomor rekening sudah disamarkan peladen, menyamarkannya lagi di
            sini akan memakan justru empat digit terakhir yang berguna. */}
        <Text style={styles.rekeningTeks}>
          {[p.nama_bank, p.no_rekening].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text style={styles.atasNama}>a.n. {p.atas_nama}</Text>
      {!!p.catatan && <Text style={styles.catatan}>{p.catatan}</Text>}
      {!!waktu && <Text style={styles.waktu}>{waktu}</Text>}
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
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  kepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  jumlah: { fontSize: 18, fontWeight: "800", color: colors.text },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  catatan: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 8,
    lineHeight: 17,
  },
  rekening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  rekeningTeks: { fontSize: 13, color: colors.text, fontWeight: "600" },
  atasNama: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  waktu: { fontSize: 11, color: "#94A3B8", marginTop: 8 },
});
