import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import LeafletMap from "@/components/LeafletMap";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { ZOOM_TITIK } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useBottomPad } from "@/hooks/useBottomPad";
import { useKeanggotaanTps } from "@/hooks/useKeanggotaanTps";
import { ApiError } from "@/lib/api/error";
import { detailTps, gabungTps, keluarTps } from "@/lib/api/fasilitas";
import { confirmDialog, notify } from "@/lib/dialog";
import { bukaDiPeta } from "@/lib/petaLuar";
import { formatRupiah } from "@/lib/rupiah";
import { segarkanKeanggotaanTps } from "@/lib/tpsKeanggotaan";

/**
 * Kegagalan pada salah satu dari dua langkah perpindahan TPS.
 *
 * Perlu dibedakan karena akibatnya bagi pengguna berbeda jauh: gagal di
 * langkah `keluar` berarti keanggotaan lamanya masih utuh, gagal di langkah
 * `gabung` berarti ia sudah keluar dan kini tidak terdaftar di mana pun.
 * Pesan yang sama untuk dua keadaan itu akan menyesatkan.
 */
class GagalPindah extends Error {
  readonly langkah: "keluar" | "gabung";
  readonly sebab: unknown;

  constructor(langkah: "keluar" | "gabung", sebab: unknown) {
    super("Perpindahan keanggotaan TPS gagal.");
    this.name = "GagalPindah";
    this.langkah = langkah;
    this.sebab = sebab;
  }
}

const pesanGalat = (e: unknown, cadangan: string) =>
  e instanceof ApiError ? e.pesanUntukPengguna : cadangan;

const tanggalPanjang = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

export default function DetailTps() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const pad = useBottomPad();

  const q = useQuery({
    queryKey: ["tps", "detail", nomor],
    queryFn: () => detailTps(nomor),
    enabled: Number.isFinite(nomor),
  });

  /**
   * Keanggotaan diambil dari peladen, bukan diingat selama sesi.
   *
   * Versi sebelumnya hanya menyimpan `baruBergabung` di state layar ini,
   * dengan catatan bahwa kontrak tidak punya endpoint "TPS saya". Catatan itu
   * sudah tidak benar: `GET /tps/keanggotaan-saya` (§13.1) ada dan
   * mengembalikan TPS beserta tagihannya. Akibat dari asumsi lama itu nyata,
   * setelah aplikasi ditutup, layar ini kembali menawarkan "Daftar Jadi
   * Anggota" kepada orang yang sudah terdaftar, dan peladenlah yang harus
   * menolaknya.
   */
  const anggotaQ = useKeanggotaanTps();
  const keanggotaan = anggotaQ.data ?? null;
  const tpsSaya = keanggotaan?.tps ?? null;
  const anggotaDiSini = !!tpsSaya && tpsSaya.id === nomor;
  const anggotaDiTempatLain = !!tpsSaya && tpsSaya.id !== nomor;

  const namaTps = q.data?.nama ?? "TPS ini";

  const setelahBerubah = async (judul: string, pesan: string) => {
    await segarkanKeanggotaanTps(qc);
    notify(judul, pesan);
  };

  const gabung = useMutation({
    mutationFn: () => gabungTps(nomor),
    onSuccess: () =>
      setelahBerubah(
        "Anda terdaftar",
        `Anda kini anggota ${namaTps}. Tagihan iuran, bila ada, muncul di menu Tagihan Iuran.`,
      ),
    onError: (e: unknown) =>
      notify(
        "Gagal mendaftar",
        pesanGalat(e, "Tidak dapat mendaftar. Coba lagi."),
      ),
  });

  const keluar = useMutation({
    mutationFn: keluarTps,
    onSuccess: () =>
      setelahBerubah(
        "Keanggotaan dihentikan",
        `Anda bukan lagi anggota ${namaTps}. Anda bisa mendaftar di TPS lain kapan saja.`,
      ),
    onError: (e: unknown) =>
      notify(
        "Gagal keluar",
        pesanGalat(
          e,
          "Keanggotaan tidak dapat dihentikan. Coba lagi sebentar lagi.",
        ),
      ),
  });

  /**
   * Pindah TPS: keluar dari yang lama, lalu daftar di sini.
   *
   * Peladen menolak pendaftaran selama pengguna masih terdaftar di TPS lain
   * (§13.2, `422`), jadi dua langkah ini memang harus berurutan. Yang
   * diputuskan di sini hanya urutannya, syarat kelayakannya, termasuk
   * tunggakan iuran yang menahan langkah `keluar`, tetap milik peladen.
   */
  const pindah = useMutation({
    mutationFn: async () => {
      try {
        await keluarTps();
      } catch (e) {
        throw new GagalPindah("keluar", e);
      }
      try {
        return await gabungTps(nomor);
      } catch (e) {
        throw new GagalPindah("gabung", e);
      }
    },
    onSuccess: () =>
      setelahBerubah(
        "Perpindahan berhasil",
        `Keanggotaan Anda di ${tpsSaya?.nama ?? "TPS sebelumnya"} dihentikan dan Anda kini anggota ${namaTps}.`,
      ),
    onError: async (e: unknown) => {
      // Apa pun langkah yang gagal, keadaan di peladen sudah mungkin berubah.
      await segarkanKeanggotaanTps(qc);

      if (!(e instanceof GagalPindah)) {
        notify(
          "Gagal pindah",
          pesanGalat(e, "Perpindahan tidak dapat diproses."),
        );
        return;
      }

      if (e.langkah === "keluar") {
        notify(
          "Belum bisa pindah",
          `${pesanGalat(e.sebab, "Keanggotaan lama tidak dapat dihentikan.")}\n\nKeanggotaan Anda di ${tpsSaya?.nama ?? "TPS sebelumnya"} masih berjalan.`,
        );
        return;
      }

      notify(
        "Pendaftaran gagal",
        `Keanggotaan Anda di ${tpsSaya?.nama ?? "TPS sebelumnya"} sudah dihentikan, tetapi pendaftaran di ${namaTps} gagal: ${pesanGalat(e.sebab, "penyebabnya tidak diketahui")}\n\nSaat ini Anda tidak terdaftar di TPS mana pun. Coba daftar lagi.`,
      );
    },
  });

  const sibuk = gabung.isPending || keluar.isPending || pindah.isPending;

  const konfirmasiKeluar = async () => {
    const ya = await confirmDialog(
      "Keluar dari keanggotaan?",
      `Anda tidak lagi terdaftar sebagai anggota ${namaTps}. Tagihan iuran yang belum lunas harus dilunasi lebih dulu.`,
      "Keluar",
    );
    if (ya) keluar.mutate();
  };

  const konfirmasiPindah = async () => {
    const ya = await confirmDialog(
      "Pindah ke TPS ini?",
      `Keanggotaan Anda di ${tpsSaya?.nama ?? "TPS sebelumnya"} akan dihentikan lebih dulu, lalu Anda didaftarkan di ${namaTps}. Tagihan yang belum lunas di TPS lama harus diselesaikan dulu.`,
      "Pindah",
    );
    if (ya) pindah.mutate();
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
      <Text style={styles.appbarTitle}>Detail TPS</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat data TPS…" />
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

  const tps = q.data;
  // Objek, bukan boolean: `latitude`/`longitude` bertipe `number | null` dan
  // hanya bentuk ini yang ikut mempersempitnya di mata TypeScript.
  const titik =
    typeof tps.latitude === "number" && typeof tps.longitude === "number"
      ? { lat: tps.latitude, lng: tps.longitude }
      : null;
  const tarif = tps.tarif_bulanan;
  const bergabungSejak = tanggalPanjang(keanggotaan?.bergabung_at ?? null);

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
              { id: tps.id, lat: titik.lat, lng: titik.lng, color: "green" },
            ]}
          />
        )}

        <View style={styles.isi}>
          <View style={styles.jenis}>
            <Text style={styles.jenisTeks}>{tps.jenis_label}</Text>
          </View>
          <Text style={styles.nama}>{tps.nama}</Text>

          {/*
            Status keanggotaan diletakkan di atas segalanya, sebelum alamat dan
            tarif. Pertanyaan pertama orang yang membuka layar ini bukan "di
            mana", melainkan "apakah saya terdaftar di sini".
          */}
          {anggotaDiSini && (
            <View style={styles.statusAnggota}>
              <Feather name="check-circle" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusJudul}>Anda anggota TPS ini</Text>
                {!!bergabungSejak && (
                  <Text style={styles.statusSub}>
                    Terdaftar sejak {bergabungSejak}
                  </Text>
                )}
              </View>
            </View>
          )}

          {anggotaDiTempatLain && (
            <Pressable
              style={styles.statusLain}
              onPress={() => router.push(`/tps/${tpsSaya.id}` as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Anda terdaftar di ${tpsSaya.nama}. Buka detailnya`}
            >
              <Feather name="info" size={18} color="#8A6D1B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLainJudul}>
                  Anda terdaftar di {tpsSaya.nama}
                </Text>
                <Text style={styles.statusLainSub}>
                  Satu warga hanya bisa menjadi anggota satu TPS. Untuk pindah
                  ke sini, keanggotaan itu dihentikan lebih dulu.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#8A6D1B" />
            </Pressable>
          )}

          {!!tps.alamat && (
            <View style={styles.baris}>
              <Feather name="map-pin" size={16} color={colors.brand} />
              <Text style={styles.barisTeks}>{tps.alamat}</Text>
            </View>
          )}

          <View style={styles.baris}>
            <Feather name="credit-card" size={16} color={colors.brand} />
            <Text style={styles.barisTeks}>
              {tps.is_berbayar && tarif != null
                ? `Iuran ${formatRupiah(tarif)} per bulan`
                : "Tidak memungut iuran"}
            </Text>
          </View>

          {/* Penjelasan siap tampil dari peladen, jangan dirangkai sendiri,
              sebutannya harus sama dengan yang dibaca warga di web. */}
          {!!tps.jenis_deskripsi && (
            <View style={styles.baris}>
              <Feather name="info" size={16} color={colors.brand} />
              <Text style={styles.barisTeks}>{tps.jenis_deskripsi}</Text>
            </View>
          )}

          {typeof tps.jarak_km === "number" && (
            <View style={styles.baris}>
              <Feather name="navigation" size={16} color={colors.brand} />
              <Text style={styles.barisTeks}>
                Sekitar {tps.jarak_km.toFixed(1)} km dari Anda
              </Text>
            </View>
          )}

          {titik && (
            <Pressable
              style={styles.navigasi}
              onPress={() => void bukaDiPeta(titik.lat, titik.lng, tps.nama)}
              accessibilityRole="button"
              accessibilityLabel={`Buka rute ke ${tps.nama} di aplikasi peta`}
            >
              <Feather name="navigation" size={16} color={colors.brand} />
              <Text style={styles.navigasiTeks}>Buka di Aplikasi Peta</Text>
            </Pressable>
          )}

          {/* Tagihan hanya relevan bagi anggota TPS ini; menawarkannya kepada
              orang lain berarti mengirim mereka ke daftar yang pasti kosong. */}
          {anggotaDiSini && (
            <Pressable
              style={styles.iuranTaut}
              onPress={() => router.push("/tps/iuran" as Href)}
              accessibilityRole="button"
              accessibilityLabel="Lihat tagihan iuran saya"
            >
              <Feather name="file-text" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.iuranJudul}>Tagihan Iuran</Text>
                <Text style={styles.iuranSub}>
                  Lihat dan bayar tagihan iuran keanggotaan Anda.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.subtext} />
            </Pressable>
          )}
        </View>
      </ScrollView>

      <BottomBar>
        <AksiKeanggotaan
          masuk={!!user}
          memuat={anggotaQ.isLoading}
          sibuk={sibuk}
          anggotaDiSini={anggotaDiSini}
          anggotaDiTempatLain={anggotaDiTempatLain}
          nama={tps.nama}
          namaLama={tpsSaya?.nama ?? null}
          onMasuk={() => router.push("/login" as Href)}
          onDaftar={() => gabung.mutate()}
          onKeluar={konfirmasiKeluar}
          onPindah={konfirmasiPindah}
        />
      </BottomBar>
    </SafeAreaView>
  );
}

/**
 * Tombol tunggal di bilah bawah, isinya mengikuti keadaan keanggotaan.
 *
 * Empat keadaan, satu tombol: belum masuk, sudah anggota di sini, anggota di
 * tempat lain, dan belum jadi anggota mana pun. Menampilkan semuanya sekaligus
 * akan memberi pengguna pilihan yang pasti ditolak peladen.
 */
function AksiKeanggotaan({
  masuk,
  memuat,
  sibuk,
  anggotaDiSini,
  anggotaDiTempatLain,
  nama,
  namaLama,
  onMasuk,
  onDaftar,
  onKeluar,
  onPindah,
}: {
  masuk: boolean;
  memuat: boolean;
  sibuk: boolean;
  anggotaDiSini: boolean;
  anggotaDiTempatLain: boolean;
  nama: string;
  namaLama: string | null;
  onMasuk: () => void;
  onDaftar: () => void;
  onKeluar: () => void;
  onPindah: () => void;
}) {
  if (!masuk) {
    return (
      <Pressable
        style={styles.tombolUtama}
        onPress={onMasuk}
        accessibilityRole="button"
        accessibilityLabel="Masuk untuk mendaftar jadi anggota"
      >
        <Text style={styles.tombolUtamaTeks}>Masuk untuk Mendaftar</Text>
      </Pressable>
    );
  }

  // Status keanggotaan belum diketahui: menampilkan "Daftar" di sini berisiko
  // menawarkan tindakan yang justru salah bagi anggota yang sudah terdaftar.
  if (memuat) {
    return (
      <View style={styles.tombolMemuat}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (anggotaDiSini) {
    return (
      <Pressable
        style={[styles.tombolKeluar, sibuk && { opacity: 0.6 }]}
        onPress={onKeluar}
        disabled={sibuk}
        accessibilityRole="button"
        accessibilityLabel={`Keluar dari keanggotaan ${nama}`}
        accessibilityState={{ busy: sibuk, disabled: sibuk }}
      >
        {sibuk ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Feather name="log-out" size={16} color={colors.danger} />
            <Text style={styles.tombolKeluarTeks}>Keluar dari Keanggotaan</Text>
          </>
        )}
      </Pressable>
    );
  }

  const pindah = anggotaDiTempatLain;

  return (
    <Pressable
      style={[styles.tombolUtama, sibuk && { opacity: 0.6 }]}
      onPress={pindah ? onPindah : onDaftar}
      disabled={sibuk}
      accessibilityRole="button"
      accessibilityLabel={
        pindah
          ? `Pindah keanggotaan dari ${namaLama ?? "TPS sebelumnya"} ke ${nama}`
          : `Daftar jadi anggota ${nama}`
      }
      accessibilityState={{ busy: sibuk, disabled: sibuk }}
    >
      {sibuk ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.tombolUtamaTeks}>
          {pindah ? "Pindah ke TPS Ini" : "Daftar Jadi Anggota"}
        </Text>
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
  map: { height: 220, width: "100%" },
  isi: { padding: spacing.lg },
  jenis: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "#E2E8F0",
  },
  jenisTeks: { fontSize: 11, fontWeight: "700", color: "#475569" },
  nama: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginTop: 10,
    marginBottom: 14,
  },
  statusAnggota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#DCF3EA",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  statusJudul: { fontSize: 14, fontWeight: "700", color: colors.brand },
  statusSub: { fontSize: 12, color: colors.brand, marginTop: 2 },
  statusLain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF9E7",
    borderWidth: 1,
    borderColor: "#F5E6A8",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
    minHeight: 44,
  },
  statusLainJudul: { fontSize: 14, fontWeight: "700", color: "#8A6D1B" },
  statusLainSub: {
    fontSize: 12,
    color: "#8A6D1B",
    marginTop: 3,
    lineHeight: 17,
  },
  baris: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  barisTeks: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  navigasi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    marginTop: 6,
  },
  navigasiTeks: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  iuranTaut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  iuranJudul: { fontSize: 14, fontWeight: "700", color: colors.text },
  iuranSub: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    lineHeight: 17,
  },
  tombolUtama: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolUtamaTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  tombolMemuat: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolKeluar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  tombolKeluarTeks: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
