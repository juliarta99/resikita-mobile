import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LeafletMap, { type LeafletMapHandle } from "@/components/LeafletMap";
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { TENGAH_NUSANTARA, ZOOM_NASIONAL } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useKeanggotaanTps } from "@/hooks/useKeanggotaanTps";
import { daftarBankSampah, daftarTps } from "@/lib/api/fasilitas";
import { deteksiPosisi, pesanGalatLokasi } from "@/lib/lokasi";
import { bukaDiPeta } from "@/lib/petaLuar";
import { formatRupiah } from "@/lib/rupiah";
import type { BankSampah, ParamsDirektori, Tps } from "@/types/fasilitas";
import type { LeafletMarker } from "@/types/peta";

type Tab = "tps" | "bank";

/** Zoom saat peta melompat ke posisi pengguna. Cukup untuk melihat satu kota. */
const ZOOM_SAYA = 13;

/**
 * Bentuk seragam untuk daftar dan penanda, apa pun tab yang aktif.
 *
 * Setiap titik **selalu** punya halaman detail. Versi sebelumnya mengambil
 * titik dari `GET /publik/peta`, yang sengaja tidak mengirim `id` — akibatnya
 * kartu fasilitas tidak bisa dibuka sama sekali dan ketukannya jatuh ke
 * aplikasi peta, sehingga halaman detail TPS beserta tombol "Gabung" praktis
 * hilang dari aplikasi. Direktori (§8) terbuka tanpa token seperti `/publik/peta`
 * dan mengirim `id`, jadi tidak ada alasan memakai yang tanpa id.
 */
type Titik = {
  /** Kunci stabil untuk daftar dan penanda peta. */
  kunci: string;
  id: number;
  nama: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  jarakKm: number | null;
  keterangan: string | null;
  /** Hanya pada tab TPS: pengguna terdaftar sebagai anggota di titik ini. */
  anggota: boolean;
  rute: Href;
};

export default function Peta() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("tps");
  const [cari, setCari] = useState("");
  const [koordinat, setKoordinat] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [galatLokasi, setGalatLokasi] = useState("");
  const [mendeteksi, setMendeteksi] = useState(false);
  const mapRef = React.useRef<LeafletMapHandle>(null);

  /**
   * Izin lokasi diminta atas ketukan pengguna, bukan otomatis saat layar dibuka.
   *
   * Peta sudah menampilkan sesuatu yang berguna tanpa izin apa pun, jadi
   * memintanya di detik pertama berarti meminta sebelum pengguna tahu untuk apa
   * — dan penolakan di titik itu biasanya permanen.
   *
   * Yang dilakukannya hanya menggeser dan memperbesar peta ke posisi pengguna,
   * lalu menandainya. Daftar fasilitas **tidak** ikut berubah.
   */
  const mintaLokasi = async () => {
    setGalatLokasi("");
    setMendeteksi(true);
    try {
      const posisi = await deteksiPosisi();
      setKoordinat(posisi);
      mapRef.current?.setView(posisi.lat, posisi.lng, ZOOM_SAYA);
    } catch (e) {
      setGalatLokasi(pesanGalatLokasi(e));
    } finally {
      setMendeteksi(false);
    }
  };

  /**
   * Satu sumber data, satu permintaan: seluruh fasilitas terdaftar (§8).
   *
   * Koordinat pengguna **sengaja tidak dikirim** ke peladen. Penyaring
   * `latitude`/`longitude`/`radius_km` menjatuhkan direktori ke galat SQL, dan
   * bahkan ketika ia bekerja, hasilnya menyembunyikan fasilitas di luar radius
   * — padahal warga yang membuka peta justru ingin tahu apa saja yang ada,
   * termasuk unit di kota sebelah yang harganya lebih baik. Lokasi kini hanya
   * mengarahkan pandangan peta, bukan memotong datanya.
   *
   * Konsekuensinya `jarak_km` tidak ikut di respons, jadi jarak tidak
   * ditampilkan. Menghitungnya sendiri di klien berarti menduplikasi rumus
   * peladen dan mengundang dua angka yang berbeda untuk hal yang sama.
   */
  const q = useQuery<(Tps | BankSampah)[]>({
    queryKey: ["direktori", tab],
    // Kembaliannya diratakan jadi larik di sini, bukan dibiarkan sebagai union
    // `Halaman<Tps> | Halaman<BankSampah>`: pada union itu TypeScript kehilangan
    // tipe elemen begitu `.map` dipanggil, dan seluruh isi kartu jatuh ke `any`.
    queryFn: async () => {
      const params: ParamsDirektori = { per_page: 50 };
      const halaman =
        tab === "tps"
          ? await daftarTps(params)
          : await daftarBankSampah(params);
      return halaman.data;
    },
  });

  /**
   * Keanggotaan TPS pengguna, untuk menandai kartunya.
   *
   * Peta adalah tempat orang memilih ke mana menyetor; tanpa penanda ini, TPS
   * tempat ia sudah terdaftar tampak persis sama dengan yang lain.
   */
  const tpsSaya = useKeanggotaanTps().data?.tps ?? null;

  const aktifQ = q;

  /**
   * Normalkan jadi larik, apa pun bentuk yang sampai.
   *
   * `queryFn` di atas sudah mengembalikan `halaman.data`, tapi cache TanStack
   * bisa memegang hasil dari bentuk sebelumnya selama sesi pengembangan, dan
   * peladen sendiri pernah mengirim daftar yang tidak berhalaman. Keduanya
   * berujung pada satu galat yang sama — `fasilitas.filter is not a function` —
   * yang mematikan seluruh tab peta, bukan sekadar mengosongkan daftarnya.
   * Penjaga ini menukar kegagalan total itu dengan daftar kosong.
   */
  const fasilitas: (Tps | BankSampah)[] = Array.isArray(q.data)
    ? q.data
    : Array.isArray((q.data as { data?: unknown } | undefined)?.data)
      ? ((q.data as unknown as { data: (Tps | BankSampah)[] }).data)
      : [];

  const titik: Titik[] = fasilitas
    // Fasilitas tanpa koordinat tidak bisa digambar di peta; ia tetap muncul di
    // daftar lewat penyaring di bawah, tapi tidak menghasilkan penanda hantu di
    // titik nol derajat di tengah Samudra Atlantik.
    .filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => {
      const tarif = tab === "tps" ? (f as Tps).tarif_bulanan : null;
      const jenisLabel = tab === "tps" ? (f as Tps).jenis_label : null;
      return {
        kunci: `${tab}-${f.id}`,
        id: f.id,
        nama: f.nama,
        alamat: f.alamat ?? f.wilayah?.nama_lengkap ?? null,
        latitude: f.latitude as number,
        longitude: f.longitude as number,
        jarakKm: f.jarak_km ?? null,
        anggota: tab === "tps" && tpsSaya?.id === f.id,
        keterangan:
          tab === "tps"
            ? tarif != null && tarif > 0
              ? `${jenisLabel ?? "TPS"} · ${formatRupiah(tarif)}/bulan`
              : `${jenisLabel ?? "TPS"} · Tanpa iuran`
            : ((f as BankSampah).jumlah_jenis_harga != null
                ? `${(f as BankSampah).jumlah_jenis_harga} jenis sampah dibeli`
                : null),
        rute: (tab === "tps"
          ? `/tps/${f.id}`
          : `/bank-sampah/${f.id}`) as Href,
      };
    });

  const kunci = cari.trim().toLowerCase();
  const tersaring = kunci
    ? titik.filter(
        (t) =>
          t.nama.toLowerCase().includes(kunci) ||
          (t.alamat ?? "").toLowerCase().includes(kunci),
      )
    : titik;

  const penanda: LeafletMarker[] = tersaring.map((t) => ({
    id: t.kunci,
    lat: t.latitude,
    lng: t.longitude,
    color: tab === "tps" ? "green" : "blue",
  }));
  if (koordinat) {
    penanda.push({ id: "saya", lat: koordinat.lat, lng: koordinat.lng, color: "amber" });
  }

  const pusat =
    koordinat ??
    (tersaring[0]
      ? { lat: tersaring[0].latitude, lng: tersaring[0].longitude }
      : TENGAH_NUSANTARA);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.kepala}>
        <Text style={styles.judul}>Peta Fasilitas</Text>
        <View style={styles.cariWrap}>
          <Feather name="search" size={18} color={colors.subtext} />
          <TextInput
            style={styles.cari}
            placeholder="Cari nama atau alamat…"
            placeholderTextColor="#9AA5B1"
            value={cari}
            onChangeText={setCari}
            accessibilityLabel="Cari fasilitas di peta"
          />
        </View>
        <View style={styles.tabs}>
          {(["tps", "bank"] as Tab[]).map((t) => {
            const aktif = tab === t;
            const label = t === "tps" ? "TPS & TPS3R" : "Bank Sampah";
            return (
              <Pressable
                key={t}
                style={[styles.tab, aktif && styles.tabAktif]}
                onPress={() => setTab(t)}
                accessibilityRole="tab"
                accessibilityLabel={`Tampilkan ${label}`}
                accessibilityState={{ selected: aktif }}
              >
                <Text style={[styles.tabTeks, aktif && { color: colors.white }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapWrap}>
        <LeafletMap
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          center={pusat}
          zoom={koordinat ? ZOOM_SAYA : ZOOM_NASIONAL}
          markers={penanda}
          /*
            Penanda di peta membuka aplikasi peta perangkat pada koordinatnya —
            bukan halaman detail. Pembagiannya disengaja: pin adalah objek
            geografis, jadi ketukannya menjawab "di mana ini?"; kartu di bawah
            adalah objek data, jadi ketukannya menjawab "apa ini?".
          */
          onMarkerPress={(id) => {
            const t = tersaring.find((x) => x.kunci === String(id));
            if (t) void bukaDiPeta(t.latitude, t.longitude, t.nama);
          }}
        />
        <Pressable
          style={styles.lokasiBtn}
          onPress={mintaLokasi}
          disabled={mendeteksi}
          accessibilityRole="button"
          accessibilityLabel="Arahkan peta ke lokasi saya"
          accessibilityState={{ busy: mendeteksi }}
        >
          <Feather
            name={mendeteksi ? "loader" : "crosshair"}
            size={18}
            color={colors.brand}
          />
        </Pressable>
      </View>

      {/*
        Titik laporan sengaja tidak ada di peta ini.
        Koordinat laporan menunjuk tempat yang bisa jadi halaman rumah
        seseorang; menyebarnya di peta terbuka mengubah alat pelaporan menjadi
        alat menunjuk tetangga. Lihat API-DOCS.md §13. Tab "Laporan" pada versi
        sebelumnya dihapus karena alasan itu, bukan karena endpointnya hilang.
      */}
      <View style={styles.daftar}>
        <View style={styles.daftarKepala}>
          <Text style={styles.daftarJudul}>
            {tab === "tps" ? "TPS & TPS3R" : "Bank Sampah"}
          </Text>
          <Text style={styles.daftarJumlah}>{tersaring.length} lokasi</Text>
        </View>

        {!!galatLokasi && !koordinat && (
          <View style={styles.izinKotak}>
            <Feather name="info" size={15} color="#8A6D1B" />
            <Text style={styles.izinTeks}>
              {galatLokasi} Daftar fasilitas di bawah tetap lengkap — lokasi
              hanya dipakai untuk mengarahkan peta.
            </Text>
          </View>
        )}

        {aktifQ.isLoading ? (
          <LoadingState pesan="Memuat lokasi…" />
        ) : aktifQ.isError ? (
          <ErrorState error={aktifQ.error} onCobaLagi={() => aktifQ.refetch()} />
        ) : (
          <FlatList
            data={tersaring}
            keyExtractor={(t) => t.kunci}
            contentContainerStyle={
              tersaring.length === 0
                ? { flexGrow: 1 }
                : { padding: spacing.md, paddingBottom: 30 }
            }
            renderItem={({ item }) => (
              /*
                Kartu selalu menuju halaman detail. Di sanalah keanggotaan TPS
                bisa didaftarkan dan katalog harga bank sampah dibaca — dua hal
                yang tidak mungkin dilakukan di aplikasi peta perangkat.
              */
              <Pressable
                style={[styles.kartu, item.anggota && styles.kartuAnggota]}
                onPress={() => router.push(item.rute)}
                accessibilityRole="button"
                accessibilityLabel={[
                  item.nama,
                  item.anggota ? "Anda anggota di sini" : null,
                  item.jarakKm != null
                    ? `${item.jarakKm.toFixed(1)} kilometer`
                    : null,
                  "Buka detail",
                ]
                  .filter(Boolean)
                  .join(", ")}
              >
                <View style={[styles.ikon, item.anggota && styles.ikonAnggota]}>
                  <Feather
                    name={
                      item.anggota ? "check" : tab === "tps" ? "home" : "shopping-bag"
                    }
                    size={18}
                    color={item.anggota ? colors.white : colors.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nama} numberOfLines={1}>
                    {item.nama}
                  </Text>
                  {!!item.alamat && (
                    <Text style={styles.alamat} numberOfLines={1}>
                      {item.alamat}
                    </Text>
                  )}
                  <View style={styles.metaBaris}>
                    {item.anggota && (
                      <View style={styles.lencanaAnggota}>
                        <Text style={styles.lencanaAnggotaTeks}>Anggota</Text>
                      </View>
                    )}
                    {item.jarakKm != null && (
                      <Text style={styles.jarak}>
                        {item.jarakKm.toFixed(1)} km
                      </Text>
                    )}
                    {!!item.keterangan && (
                      <Text style={styles.keterangan}>{item.keterangan}</Text>
                    )}
                  </View>
                </View>
                {/* Pintasan ke aplikasi peta, terpisah dari ketukan kartu supaya
                    keduanya tidak saling berebut. `stopPropagation` wajib di
                    web: tanpa itu ketukannya menggelembung ke kartu induk. */}
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    void bukaDiPeta(item.latitude, item.longitude, item.nama);
                  }}
                  hitSlop={8}
                  style={styles.rutebtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Buka lokasi ${item.nama} di aplikasi peta`}
                >
                  <Feather name="navigation" size={17} color={colors.brand} />
                </Pressable>
                <Feather name="chevron-right" size={18} color={colors.subtext} />
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="map-pin"
                judul={kunci ? "Tidak ada yang cocok" : "Belum ada fasilitas"}
                pesan={
                  kunci
                    ? "Coba kata pencarian yang lain."
                    : "Belum ada fasilitas terdaftar untuk ditampilkan."
                }
                aksiLabel={kunci ? "Hapus pencarian" : undefined}
                onAksi={kunci ? () => setCari("") : undefined}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  kepala: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    gap: 12,
  },
  judul: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 6 },
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 44,
  },
  cari: { flex: 1, color: colors.text },
  tabs: { flexDirection: "row", gap: 8 },
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
  mapWrap: { height: 240, backgroundColor: "#DDE6E2" },
  lokasiBtn: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  daftar: { flex: 1 },
  daftarKepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 8,
  },
  daftarJudul: { fontSize: 16, fontWeight: "700", color: colors.text },
  daftarJumlah: { fontSize: 12, color: colors.subtext },
  izinKotak: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FEF9E7",
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.md,
    marginBottom: 6,
  },
  izinTeks: { flex: 1, fontSize: 12, color: "#8A6D1B", lineHeight: 17 },
  kartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  // Ditandai dengan garis tepi, bukan latar berwarna: kartunya harus tetap
  // sama mudah dibaca dengan yang lain.
  kartuAnggota: { borderWidth: 1.5, borderColor: colors.brand },
  ikon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  ikonAnggota: { backgroundColor: colors.brand },
  lencanaAnggota: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  lencanaAnggotaTeks: { fontSize: 10, fontWeight: "700", color: colors.white },
  rutebtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F7F4",
  },
  nama: { fontSize: 15, fontWeight: "700", color: colors.text },
  alamat: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  metaBaris: { flexDirection: "row", gap: 12, marginTop: 6 },
  jarak: { fontSize: 12, color: colors.subtext },
  keterangan: { fontSize: 12, fontWeight: "700", color: colors.brand },
});
