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
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import KategoriBadge from "@/components/KategoriBadge";
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { riwayatKlasifikasi } from "@/lib/api/klasifikasi";
import { metaKategori } from "@/lib/kategoriSampah";
import { formatRupiahOpsional } from "@/lib/rupiah";
import { KATEGORI_SAMPAH, type KategoriSampah } from "@/types/enums";
import type { HasilKlasifikasi } from "@/types/klasifikasi";
import { urlMedia } from "@/lib/media";

/**
 * Chip penyaring dibangkitkan dari enum, bukan ditulis ulang.
 *
 * Daftar yang ditulis tangan di sini sebelumnya hanya memuat tiga dari lima
 * kategori, `residu` dan `elektronik` tidak pernah bisa disaring sama sekali.
 * Menurunkannya dari `KATEGORI_SAMPAH` membuat kategori baru mustahil terlupa.
 */
const SEMUA = "semua" as const;
type Chip = typeof SEMUA | KategoriSampah;
const CHIPS: Chip[] = [SEMUA, ...KATEGORI_SAMPAH];

/**
 * Pembatas tanggal untuk daftar.
 *
 * `created_at` boleh `null` menurut kontrak API. Tanpa penjagaan ini
 * `new Date(null)` menghasilkan 1 Januari 1970, dan satu baris tanpa timestamp
 * menyisipkan judul "1 Januari 1970" di tengah riwayat hari ini.
 */
function labelHari(iso: string | null) {
  if (!iso) return "Tanpa tanggal";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "Tanpa tanggal";
  const now = new Date();
  const awalHariIni = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (ts >= awalHariIni) return "Hari Ini";
  if (ts >= awalHariIni - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const jam = (iso: string | null) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--"
    : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

type Baris =
  | { type: "header"; label: string }
  | { type: "item"; c: HasilKlasifikasi };

export default function RiwayatKlasifikasi() {
  const [chip, setChip] = useState<Chip>(SEMUA);
  const [cari, setCari] = useState("");
  const cariTertunda = useDebounce(cari);

  /**
   * Penyaring kategori dikerjakan peladen, pencarian teks tidak.
   *
   * `GET /klasifikasi/riwayat` hanya menerima `kategori`, `page`, dan
   * `per_page`. Versi sebelumnya ikut mengirim `q`, dan peladen mengabaikannya
   * diam-diam — kotak pencarian terlihat bekerja padahal daftarnya tidak pernah
   * menyempit sedikit pun. Karena itu kata kuncinya sengaja **tidak** ikut ke
   * kunci query: mengetik tidak memicu permintaan baru, penyaringan terjadi
   * atas data yang sudah ada di perangkat.
   */
  const q = useInfiniteQuery({
    queryKey: ["klasifikasi", "riwayat", chip],
    queryFn: ({ pageParam }) =>
      riwayatKlasifikasi({
        page: pageParam,
        kategori: chip === SEMUA ? undefined : chip,
      }),
    initialPageParam: 1,
    getNextPageParam: (halaman) =>
      halaman.meta.current_page < halaman.meta.last_page
        ? halaman.meta.current_page + 1
        : undefined,
  });

  const semua = q.data?.pages.flatMap((h) => h.data) ?? [];

  // Dicocokkan ke nama benda dan materialnya, dua hal yang memang diingat
  // pengguna. Cakupannya terbatas pada halaman yang sudah dimuat, dan keadaan
  // kosong di bawah mengatakan itu apa adanya alih-alih menyiratkan riwayatnya
  // memang tidak memuat apa pun.
  const kunci = cariTertunda.trim().toLowerCase();
  const daftar = kunci
    ? semua.filter(
        (c) =>
          c.jenis.toLowerCase().includes(kunci) ||
          (c.material?.toLowerCase().includes(kunci) ?? false),
      )
    : semua;

  // Sisipkan pemisah tanggal di antara item. Dihitung dari daftar yang sudah
  // digabung, bukan per halaman, supaya judul tanggal tidak terulang setiap
  // kali halaman berikutnya dimuat.
  const baris: Baris[] = [];
  let terakhir = "";
  for (const c of daftar) {
    const label = labelHari(c.created_at);
    if (label !== terakhir) {
      baris.push({ type: "header", label });
      terakhir = label;
    }
    baris.push({ type: "item", c });
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
        <Text style={styles.appbarTitle}>Riwayat Klasifikasi</Text>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.search}
          placeholder="Cari jenis sampah…"
          placeholderTextColor="#9AA5B1"
          value={cari}
          onChangeText={setCari}
          accessibilityLabel="Cari riwayat klasifikasi"
        />
      </View>

      <View style={styles.chips}>
        {CHIPS.map((c) => {
          const aktif = chip === c;
          const label = c === SEMUA ? "Semua" : metaKategori(c).label;
          return (
            <Pressable
              key={c}
              style={[styles.chip, aktif && styles.chipActive]}
              onPress={() => setChip(c)}
              accessibilityRole="button"
              accessibilityLabel={`Saring kategori ${label}`}
              accessibilityState={{ selected: aktif }}
            >
              <Text style={[styles.chipText, aktif && { color: colors.white }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat riwayat…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={baris}
          keyExtractor={(r, i) =>
            r.type === "header" ? `h-${r.label}-${i}` : `c-${r.c.id}`
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
              <Kartu c={item.c} />
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
            cariTertunda.trim() || chip !== SEMUA ? (
              <EmptyState
                icon="search"
                judul="Tidak ada yang cocok"
                pesan={
                  kunci && q.hasNextPage
                    ? "Pencarian menjangkau riwayat yang sudah dimuat. Gulir ke bawah untuk memuat lebih banyak, atau ubah kata pencarian."
                    : "Coba ubah kata pencarian atau pilih kategori lain."
                }
                aksiLabel="Tampilkan semua"
                onAksi={() => {
                  setCari("");
                  setChip(SEMUA);
                }}
              />
            ) : (
              <EmptyState
                icon="camera"
                judul="Belum ada riwayat"
                pesan="Setiap sampah yang Anda pindai akan tersimpan di sini."
                aksiLabel="Pindai Sampah"
                onAksi={() => router.push("/aksi" as Href)}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({ c }: { c: HasilKlasifikasi }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/klasifikasi/${c.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${c.jenis}, kategori ${c.kategori_label}, pukul ${jam(c.created_at)}`}
    >
      <View style={styles.thumb}>
        {c.foto_url ? (
          <Image
            source={{ uri: urlMedia(c.foto_url) }}
            style={styles.thumbImg}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={22} color="#CBD5E1" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {c.jenis}
          </Text>
          <Text style={styles.waktu}>{jam(c.created_at)}</Text>
        </View>
        <View style={styles.badgeRow}>
          <KategoriBadge
            kategori={c.kategori}
            label={c.kategori_label}
            ukuran="kecil"
          />
          {!!c.material && (
            <Text style={styles.material} numberOfLines={1}>
              {c.material}
            </Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.akurasi}>
            {c.keyakinan_rendah
              ? "Dugaan sementara"
              : `Keyakinan ${Math.round(c.confidence)}%`}
          </Text>
          {c.estimasi_nilai != null && (
            <Text style={styles.nilai}>
              {formatRupiahOpsional(c.estimasi_nilai)}
            </Text>
          )}
        </View>
      </View>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  search: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    color: colors.text,
  },
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
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  kosongWrap: { flexGrow: 1 },
  tanggal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.subtext,
    marginBottom: 10,
    marginTop: 6,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  waktu: { fontSize: 11, color: colors.subtext },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  material: { flex: 1, fontSize: 12, color: colors.subtext },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  akurasi: { fontSize: 12, color: colors.subtext },
  nilai: { fontSize: 12, fontWeight: "700", color: colors.brand },
});
