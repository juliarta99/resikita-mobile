import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import { KUNCI_NOTIFIKASI, useAksiNotifikasi } from "@/hooks/useNotifikasi";
import { daftarNotifikasi } from "@/lib/api/notifikasi";
import type { Notifikasi } from "@/types/notifikasi";

const SEMUA = "semua" as const;
const BELUM = "belum" as const;
type Saring = typeof SEMUA | typeof BELUM;

/** `created_at` boleh `null`; `new Date(null)` diam-diam berarti tahun 1970. */
const waktuRelatif = (iso: string | null) => {
  if (!iso) return "Waktu tidak tercatat";
  const selisih = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(selisih)) return "Waktu tidak tercatat";
  const menit = Math.floor(selisih / 60000);
  if (menit < 1) return "Baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function DaftarNotifikasi() {
  const [saring, setSaring] = useState<Saring>(SEMUA);
  const { baca, bacaSemua } = useAksiNotifikasi();

  /**
   * Penyaringnya `belum_dibaca`, sebuah boolean — bukan `status` berisi enum.
   *
   * Versi sebelumnya menebak `status: "belum_dibaca"` dan menandainya sendiri
   * sebagai tebakan. Kontraknya ternyata memang menyebutkannya: `belum_dibaca`
   * bertipe bool. Nama parameter yang keliru tidak ditolak peladen, ia hanya
   * diabaikan — tab "Belum Dibaca" tampil sama persis dengan "Semua", dan
   * tidak ada satu pun galat yang menunjuk sebabnya.
   *
   * Dikirim hanya ketika bernilai `true`. Mengirim `false` untuk tab "Semua"
   * juga benar, tapi menghilangkan parameternya membuat kedua tab punya URL
   * yang berbeda secara jelas saat ditelusuri di log jaringan.
   */
  const q = useInfiniteQuery({
    queryKey: [...KUNCI_NOTIFIKASI, "daftar", saring],
    queryFn: ({ pageParam }) =>
      daftarNotifikasi({
        page: pageParam,
        ...(saring === BELUM ? { belum_dibaca: true } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const daftar = q.data?.pages.flatMap((h) => h.data) ?? [];
  const adaBelumDibaca = daftar.some((n) => !n.dibaca);

  const buka = (n: Notifikasi) => {
    if (!n.dibaca) baca.mutate(n.id);
    // Tautan datang dari peladen, jadi bisa saja menunjuk rute yang tidak ada
    // di aplikasi versi ini. `router.push` pada rute tak dikenal cukup tidak
    // melakukan apa-apa, lebih baik daripada melempar galat ke pengguna yang
    // hanya menekan sebuah notifikasi.
    if (n.action_url) router.push(n.action_url as Href);
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
        <Text style={styles.appbarTitle}>Notifikasi</Text>
        {adaBelumDibaca && (
          <Pressable
            onPress={() => bacaSemua.mutate()}
            disabled={bacaSemua.isPending}
            hitSlop={8}
            style={styles.bacaSemua}
            accessibilityRole="button"
            accessibilityLabel="Tandai semua notifikasi sudah dibaca"
            accessibilityState={{ busy: bacaSemua.isPending }}
          >
            {bacaSemua.isPending ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Text style={styles.bacaSemuaTeks}>Tandai semua</Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {([SEMUA, BELUM] as Saring[]).map((s) => {
          const aktif = saring === s;
          const label = s === SEMUA ? "Semua" : "Belum Dibaca";
          return (
            <Pressable
              key={s}
              style={[styles.chip, aktif && styles.chipAktif]}
              onPress={() => setSaring(s)}
              accessibilityRole="tab"
              accessibilityLabel={`Tampilkan notifikasi ${label.toLowerCase()}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text style={[styles.chipTeks, aktif && { color: colors.white }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat notifikasi…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={
            daftar.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => (
            <Kartu n={item} onBuka={() => buka(item)} />
          )}
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
            saring === BELUM ? (
              <EmptyState
                icon="check-circle"
                judul="Semua sudah dibaca"
                pesan="Tidak ada notifikasi yang menunggu perhatian Anda."
                aksiLabel="Lihat semua"
                onAksi={() => setSaring(SEMUA)}
              />
            ) : (
              <EmptyState
                icon="bell"
                judul="Belum ada notifikasi"
                pesan="Kabar tentang laporan, setoran, dan pesanan Anda akan muncul di sini."
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ n, onBuka }: { n: Notifikasi; onBuka: () => void }) {
  return (
    <Pressable
      style={[styles.kartu, !n.dibaca && styles.kartuBaru]}
      onPress={onBuka}
      accessibilityRole="button"
      accessibilityLabel={`${n.dibaca ? "" : "Belum dibaca. "}${n.judul}. ${n.pesan}. ${waktuRelatif(n.created_at)}`}
    >
      <View style={[styles.ikon, !n.dibaca && styles.ikonBaru]}>
        <Feather
          name="bell"
          size={17}
          color={n.dibaca ? colors.subtext : colors.brand}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.judul, !n.dibaca && styles.judulBaru]}
          numberOfLines={2}
        >
          {n.judul}
        </Text>
        <Text style={styles.isi} numberOfLines={3}>
          {n.pesan}
        </Text>
        <Text style={styles.waktu}>{waktuRelatif(n.created_at)}</Text>
      </View>
      {/*
        Titik penanda belum dibaca. Ia berdampingan dengan latar kartu yang
        sedikit berbeda dan judul yang lebih tebal, tiga penanda sekaligus,
        karena warna saja tidak cukup bagi pengguna yang buta warna.
      */}
      {!n.dibaca && <View style={styles.titik} />}
    </Pressable>
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
  appbarTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
  bacaSemua: { minHeight: 44, justifyContent: "center" },
  bacaSemuaTeks: { color: colors.link, fontWeight: "700", fontSize: 13 },
  chips: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipTeks: { fontSize: 13, color: colors.text, fontWeight: "600" },
  kartu: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  kartuBaru: { backgroundColor: "#F3FBF7" },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  ikonBaru: { backgroundColor: "#DCF3EA" },
  judul: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
  judulBaru: { fontWeight: "800" },
  isi: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 3,
  },
  waktu: { fontSize: 11, color: "#94A3B8", marginTop: 6 },
  titik: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.brand,
    marginTop: 6,
  },
});
