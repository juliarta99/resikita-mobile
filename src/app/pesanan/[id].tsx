import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { useBottomPad } from "@/hooks/useBottomPad";
import { ApiError } from "@/lib/api/error";
import {
  bayarUlangPesanan,
  detailPesanan,
  terimaPesanan,
} from "@/lib/api/pesanan";
import { confirmDialog, notify } from "@/lib/dialog";
import { reorderItems } from "@/lib/reorder";
import { formatRupiah } from "@/lib/rupiah";
import { metaStatusPesanan } from "@/lib/statusPesanan";

const waktuLengkap = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function DetailPesanan() {
  // Segmen rutenya bernama `[id]`, tapi nilainya adalah `kode` pesanan
  // (mis. ORD-202608-000412) — seluruh endpoint turunannya memakai kode.
  const { id: kode } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const pad = useBottomPad();
  const [memuatUlang, setMemuatUlang] = useState(false);

  const q = useQuery({
    queryKey: ["pesanan", "detail", kode],
    queryFn: () => detailPesanan(kode),
    enabled: !!kode,
    /**
     * Status pembayaran hanya berubah lewat callback Midtrans ke peladen (§17),
     * dan callback itu bisa datang beberapa detik setelah pengguna menutup
     * halaman Snap. Selama pesanan masih menunggu bayar, layar menanyakannya
     * ulang berkala; begitu statusnya bergerak, polling berhenti sendiri.
     */
    refetchInterval: (query) =>
      query.state.data?.status === "menunggu_bayar" ? 5_000 : false,
  });

  const terima = useMutation({
    mutationFn: () => terimaPesanan(kode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pesanan"] });
      notify(
        "Terima kasih",
        "Pesanan ditandai diterima. Anda bisa memberi ulasan sekarang.",
      );
    },
    onError: (e: unknown) =>
      notify(
        "Gagal",
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Tidak dapat menandai pesanan diterima.",
      ),
  });

  /**
   * Terbitkan snap token baru untuk pesanan yang belum dibayar.
   *
   * Perlu karena checkout lintas toko menghasilkan beberapa pesanan sekaligus
   * dan hanya token pesanan pertama yang langsung dibuka; sisanya dilunasi dari
   * layar ini. Token yang lama juga bisa kedaluwarsa tanpa peladen mengirim
   * tanggal kedaluwarsanya — jadi jalannya selalu minta token baru.
   */
  const bayarUlang = useMutation({
    mutationFn: () => bayarUlangPesanan(kode),
    onSuccess: (d) =>
      router.push({
        pathname: "/bayar",
        params: { snap_token: d.snap_token, kode, title: "Pembayaran" },
      }),
    onError: (e: unknown) =>
      notify(
        "Gagal",
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Tidak dapat membuka pembayaran. Coba lagi.",
      ),
  });

  const beliLagi = async () => {
    if (!q.data) return;
    setMemuatUlang(true);
    try {
      const hasil = await reorderItems(q.data.item ?? []);
      if (hasil.ditambah === 0) {
        notify(
          "Tidak ada yang bisa dibeli",
          "Semua produk pada pesanan ini sudah tidak tersedia.",
        );
        return;
      }
      notify(
        "Keranjang diisi ulang",
        hasil.dilewati > 0
          ? `${hasil.ditambah} produk masuk keranjang. ${hasil.dilewati} produk dilewati karena sudah tidak tersedia.`
          : `${hasil.ditambah} produk masuk keranjang.`,
      );
      router.push("/keranjang" as Href);
    } finally {
      setMemuatUlang(false);
    }
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
      <Text style={styles.appbarTitle}>Detail Pesanan</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat pesanan…" />
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const p = q.data;
  const s = metaStatusPesanan(p.status);
  const item = p.item ?? [];
  // Peladen tidak mengirim batas waktu pembayaran, jadi tidak ada yang bisa
  // dibandingkan dengan jam perangkat. Yang menentukan hanyalah statusnya;
  // token yang sudah tidak berlaku ditukar lewat `bayar-ulang`.
  const belumDibayar = p.status === "menunggu_bayar";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }}
      >
        <View style={styles.kepala}>
          <Text style={styles.kode}>{p.kode}</Text>
          <View style={[styles.status, { backgroundColor: s.bg }]}>
            <Feather name={s.icon} size={13} color={s.fg} />
            <Text style={[styles.statusTeks, { color: s.fg }]}>{s.label}</Text>
          </View>
        </View>
        <Text style={styles.waktu}>Dibuat {waktuLengkap(p.created_at)}</Text>

        {belumDibayar && (
          <View style={styles.peringatan}>
            <Feather name="alert-triangle" size={16} color="#B91C1C" />
            <Text style={styles.peringatanTeks}>
              Pesanan ini belum dibayar. Selesaikan pembayarannya agar penjual
              bisa mulai mengemas.
            </Text>
          </View>
        )}

        {!!p.umkm && (
          <Pressable
            style={styles.toko}
            onPress={() => router.push(`/toko/${p.umkm!.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`Kunjungi toko ${p.umkm.nama}`}
          >
            <Feather name="shopping-bag" size={16} color={colors.brand} />
            <Text style={styles.tokoNama} numberOfLines={1}>
              {p.umkm.nama}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.subtext} />
          </Pressable>
        )}

        <View style={styles.kartu}>
          <Text style={styles.kartuJudul}>Produk</Text>
          {/*
            Nama, harga, dan subtotal baris pesanan adalah **snapshot** saat
            pesanan dibuat; relasi `produk` hanya dipakai untuk fotonya. Membaca
            nama dari relasi akan menampilkan nama produk hari ini, bukan yang
            dibeli — dan kosong sama sekali kalau produknya sudah dihapus.
          */}
          {item.length === 0 ? (
            <Text style={styles.kosong}>
              Rincian produk pesanan ini tidak tersedia.
            </Text>
          ) : (
            item.map((it) => (
              <View key={it.id} style={styles.item}>
                <View style={styles.gambar}>
                  {it.produk?.foto_utama_url ? (
                    <Image
                      source={{ uri: it.produk.foto_utama_url }}
                      style={styles.gambarIsi}
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <Feather name="image" size={20} color="#CBD5E1" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nama} numberOfLines={2}>
                    {it.nama}
                  </Text>
                  <Text style={styles.rincian}>
                    {it.qty} × {formatRupiah(it.harga)}
                  </Text>
                </View>
                <Text style={styles.subtotal}>{formatRupiah(it.subtotal)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.kartu}>
          <Text style={styles.kartuJudul}>Rincian Pembayaran</Text>
          <BarisNilai label="Subtotal" nilai={formatRupiah(p.subtotal)} />
          <BarisNilai label="Ongkos kirim" nilai={formatRupiah(p.ongkir)} />
          <View style={styles.pemisah} />
          <BarisNilai label="Total" nilai={formatRupiah(p.total)} tebal />
        </View>

        <View style={styles.kartu}>
          <Text style={styles.kartuJudul}>Pengiriman</Text>
          <Text style={styles.penerima}>{p.nama_penerima}</Text>
          <Text style={styles.alamat}>{p.phone_penerima}</Text>
          <Text style={styles.alamat}>{p.alamat_kirim}</Text>
          {!!p.kurir && (
            <Text style={styles.kurir}>
              {p.kurir.toUpperCase()}
              {p.layanan_kurir ? ` · ${p.layanan_kurir}` : ""}
            </Text>
          )}
          {!!p.no_resi && (
            <View style={styles.resi}>
              <Text style={styles.resiLabel}>Nomor resi</Text>
              <Text style={styles.resiNomor} selectable>
                {p.no_resi}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        {belumDibayar ? (
          <Pressable
            style={styles.tombolUtama}
            onPress={() => {
              // Token yang masih ada dipakai langsung; kalau tidak ada — mis.
              // pesanan kedua dari checkout lintas toko — mintakan yang baru.
              if (p.snap_token) {
                router.push({
                  pathname: "/bayar",
                  params: {
                    snap_token: p.snap_token,
                    kode: p.kode,
                    title: "Pembayaran",
                  },
                });
                return;
              }
              bayarUlang.mutate();
            }}
            disabled={bayarUlang.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Bayar sekarang, total ${formatRupiah(p.total)}`}
            accessibilityState={{ busy: bayarUlang.isPending }}
          >
            {bayarUlang.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="credit-card" size={17} color={colors.white} />
                <Text style={styles.tombolUtamaTeks}>Bayar Sekarang</Text>
              </>
            )}
          </Pressable>
        ) : p.status === "dikirim" ? (
          <Pressable
            style={styles.tombolUtama}
            onPress={async () => {
              const yakin = await confirmDialog(
                "Konfirmasi penerimaan",
                "Pastikan barang sudah Anda terima dan sesuai. Dana akan diteruskan ke penjual setelah ini.",
                "Sudah Diterima",
              );
              if (yakin) terima.mutate();
            }}
            disabled={terima.isPending}
            accessibilityRole="button"
            accessibilityLabel="Tandai pesanan sudah diterima"
            accessibilityState={{ busy: terima.isPending }}
          >
            {terima.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="check" size={17} color={colors.white} />
                <Text style={styles.tombolUtamaTeks}>Pesanan Diterima</Text>
              </>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              style={styles.tombolKedua}
              onPress={beliLagi}
              disabled={memuatUlang}
              accessibilityRole="button"
              accessibilityLabel="Beli lagi produk pada pesanan ini"
              accessibilityState={{ busy: memuatUlang }}
            >
              {memuatUlang ? (
                <ActivityIndicator color={colors.brand} size="small" />
              ) : (
                <Text style={styles.tombolKeduaTeks}>Beli Lagi</Text>
              )}
            </Pressable>
            {/* Aturan transisi milik peladen — `bisa_diulas`, bukan status. */}
            {p.bisa_diulas && (
              <Pressable
                style={styles.tombolUtama}
                onPress={() => router.push(`/ulasan/${p.kode}` as Href)}
                accessibilityRole="button"
                accessibilityLabel="Beri ulasan untuk pesanan ini"
              >
                <Feather name="star" size={17} color={colors.white} />
                <Text style={styles.tombolUtamaTeks}>Beri Ulasan</Text>
              </Pressable>
            )}
          </>
        )}
      </BottomBar>
    </SafeAreaView>
  );
}

function BarisNilai({
  label,
  nilai,
  tebal,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
}) {
  return (
    <View style={styles.barisNilai}>
      <Text style={[styles.barisLabel, tebal && styles.tebal]}>{label}</Text>
      <Text style={[styles.barisAngka, tebal && styles.tebalBesar]}>
        {nilai}
      </Text>
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
  kepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kode: { fontSize: 16, fontWeight: "800", color: colors.text },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  waktu: { fontSize: 12, color: colors.subtext, marginTop: 6 },
  peringatan: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 14,
  },
  peringatanTeks: { flex: 1, color: "#7F1D1D", fontSize: 13, lineHeight: 19 },
  toko: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginTop: 16,
    minHeight: 48,
  },
  tokoNama: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  kosong: { fontSize: 13, color: colors.subtext, lineHeight: 19 },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  kartuJudul: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  item: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 12 },
  gambar: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambarIsi: { width: "100%", height: "100%" },
  nama: { fontSize: 14, fontWeight: "600", color: colors.text },
  rincian: { fontSize: 12, color: colors.subtext, marginTop: 3 },
  subtotal: { fontSize: 14, fontWeight: "700", color: colors.text },
  barisNilai: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  barisLabel: { fontSize: 14, color: colors.subtext },
  barisAngka: { fontSize: 14, color: colors.text, fontWeight: "600" },
  tebal: { color: colors.text, fontWeight: "700" },
  tebalBesar: { fontSize: 17, fontWeight: "800", color: colors.brand },
  pemisah: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  penerima: { fontSize: 14, fontWeight: "700", color: colors.text },
  alamat: { fontSize: 13, color: colors.subtext, marginTop: 4, lineHeight: 19 },
  kurir: { fontSize: 13, color: colors.text, marginTop: 8, fontWeight: "600" },
  resi: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  resiLabel: { fontSize: 12, color: colors.subtext },
  resiNomor: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tombolUtama: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolUtamaTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  tombolKedua: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  tombolKeduaTeks: { color: colors.brand, fontWeight: "700", fontSize: 15 },
});
