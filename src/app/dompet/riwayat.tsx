import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
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
import { transaksiDompet } from "@/lib/api/dompet";
import BarisMutasi from "@/components/BarisMutasi";
import { TIPE_TRANSAKSI_DOMPET, type TipeTransaksiDompet } from "@/types/enums";

const SEMUA = "semua" as const;
type Saring = typeof SEMUA | TipeTransaksiDompet;

const LABEL: Record<TipeTransaksiDompet, string> = {
  setor: "Setoran",
  belanja: "Belanja",
  penarikan: "Penarikan",
  refund: "Refund",
  iuran: "Iuran",
};

export default function RiwayatMutasi() {
  const [saring, setSaring] = useState<Saring>(SEMUA);

  const q = useInfiniteQuery({
    queryKey: ["dompet", "transaksi", saring],
    queryFn: ({ pageParam }) =>
      transaksiDompet({
        page: pageParam,
        tipe: saring === SEMUA ? undefined : saring,
      }),
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
        <Text style={styles.appbarTitle}>Mutasi Saldo</Text>
      </View>

      <View style={styles.chips}>
        {([SEMUA, ...TIPE_TRANSAKSI_DOMPET] as Saring[]).map((t) => {
          const aktif = saring === t;
          const label = t === SEMUA ? "Semua" : LABEL[t];
          return (
            <Pressable
              key={t}
              style={[styles.chip, aktif && styles.chipAktif]}
              onPress={() => setSaring(t)}
              accessibilityRole="button"
              accessibilityLabel={`Saring ${label}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text
                style={[styles.chipTeks, aktif && { color: colors.white }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat mutasi…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={
            daftar.length === 0
              ? styles.kosongWrap
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => <BarisMutasi m={item} />}
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
              icon="inbox"
              judul={
                saring === SEMUA
                  ? "Belum ada mutasi"
                  : `Belum ada mutasi ${LABEL[saring as TipeTransaksiDompet].toLowerCase()}`
              }
              pesan={
                saring === SEMUA
                  ? "Setoran, belanja, dan penarikan Anda akan tercatat di sini."
                  : "Coba pilih jenis mutasi yang lain."
              }
              aksiLabel={saring === SEMUA ? undefined : "Tampilkan semua"}
              onAksi={saring === SEMUA ? undefined : () => setSaring(SEMUA)}
            />
          }
        />
      )}
    </SafeAreaView>
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipTeks: { fontSize: 13, color: colors.text, fontWeight: "600" },
  kosongWrap: { flexGrow: 1 },
});
