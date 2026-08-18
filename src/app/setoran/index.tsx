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
import { riwayatSetoran } from "@/lib/api/dompet";
import { formatRupiah } from "@/lib/rupiah";
import type { SetoranSampah } from "@/types/dompet";

const tanggalPanjang = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function RiwayatSetoran() {
  const [terbuka, setTerbuka] = useState<number | null>(null);

  const q = useInfiniteQuery({
    queryKey: ["setoran", "riwayat"],
    queryFn: ({ pageParam }) => riwayatSetoran({ page: pageParam }),
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
        <Text style={styles.appbarTitle}>Riwayat Setoran</Text>
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat setoran…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={
            daftar.length === 0
              ? styles.kosongWrap
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => (
            <KartuSetoran
              s={item}
              terbuka={terbuka === item.id}
              onToggle={() =>
                setTerbuka((t) => (t === item.id ? null : item.id))
              }
            />
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
            <EmptyState
              icon="package"
              judul="Belum ada setoran"
              pesan="Bawa sampah terpilah Anda ke bank sampah terdekat dan tunjukkan QR nasabah. Setoran akan tercatat di sini."
              aksiLabel="Lihat QR Nasabah"
              onAksi={() => router.push("/dompet/qr" as Href)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function KartuSetoran({
  s,
  terbuka,
  onToggle,
}: {
  s: SetoranSampah;
  terbuka: boolean;
  onToggle: () => void;
}) {
  /**
   * Rincian item datang bersama daftarnya.
   *
   * Tidak ada endpoint detail setoran: `GET /dompet/setoran` sudah memuat relasi
   * `item`, jadi membukanya tidak perlu permintaan kedua. Versi sebelumnya
   * memanggil `/setoran/{id}` yang tidak pernah ada, dan setiap kartu yang
   * dibuka menampilkan galat.
   */
  const items = s.item ?? [];
  const tanggal = s.created_at ? tanggalPanjang(s.created_at) : "";

  return (
    <View style={styles.kartu}>
      <Pressable
        style={styles.kartuKepala}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Setoran ${s.kode_setoran}${tanggal ? `, ${tanggal}` : ""}, ${formatRupiah(s.total_nilai)}, ${s.status_label}. Ketuk untuk ${terbuka ? "menutup" : "melihat"} rincian`}
        accessibilityState={{ expanded: terbuka }}
      >
        <View style={styles.ikon}>
          <Feather name="package" size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kode}>{s.kode_setoran}</Text>
          <Text style={styles.tanggal}>
            {[s.bank_sampah?.nama, tanggal].filter(Boolean).join(" · ")}
          </Text>
          <Text style={styles.total}>
            {formatRupiah(s.total_nilai)}{" "}
            <Text style={styles.berat}>· {s.total_berat} kg</Text>
          </Text>
        </View>
        <Feather
          name={terbuka ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.subtext}
        />
      </Pressable>

      {terbuka && (
        <View style={styles.rincian}>
          {items.length === 0 ? (
            <Text style={styles.kosongRinci}>
              {s.status === "proses"
                ? "Sampah masih ditimbang petugas. Rincian muncul setelah setoran ditutup."
                : "Rincian item tidak tersedia untuk setoran ini."}
            </Text>
          ) : (
            items.map((it) => (
              <View key={it.id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemJenis} numberOfLines={1}>
                    {it.jenis}
                  </Text>
                  <Text style={styles.itemHitung}>
                    {it.berat} kg × {formatRupiah(it.harga_per_satuan)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>
                  {formatRupiah(it.subtotal)}
                </Text>
              </View>
            ))
          )}
          {!!s.catatan && <Text style={styles.kosongRinci}>{s.catatan}</Text>}
        </View>
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
  kosongWrap: { flexGrow: 1 },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 10,
    overflow: "hidden",
  },
  kartuKepala: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 44,
  },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  kode: { fontSize: 13, fontWeight: "700", color: colors.text },
  tanggal: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  berat: { fontSize: 12, fontWeight: "400", color: colors.subtext },
  total: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brand,
    marginTop: 2,
  },
  rincian: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  itemJenis: { fontSize: 13, fontWeight: "600", color: colors.text },
  itemHitung: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  itemSubtotal: { fontSize: 13, fontWeight: "700", color: colors.text },
  gagalBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    minHeight: 44,
  },
  gagalTeks: { flex: 1, fontSize: 12, color: colors.danger },
  kosongRinci: {
    fontSize: 12,
    color: colors.subtext,
    paddingVertical: 12,
    lineHeight: 18,
  },
});
