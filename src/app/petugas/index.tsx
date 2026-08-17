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

import LeafletMap from "@/components/LeafletMap";
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { TENGAH_NUSANTARA, ZOOM_NASIONAL } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { daftarPenugasan } from "@/lib/api/petugas";
import { confirmDialog } from "@/lib/dialog";
import { metaStatus } from "@/lib/statusLaporan";
import type { StatusPenugasan } from "@/types/enums";
import type { LeafletMarker } from "@/types/peta";
import type { Penugasan } from "@/types/petugas";

/**
 * Tab penyaring penugasan.
 *
 * `hanya_aktif` adalah **satu-satunya** penyaring yang diterima peladen.
 *
 * Tidak ada parameter `status` di `GET /petugas/penugasan`; versi sebelumnya
 * mengirimkannya dan peladen mengabaikannya diam-diam, sehingga ketiga tab
 * menampilkan daftar yang sama persis. Yang dipilih di sini adalah cakupan
 * pengambilannya — aktif saja atau seluruh riwayat — lalu status persisnya
 * disaring di perangkat, karena tiga tab ini memang tiga nilai dari satu
 * cakupan yang sama.
 */
const TAB: {
  kunci: string;
  label: string;
  status: StatusPenugasan;
  hanyaAktif: boolean;
}[] = [
  {
    kunci: "aktif",
    label: "Perlu Dikerjakan",
    status: "ditugaskan",
    hanyaAktif: true,
  },
  {
    kunci: "dikerjakan",
    label: "Berjalan",
    status: "dikerjakan",
    hanyaAktif: true,
  },
  {
    kunci: "selesai",
    label: "Selesai",
    status: "selesai",
    hanyaAktif: false,
  },
];

export default function DaftarPenugasan() {
  const { user, keluar } = useAuth();
  const [tab, setTab] = useState("aktif");
  const [peta, setPeta] = useState(false);
  const tabAktif = TAB.find((t) => t.kunci === tab) ?? TAB[0]!;

  // Kunci query memakai cakupannya, bukan nama tab: "Perlu Dikerjakan" dan
  // "Berjalan" mengambil data yang sama persis, jadi berpindah di antara
  // keduanya tidak perlu menembak peladen lagi.
  const q = useInfiniteQuery({
    queryKey: ["petugas", "penugasan", tabAktif.hanyaAktif],
    queryFn: ({ pageParam }) =>
      daftarPenugasan({ page: pageParam, hanya_aktif: tabAktif.hanyaAktif }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const daftar = (q.data?.pages.flatMap((h) => h.data) ?? []).filter(
    (p) => p.status === tabAktif.status,
  );

  /**
   * Penanda peta untuk seluruh penugasan yang sudah dimuat.
   *
   * Daftar berurut waktu tidak membantu petugas yang harus berkeliling: dua
   * laporan berdekatan bisa terpisah sepuluh baris. Peta menjawab pertanyaan
   * yang sebenarnya ia punya, mana yang searah, mana yang bisa sekali jalan.
   */
  // `laporan` adalah relasi dan boleh tidak ikut termuat. Ia disempitkan sekali
  // di sini menjadi bentuk yang pasti punya koordinat, supaya sisa berkas tidak
  // perlu memeriksa keberadaannya berulang kali.
  const titik = daftar.flatMap((p) => {
    const l = p.laporan;
    if (!l || !Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) {
      return [];
    }
    return [{ id: p.id, status: p.status, lat: l.latitude, lng: l.longitude }];
  });

  const penanda: LeafletMarker[] = titik.map((t) => ({
    id: t.id,
    lat: t.lat,
    lng: t.lng,
    color: t.status === "dikerjakan" ? "amber" : "red",
  }));
  const pusat = titik[0]
    ? { lat: titik[0].lat, lng: titik[0].lng }
    : TENGAH_NUSANTARA;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/*
        Tidak ada tombol "kembali" di sini: layar ini adalah beranda bagi akun
        petugas, dan menaruh panah yang tidak menuju ke mana pun hanya
        membingungkan. Yang ia butuhkan justru jalan keluar, untuk berganti ke
        akun wargannya.
      */}
      <View style={styles.appbar}>
        <View style={styles.avatar}>
          <Feather name="user" size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appbarTitle} numberOfLines={1}>
            {user?.name ?? "Petugas"}
          </Text>
          <Text style={styles.appbarSub}>Area petugas operasional</Text>
        </View>
        <Pressable
          onPress={async () => {
            const yakin = await confirmDialog(
              "Keluar dari akun petugas?",
              "Anda bisa masuk kembali dengan akun warga untuk menyetor sampah dan berbelanja.",
              "Keluar",
            );
            if (yakin) {
              await keluar();
              router.replace("/login");
            }
          }}
          hitSlop={10}
          style={styles.tombolPeta}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun petugas"
        >
          <Feather name="log-out" size={20} color={colors.subtext} />
        </Pressable>
        <Pressable
          onPress={() => setPeta((v) => !v)}
          hitSlop={10}
          style={styles.tombolPeta}
          accessibilityRole="button"
          accessibilityLabel={
            peta ? "Tampilkan sebagai daftar" : "Tampilkan di peta"
          }
          accessibilityState={{ selected: peta }}
        >
          <Feather
            name={peta ? "list" : "map"}
            size={20}
            color={colors.brand}
          />
        </Pressable>
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
              accessibilityLabel={`Tampilkan penugasan ${t.label.toLowerCase()}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text style={[styles.tabTeks, aktif && { color: colors.white }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {peta && titik.length > 0 && (
        <View style={styles.petaWrap}>
          <LeafletMap
            style={styles.peta}
            center={pusat}
            zoom={titik.length > 0 ? 12 : ZOOM_NASIONAL}
            markers={penanda}
            onMarkerPress={(id) => router.push(`/petugas/${id}` as Href)}
          />
          <View style={styles.legenda}>
            <View style={styles.legendaItem}>
              <View style={[styles.titik, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.legendaTeks}>Belum dimulai</Text>
            </View>
            <View style={styles.legendaItem}>
              <View style={[styles.titik, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.legendaTeks}>Sedang dikerjakan</Text>
            </View>
          </View>
        </View>
      )}

      {q.isLoading ? (
        <LoadingState pesan="Memuat penugasan…" />
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
              icon={tab === "selesai" ? "check-circle" : "clipboard"}
              judul={
                tab === "selesai"
                  ? "Belum ada yang selesai"
                  : "Tidak ada penugasan"
              }
              pesan={
                tab === "selesai"
                  ? "Penugasan yang sudah Anda tuntaskan akan tercatat di sini."
                  : "Belum ada laporan yang ditugaskan kepada Anda. Halaman ini akan terisi begitu ada penugasan baru."
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ p }: { p: Penugasan }) {
  const s = metaStatus(p.status);
  const l = p.laporan;

  // Penugasan tanpa relasi `laporan` tidak punya apa pun untuk ditampilkan —
  // tidak judul, tidak tiket, tidak alamat. Melewatinya lebih jujur daripada
  // menyajikan kartu berisi "undefined" di setiap barisnya.
  if (!l) return null;

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/petugas/${p.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${l.judul}, tiket ${l.tiket}, status ${s.label}`}
    >
      <View style={styles.kepala}>
        <Text style={styles.judul} numberOfLines={2}>
          {l.judul}
        </Text>
        <View style={[styles.status, { backgroundColor: s.bg }]}>
          <Feather name={s.icon} size={12} color={s.fg} />
          <Text style={[styles.statusTeks, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      <Text style={styles.tiket}>{l.tiket}</Text>

      {!!l.alamat && (
        <View style={styles.baris}>
          <Feather name="map-pin" size={13} color={colors.subtext} />
          <Text style={styles.barisTeks} numberOfLines={2}>
            {l.alamat}
          </Text>
        </View>
      )}

      <View style={styles.baris}>
        <Feather name="clock" size={13} color={colors.subtext} />
        <Text style={styles.barisTeks}>
          Dilaporkan{" "}
          {l.created_at
            ? new Date(l.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "pada tanggal yang tidak tercatat"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
  },
  tombolPeta: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  petaWrap: { height: 240, backgroundColor: "#DDE6E2" },
  peta: { flex: 1, width: "100%" },
  legenda: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  titik: { width: 9, height: 9, borderRadius: 5 },
  legendaTeks: { fontSize: 11, color: colors.text, fontWeight: "600" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  appbarSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
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
  tabTeks: { fontSize: 12, fontWeight: "600", color: colors.text },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
  },
  kepala: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
  baris: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginTop: 8,
  },
  barisTeks: { flex: 1, fontSize: 12, color: colors.subtext, lineHeight: 17 },
});
