import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import KategoriBadge from "@/components/KategoriBadge";
import LeafletMap from "@/components/LeafletMap";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { ZOOM_TITIK } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useBottomPad } from "@/hooks/useBottomPad";
import { detailBankSampah } from "@/lib/api/fasilitas";
import { metaKategori } from "@/lib/kategoriSampah";
import { formatRupiah } from "@/lib/rupiah";
import { KATEGORI_SAMPAH } from "@/types/enums";
import type { BankSampahHarga } from "@/types/fasilitas";

async function bukaPeta(lat: number, lng: number, nama: string) {
  const geo = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(nama)})`;
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  try {
    if (await Linking.canOpenURL(geo)) {
      await Linking.openURL(geo);
      return;
    }
  } catch {
    // Skema geo: tidak dikenali perangkat ini.
  }
  await Linking.openURL(web);
}

export default function DetailBankSampah() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const pad = useBottomPad();

  /**
   * Satu permintaan untuk dua hal.
   *
   * Katalog harga ikut di dalam respons detail (§8.4), tidak ada endpoint
   * harga per unit yang terpisah. Versi sebelumnya memanggil endpoint kedua
   * yang tidak pernah ada, sehingga katalognya selalu berakhir sebagai
   * "gagal dimuat" meski datanya sebenarnya sudah ada di tangan.
   *
   * Inilah perubahan terbesar pada Resikita: harga tidak lagi berlaku
   * nasional. Menampilkannya di layar detail, bukan di dompet, memastikan
   * angka yang dilihat pengguna adalah angka yang benar-benar ia terima di
   * tempat ia menyetor.
   */
  const q = useQuery({
    queryKey: ["bank-sampah", "detail", nomor],
    queryFn: () => detailBankSampah(nomor),
    enabled: Number.isFinite(nomor),
  });

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
      <Text style={styles.appbarTitle}>Bank Sampah</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat data bank sampah…" />
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

  const bs = q.data.bank_sampah;
  const harga = q.data.harga;
  // Disimpan sebagai objek, bukan boolean: dengan boolean, TypeScript tidak
  // ikut mempersempit `latitude`/`longitude` yang bertipe `number | null`.
  const titik =
    typeof bs.latitude === "number" &&
    typeof bs.longitude === "number" &&
    Number.isFinite(bs.latitude) &&
    Number.isFinite(bs.longitude)
      ? { lat: bs.latitude, lng: bs.longitude }
      : null;

  // Dikelompokkan mengikuti urutan enum, bukan urutan yang datang dari peladen,
  // supaya susunannya sama di setiap unit yang dibuka pengguna.
  const perKategori = KATEGORI_SAMPAH.map((k) => ({
    kategori: k,
    items: harga.filter((h) => h.kategori === k),
  })).filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView contentContainerStyle={{ paddingBottom: pad }}>
        {titik && (
          <LeafletMap
            style={styles.map}
            center={titik}
            zoom={ZOOM_TITIK}
            markers={[
              { id: bs.id, lat: titik.lat, lng: titik.lng, color: "green" },
            ]}
          />
        )}

        <View style={styles.isi}>
          <Text style={styles.nama}>{bs.nama}</Text>

          {!!bs.alamat && (
            <View style={styles.baris}>
              <Feather name="map-pin" size={16} color={colors.brand} />
              <Text style={styles.barisTeks}>{bs.alamat}</Text>
            </View>
          )}

          {typeof bs.jarak_km === "number" && (
            <View style={styles.baris}>
              <Feather name="navigation" size={16} color={colors.brand} />
              <Text style={styles.barisTeks}>
                Sekitar {bs.jarak_km.toFixed(1)} km dari Anda
              </Text>
            </View>
          )}

          <Text style={styles.judulBagian}>Katalog Harga</Text>
          <Text style={styles.subBagian}>
            Harga ditetapkan unit ini dan bisa berbeda dari bank sampah lain.
          </Text>

          {perKategori.length === 0 ? (
            <Text style={styles.kosong}>
              Unit ini belum memublikasikan katalog harganya. Tanyakan langsung
              ke petugas saat menyetor.
            </Text>
          ) : (
            perKategori.map((g) => (
              <View key={g.kategori} style={styles.grup}>
                <KategoriBadge
                  kategori={g.kategori}
                  label={g.items[0]?.kategori_label}
                  ukuran="kecil"
                />
                <View style={styles.tabel}>
                  {g.items.map((h) => (
                    <BarisHarga key={h.id} h={h} />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        {titik && (
          <Pressable
            style={styles.tombolKedua}
            onPress={() => bukaPeta(titik.lat, titik.lng, bs.nama)}
            accessibilityRole="button"
            accessibilityLabel={`Buka rute ke ${bs.nama} di aplikasi peta`}
          >
            <Feather name="navigation" size={16} color={colors.brand} />
            <Text style={styles.tombolKeduaTeks}>Rute</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.tombolUtama}
          onPress={() => router.push("/dompet/qr" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Tampilkan QR nasabah untuk menyetor"
        >
          <Feather name="maximize" size={16} color={colors.white} />
          <Text style={styles.tombolUtamaTeks}>Tampilkan QR Nasabah</Text>
        </Pressable>
      </BottomBar>
    </SafeAreaView>
  );
}

function BarisHarga({ h }: { h: BankSampahHarga }) {
  // Satuannya datang dari peladen dan tidak selalu kilogram, beberapa unit
  // membeli per buah atau per lembar. Menanam "kg" di sini akan salah harga.
  const satuan = h.satuan || "kg";
  return (
    <View
      style={styles.barisHarga}
      accessible
      accessibilityLabel={`${h.jenis_sampah}, ${formatRupiah(h.harga_per_satuan)} per ${satuan}, kategori ${h.kategori_label || metaKategori(h.kategori).label}`}
    >
      <Text style={styles.jenis} numberOfLines={1}>
        {h.jenis_sampah}
      </Text>
      <Text style={styles.harga}>
        {formatRupiah(h.harga_per_satuan)}/{satuan}
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
  map: { height: 220, width: "100%" },
  isi: { padding: spacing.lg },
  nama: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  baris: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  barisTeks: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  judulBagian: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
  },
  subBagian: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  grup: { marginBottom: 18 },
  tabel: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginTop: 8,
    overflow: "hidden",
  },
  barisHarga: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  jenis: { flex: 1, fontSize: 14, color: colors.text },
  harga: { fontSize: 14, fontWeight: "700", color: colors.brand },
  kosong: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    paddingVertical: 8,
  },
  tombolUtama: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolUtamaTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  tombolKedua: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  tombolKeduaTeks: { color: colors.brand, fontWeight: "700", fontSize: 15 },
});
