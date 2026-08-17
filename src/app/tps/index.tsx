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
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeanggotaanTps } from "@/hooks/useKeanggotaanTps";
import { daftarTps } from "@/lib/api/fasilitas";
import { formatRupiah } from "@/lib/rupiah";
import type { Tps } from "@/types/fasilitas";

export default function DaftarTps() {
  const { user } = useAuth();
  const [cari, setCari] = useState("");
  const cariTertunda = useDebounce(cari);

  const anggotaQ = useKeanggotaanTps();
  const tpsSaya = anggotaQ.data?.tps ?? null;

  /**
   * Disaring ke wilayah pengguna bila domisilinya sudah diisi.
   *
   * Tanpa penyaring itu, warga di Papua menerima halaman pertama berisi TPS di
   * Jawa, daftar nasional tanpa konteks lokasi hampir tidak ada gunanya.
   * Ketika wilayah belum diisi, daftarnya tetap tampil apa adanya dan ada
   * ajakan melengkapi profil.
   */
  // `user.wilayah` sudah berupa satu wilayah tingkat desa (§3.3), bukan
  // rangkaian bertingkat, tidak ada kunci `.desa` di dalamnya.
  const wilayahId = user?.wilayah?.id;

  const q = useInfiniteQuery({
    queryKey: ["tps", "daftar", wilayahId, cariTertunda],
    queryFn: ({ pageParam }) =>
      daftarTps({
        page: pageParam,
        wilayah_id: wilayahId,
        // Penyaring teksnya bernama `cari` di seluruh direktori (§8.1); `q`
        // hanya dipakai `GET /wilayah/cari`, dan query tak dikenal diabaikan
        // diam-diam, jadi pencariannya dulu tidak melakukan apa pun.
        cari: cariTertunda.trim() || undefined,
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
        <Text style={styles.appbarTitle}>TPS & TPS3R</Text>
        <Pressable
          onPress={() => router.push("/tps/iuran" as Href)}
          hitSlop={10}
          style={{ marginLeft: "auto" }}
          accessibilityRole="button"
          accessibilityLabel="Tagihan iuran saya"
        >
          <Feather name="file-text" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.cariWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.cari}
          placeholder="Cari nama TPS…"
          placeholderTextColor="#9AA5B1"
          value={cari}
          onChangeText={setCari}
          accessibilityLabel="Cari TPS"
        />
      </View>

      {!wilayahId && (
        <Pressable
          style={styles.ajakan}
          onPress={() => router.push("/profil/edit" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Lengkapi domisili agar daftar lebih relevan"
        >
          <Feather name="map-pin" size={16} color="#8A6D1B" />
          <Text style={styles.ajakanTeks}>
            Lengkapi domisili di profil agar daftar ini menampilkan TPS di
            sekitar Anda.
          </Text>
          <Feather name="chevron-right" size={16} color="#8A6D1B" />
        </Pressable>
      )}

      {/*
        Keanggotaan ditampilkan di atas daftar, bukan hanya sebagai lencana di
        salah satu kartu: TPS tempat pengguna terdaftar belum tentu ada di
        halaman pertama, atau bahkan di wilayah yang sedang disaring.
      */}
      {!!tpsSaya && (
        <Pressable
          style={styles.anggotaKotak}
          onPress={() => router.push(`/tps/${tpsSaya.id}` as Href)}
          accessibilityRole="button"
          accessibilityLabel={`Anda anggota ${tpsSaya.nama}. Buka detailnya`}
        >
          <Feather name="check-circle" size={16} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.anggotaLabel}>TPS Anda</Text>
            <Text style={styles.anggotaNama} numberOfLines={1}>
              {tpsSaya.nama}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.brand} />
        </Pressable>
      )}

      {q.isLoading ? (
        <LoadingState pesan="Memuat daftar TPS…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={
            daftar.length === 0
              ? styles.kosongWrap
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => (
            <KartuTps t={item} anggota={tpsSaya?.id === item.id} />
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
            cariTertunda.trim() ? (
              <EmptyState
                icon="search"
                judul="Tidak ada yang cocok"
                pesan="Coba kata pencarian yang lain."
                aksiLabel="Hapus pencarian"
                onAksi={() => setCari("")}
              />
            ) : (
              <EmptyState
                icon="home"
                judul="Belum ada TPS terdaftar"
                pesan="Belum ada TPS di wilayah Anda yang bergabung. Coba lihat peta untuk fasilitas lain di sekitar."
                aksiLabel="Buka Peta"
                onAksi={() => router.push("/peta" as Href)}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function KartuTps({ t, anggota }: { t: Tps; anggota: boolean }) {
  // `is_berbayar` datang dari peladen; tarifnya hanya angka untuk ditampilkan.
  const tarif = t.is_berbayar ? t.tarif_bulanan : null;

  return (
    <Pressable
      style={[styles.kartu, anggota && styles.kartuAnggota]}
      onPress={() => router.push(`/tps/${t.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={[
        t.nama,
        anggota ? "Anda anggota di sini" : null,
        t.jenis_label,
        tarif != null
          ? `iuran ${formatRupiah(tarif)} per bulan`
          : "tanpa iuran",
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={[styles.ikon, anggota && styles.ikonAnggota]}>
        <Feather
          name={anggota ? "check" : "home"}
          size={20}
          color={anggota ? colors.white : colors.brand}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nama} numberOfLines={1}>
          {t.nama}
        </Text>
        {!!t.alamat && (
          <Text style={styles.alamat} numberOfLines={2}>
            {t.alamat}
          </Text>
        )}
        <View style={styles.metaBaris}>
          {/* Lencana keanggotaan didahulukan, ia menjawab pertanyaan yang
              paling menentukan sebelum pengguna membuka kartunya. */}
          {anggota && (
            <View style={styles.lencanaAnggota}>
              <Text style={styles.lencanaAnggotaTeks}>Anggota</Text>
            </View>
          )}
          <View style={styles.jenis}>
            <Text style={styles.jenisTeks}>{t.jenis_label}</Text>
          </View>
          {typeof t.jarak_km === "number" && (
            <Text style={styles.jarak}>{t.jarak_km.toFixed(1)} km</Text>
          )}
          <Text style={styles.tarif}>
            {tarif != null ? `${formatRupiah(tarif)}/bulan` : "Tanpa iuran"}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.subtext} />
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
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  cari: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    color: colors.text,
  },
  ajakan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF9E7",
    borderWidth: 1,
    borderColor: "#F5E6A8",
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.lg,
    marginBottom: 10,
    minHeight: 44,
  },
  ajakanTeks: { flex: 1, fontSize: 12, color: "#8A6D1B", lineHeight: 17 },
  anggotaKotak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#DCF3EA",
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.lg,
    marginBottom: 10,
    minHeight: 44,
  },
  anggotaLabel: { fontSize: 11, fontWeight: "700", color: colors.brand },
  anggotaNama: { fontSize: 14, fontWeight: "700", color: colors.text },
  kosongWrap: { flexGrow: 1 },
  kartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  // Garis tepi, bukan latar berwarna: kartunya harus tetap terbaca sama
  // mudahnya dengan yang lain, hanya ditandai.
  kartuAnggota: { borderWidth: 1.5, borderColor: colors.brand },
  lencanaAnggota: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  lencanaAnggotaTeks: { fontSize: 10, fontWeight: "700", color: colors.white },
  ikon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  ikonAnggota: { backgroundColor: colors.brand },
  nama: { fontSize: 15, fontWeight: "700", color: colors.text },
  alamat: { fontSize: 12, color: colors.subtext, marginTop: 3, lineHeight: 17 },
  metaBaris: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  jenis: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "#E2E8F0",
  },
  jenisTeks: { fontSize: 10, fontWeight: "700", color: "#475569" },
  jarak: { fontSize: 12, color: colors.subtext },
  tarif: { fontSize: 12, fontWeight: "700", color: colors.brand },
});
