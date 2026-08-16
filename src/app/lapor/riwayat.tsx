import { Feather } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { daftarLaporan } from "@/lib/api/laporan";
import { rupaStatus } from "@/lib/warnaStatus";
import type { StatusLaporan } from "@/types/enums";
import type { LaporanRingkas } from "@/types/laporan";

/** Ikon tiap status. Label dan warnanya datang dari peladen. */
const IKON_STATUS: Record<StatusLaporan, keyof typeof Feather.glyphMap> = {
  baru: "clock",
  diverifikasi: "check-circle",
  ditugaskan: "user-check",
  dikerjakan: "tool",
  selesai: "check",
  ditolak: "x-circle",
  digabung: "git-merge",
};

/**
 * Tab penyaring.
 *
 * Penyaringan dilakukan peladen lewat parameter `status`, bukan di klien.
 * Dengan daftar berhalaman, menyaring hasil yang sudah diunduh akan
 * menampilkan "3 laporan selesai" padahal yang benar 40 — klien hanya melihat
 * halaman pertama.
 */
const TAB: { kunci: string; label: string; status?: StatusLaporan }[] = [
  { kunci: "semua", label: "Semua" },
  { kunci: "baru", label: "Baru", status: "baru" },
  { kunci: "dikerjakan", label: "Dikerjakan", status: "dikerjakan" },
  { kunci: "selesai", label: "Selesai", status: "selesai" },
];

const labelHari = (iso: string) => {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const awal = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (ts >= awal) return "Hari Ini";
  if (ts >= awal - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Tanpa sebutan zona: timestamp API adalah UTC dan sudah diterjemahkan ke zona
// perangkat. Menempelkan "WIB" akan salah bagi pengguna di WITA dan WIT.
const jam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

type Baris =
  | { type: "header"; label: string }
  | { type: "item"; r: LaporanRingkas };

export default function RiwayatLaporan() {
  const [tab, setTab] = useState("semua");
  const status = TAB.find((t) => t.kunci === tab)?.status;

  /**
   * Cakupan daftar ditentukan peladen dari role pengguna, bukan dari parameter:
   * untuk `masyarakat` ia berisi laporan miliknya sendiri. Tidak ada endpoint
   * `/laporan/saya` terpisah.
   */
  const q = useInfiniteQuery({
    queryKey: ["laporan", "daftar", tab],
    queryFn: ({ pageParam }) => daftarLaporan({ page: pageParam, status }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const daftar = q.data?.pages.flatMap((h) => h.data) ?? [];

  const baris: Baris[] = [];
  let terakhir = "";
  for (const r of daftar) {
    const label = r.created_at ? labelHari(r.created_at) : "Tanpa tanggal";
    if (label !== terakhir) {
      baris.push({ type: "header", label });
      terakhir = label;
    }
    baris.push({ type: "item", r });
  }

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
        <Text style={styles.appbarTitle}>Riwayat Laporan</Text>
      </View>

      <View style={styles.tabs}>
        {TAB.map((t) => {
          const aktif = tab === t.kunci;
          return (
            <Pressable
              key={t.kunci}
              style={[styles.tab, aktif && styles.tabAktif]}
              onPress={() => setTab(t.kunci)}
              accessibilityRole="tab"
              accessibilityLabel={`Tampilkan laporan ${t.label.toLowerCase()}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text style={[styles.tabTeks, aktif && { color: colors.white }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat laporan…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={baris}
          keyExtractor={(b, i) =>
            b.type === "header" ? `h-${b.label}-${i}` : `r-${b.r.id}`
          }
          contentContainerStyle={
            baris.length === 0
              ? styles.kosongWrap
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text style={styles.tanggal}>{item.label}</Text>
            ) : (
              <Kartu r={item.r} />
            )
          }
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
            tab === "semua" ? (
              <EmptyState
                icon="file-text"
                judul="Belum ada laporan"
                pesan="Laporan sampah yang Anda kirim akan muncul di sini beserta perkembangannya."
                aksiLabel="Buat Laporan"
                onAksi={() => router.push("/lapor" as Href)}
              />
            ) : (
              <EmptyState
                icon="inbox"
                judul="Tidak ada di kategori ini"
                pesan="Coba lihat tab lain untuk melihat laporan Anda yang lain."
                aksiLabel="Tampilkan semua"
                onAksi={() => setTab("semua")}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ r }: { r: LaporanRingkas }) {
  const rupa = rupaStatus(r.status_warna);
  const ikon = IKON_STATUS[r.status] ?? "circle";
  const wilayah = [r.desa, r.kabupaten].filter(Boolean).join(", ");

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/lapor/${r.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${r.judul}, status ${r.status_label}, tiket ${r.tiket}`}
    >
      <View style={styles.kartuAtas}>
        {/* `foto_utama` hanya ada bila laporannya memang berfoto — daftar ini
            memuat relasi foto justru untuk itu. */}
        {!!r.foto_utama && (
          <Image
            source={{ uri: r.foto_utama }}
            style={styles.thumb}
            accessibilityIgnoresInvertColors
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.judul} numberOfLines={2}>
            {r.judul}
          </Text>
          <Text style={styles.tiket}>
            {[r.tiket, r.created_at ? jam(r.created_at) : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <View style={[styles.status, { backgroundColor: rupa.bg }]}>
          <Feather name={ikon} size={12} color={rupa.fg} />
          <Text style={[styles.statusTeks, { color: rupa.fg }]}>
            {r.status_label}
          </Text>
        </View>
      </View>

      {/*
        Kategori dan wilayah ditampilkan di kartu supaya pelapor mengenali
        laporannya tanpa membuka apa-apa. Daftar ini sengaja tidak memuat
        penanggung jawab — kunci itu hanya ada pada bentuk lengkap (§3.5).
      */}
      {(!!r.kategori?.nama || !!wilayah || !!r.alamat) && (
        <View style={styles.meta}>
          {!!r.kategori?.nama && (
            <View style={styles.metaBaris}>
              <Feather name="tag" size={13} color={colors.subtext} />
              <Text style={styles.metaTeks} numberOfLines={1}>
                {r.kategori.nama}
              </Text>
            </View>
          )}
          {(!!wilayah || !!r.alamat) && (
            <View style={styles.metaBaris}>
              <Feather name="map-pin" size={13} color={colors.subtext} />
              <Text style={styles.metaTeks} numberOfLines={1}>
                {wilayah || r.alamat}
              </Text>
            </View>
          )}
        </View>
      )}
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
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabTeks: { fontSize: 13, fontWeight: "600", color: colors.text },
  kosongWrap: { flexGrow: 1 },
  tanggal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.subtext,
    marginBottom: 10,
    marginTop: 6,
  },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 10,
  },
  kartuAtas: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
  },
  judul: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  tiket: { fontSize: 12, color: colors.subtext, marginTop: 6 },
  meta: {
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaBaris: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaTeks: { flex: 1, fontSize: 12, color: colors.subtext },
});
