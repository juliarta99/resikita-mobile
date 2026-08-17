import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { type Href, router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LeafletMap, { type LeafletMapHandle } from "@/components/LeafletMap";
import { PesanGalat } from "@/components/ui";
import VoiceInput from "@/components/VoiceInput";
import { TENGAH_NUSANTARA, ZOOM_NASIONAL, ZOOM_TITIK } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useGalatForm } from "@/hooks/useGalatForm";
import { buatLaporan, cekDuplikat, kategoriLaporan } from "@/lib/api/laporan";
import { resolusiWilayah } from "@/lib/api/wilayah";
import { notify } from "@/lib/dialog";
import { duplikatSementara } from "@/lib/duplikatSementara";
import { alamatDariKoordinat } from "@/lib/geo";
import { deteksiPosisi, pesanGalatLokasi } from "@/lib/lokasi";
import type { SumberInput } from "@/types/enums";

/** Kontrak mengizinkan lima foto per laporan (§9.5). */
const MAKS_FOTO = 5;

type Koordinat = { lat: number; lng: number };

export default function BuatLaporan() {
  const { user } = useAuth();

  const [fotos, setFotos] = useState<string[]>([]);
  const [coord, setCoord] = useState<Koordinat | null>(null);
  const [alamat, setAlamat] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [sumber, setSumber] = useState<SumberInput>("ketik");
  const [gabungKe, setGabungKe] = useState<{
    id: number;
    tiket: string;
  } | null>(null);
  const [galatLokasi, setGalatLokasi] = useState("");
  const [mendeteksi, setMendeteksi] = useState(false);
  const galat = useGalatForm();
  const mapRef = React.useRef<LeafletMapHandle>(null);

  const pusatPeta = coord ?? TENGAH_NUSANTARA;

  const katQ = useQuery({
    queryKey: ["laporan", "kategori"],
    queryFn: kategoriLaporan,
    staleTime: 30 * 60_000,
  });
  const kategori = katQ.data ?? [];
  const kategoriNama = kategori.find((k) => k.id === kategoriId)?.nama;

  /**
   * Wilayah yang terdeteksi dari koordinat, ditampilkan sebelum kirim.
   *
   * Logikanya sama persis dengan yang dipakai peladen saat laporan disimpan,
   * jadi apa yang dilihat pelapor tidak mungkin berbeda dari apa yang tersimpan
   *, dan kalau titiknya meleset, ia bisa membetulkannya sekarang, bukan
   * setelah laporannya nyasar ke dinas kabupaten sebelah.
   */
  const wilayahQ = useQuery({
    queryKey: ["wilayah", "resolusi", coord?.lat, coord?.lng],
    queryFn: () => resolusiWilayah(coord!.lat, coord!.lng),
    enabled: !!coord,
    staleTime: Infinity,
  });

  /**
   * Kandidat laporan kembar di sekitar titik.
   *
   * `kategori_id` ikut dikirim bila sudah dipilih, ia mempersempit kandidat ke
   * masalah yang benar-benar sejenis, sehingga tumpukan sampah tidak ditawarkan
   * digabung dengan laporan saluran tersumbat yang kebetulan di seberang jalan.
   */
  const duplikatQ = useQuery({
    queryKey: ["laporan", "duplikat", coord?.lat, coord?.lng, kategoriId],
    queryFn: () =>
      cekDuplikat({
        latitude: coord!.lat,
        longitude: coord!.lng,
        ...(kategoriId ? { kategori_id: kategoriId } : {}),
      }),
    enabled: !!coord,
    staleTime: 60_000,
  });

  // Ambil kembali pilihan gabung setelah pengguna kembali dari layar duplikat.
  useFocusEffect(
    useCallback(() => {
      const pilihan = duplikatSementara.yangDipilih();
      setGabungKe(pilihan ? { id: pilihan.id, tiket: pilihan.tiket } : null);
    }, []),
  );

  const setDariKoordinat = async (lat: number, lng: number, geser = false) => {
    setCoord({ lat, lng });
    if (geser) mapRef.current?.setView(lat, lng, ZOOM_TITIK);
    setGeoLoading(true);
    try {
      setAlamat(await alamatDariKoordinat(lat, lng));
    } finally {
      setGeoLoading(false);
    }
  };

  /**
   * Deteksi titik dari GPS.
   *
   * Kegagalannya ditampilkan **di layar, tepat di bawah tombolnya**, bukan
   * lewat dialog. Sebabnya beragam (izin ditolak, GPS mati, halaman dibuka lewat
   * http di alamat IP lokal sehingga peramban menolak geolokasi), dan pesan yang
   * menetap bisa dibaca ulang sambil pengguna membetulkan keadaannya. Dialog
   * yang langsung ditutup hanya menyisakan tombol yang tampak tidak berfungsi.
   */
  const deteksiLokasi = async () => {
    setGalatLokasi("");
    setMendeteksi(true);
    try {
      const posisi = await deteksiPosisi();
      await setDariKoordinat(posisi.lat, posisi.lng, true);
    } catch (e) {
      setGalatLokasi(pesanGalatLokasi(e));
    } finally {
      setMendeteksi(false);
    }
  };

  const ambilFoto = async (sumberFoto: "kamera" | "galeri") => {
    const izin =
      sumberFoto === "kamera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      notify("Izin ditolak", "Beri izin akses untuk menambah foto bukti.");
      return;
    }
    const hasil =
      sumberFoto === "kamera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.6,
            mediaTypes: ["images"],
          });
    if (!hasil.canceled && hasil.assets[0]) {
      setFotos((f) => [...f, hasil.assets[0].uri].slice(0, MAKS_FOTO));
    }
  };

  const kirim = useMutation({
    mutationFn: () =>
      buatLaporan(
        {
          kategori_id: kategoriId!,
          judul: kategoriNama ?? "Laporan Sampah",
          deskripsi: deskripsi.trim(),
          deskripsi_sumber: sumber,
          latitude: coord!.lat,
          longitude: coord!.lng,
          alamat: alamat.trim() || undefined,
          gabung_ke_id: gabungKe?.id,
        },
        fotos,
      ),
    onSuccess: (hasil) => {
      duplikatSementara.bersihkan();
      /**
       * Penanggung jawab ditampilkan apa adanya dari peladen. Inilah yang
       * membuat alur kewenangan terasa transparan alih-alih seperti kotak hitam
       *, pelapor tahu laporannya mendarat di meja siapa, dan kenapa.
       */
      const pj = hasil.penanggung_jawab;
      const rincian = [pj?.tipe_label, pj?.alasan_label]
        .filter(Boolean)
        .join(" · ");
      notify(
        `Terkirim · ${hasil.tiket}`,
        pj?.butuh_pendampingan
          ? "Wilayah Anda belum bergabung di Resikita, jadi laporan ini ditangani Fasilitator Wilayah dan diteruskan ke dinas setempat."
          : rincian
            ? `Laporan diteruskan ke ${rincian}.`
            : "Laporan Anda sudah tercatat.",
      );
      router.replace("/lapor/riwayat" as Href);
    },
    onError: (e: unknown) =>
      galat.tangani(
        e,
        "Laporan gagal dikirim. Periksa koneksi Anda lalu ulangi.",
        {
          // Peladen melaporkan koordinat pada `latitude`/`longitude`; di layar ini
          // keduanya satu penanda titik di peta.
          latitude: "lokasi",
          longitude: "lokasi",
          "foto.0": "foto",
        },
      ),
  });

  const submit = () => {
    galat.bersihkan();
    if (fotos.length < 1)
      return galat.tandai("foto", "Unggah minimal satu foto bukti.");
    if (!coord) return galat.tandai("lokasi", "Tandai lokasi laporan di peta.");
    if (!kategoriId)
      return galat.tandai("kategori_id", "Pilih kategori masalah.");
    if (deskripsi.trim().length < 10)
      return galat.tandai(
        "deskripsi",
        "Jelaskan sedikit lebih rinci, minimal 10 karakter.",
      );
    kirim.mutate();
  };

  const wilayah = wilayahQ.data;
  const adaDuplikat = duplikatQ.data?.ada_kandidat && !gabungKe;

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
        <Text style={styles.appbarTitle}>Buat Laporan</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <PesanGalat pesan={galat.umum} />

          {/* Foto */}
          <Text style={[styles.label, !!galat.field.foto && styles.labelGalat]}>
            Foto Bukti <Text style={styles.wajib}>*</Text>
          </Text>
          <View style={styles.fotoRow}>
            {fotos.map((uri, i) => (
              <View key={uri} style={styles.fotoBox}>
                <Image
                  source={{ uri }}
                  style={styles.foto}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={`Foto bukti ke-${i + 1}`}
                />
                <Pressable
                  style={styles.fotoHapus}
                  onPress={() => setFotos((f) => f.filter((u) => u !== uri))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Hapus foto ke-${i + 1}`}
                >
                  <Feather name="x" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>

          {fotos.length < MAKS_FOTO && (
            <View style={styles.fotoAksi}>
              {/*
                Dua tombol terpisah, bukan satu dialog pilihan. `Alert.alert`
                bertombol tidak menampilkan tombolnya di web, pengguna menekan
                "Tambah Foto" dan tidak terjadi apa pun.
              */}
              <Pressable
                style={styles.fotoTombol}
                onPress={() => ambilFoto("kamera")}
                accessibilityRole="button"
                accessibilityLabel="Ambil foto dengan kamera"
              >
                <Feather name="camera" size={18} color={colors.brand} />
                <Text style={styles.fotoTombolTeks}>Kamera</Text>
              </Pressable>
              <Pressable
                style={styles.fotoTombol}
                onPress={() => ambilFoto("galeri")}
                accessibilityRole="button"
                accessibilityLabel="Pilih foto dari galeri"
              >
                <Feather name="image" size={18} color={colors.brand} />
                <Text style={styles.fotoTombolTeks}>Galeri</Text>
              </Pressable>
            </View>
          )}
          {galat.field.foto ? (
            <Text
              style={styles.galatField}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galat.field.foto}
            </Text>
          ) : (
            <Text style={styles.petunjuk}>
              Minimal 1 foto, maksimal {MAKS_FOTO} foto.
            </Text>
          )}

          {/* Lokasi */}
          <View style={styles.lokasiHead}>
            <Text
              style={[styles.label, !!galat.field.lokasi && styles.labelGalat]}
            >
              Lokasi <Text style={styles.wajib}>*</Text>
            </Text>
            <Pressable
              style={styles.gpsBtn}
              onPress={deteksiLokasi}
              disabled={mendeteksi}
              accessibilityRole="button"
              accessibilityLabel="Deteksi lokasi saya sekarang"
              accessibilityState={{ busy: mendeteksi }}
            >
              {mendeteksi ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Feather name="crosshair" size={14} color={colors.brand} />
              )}
              <Text style={styles.gpsTeks}>
                {mendeteksi ? "Mendeteksi…" : "Deteksi Lokasi"}
              </Text>
            </Pressable>
          </View>

          {!!galatLokasi && (
            <Text
              style={styles.galatLokasi}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galatLokasi}
            </Text>
          )}

          <View
            style={[styles.mapCard, !!galat.field.lokasi && styles.mapGalat]}
          >
            <LeafletMap
              ref={mapRef}
              style={styles.map}
              center={pusatPeta}
              zoom={coord ? ZOOM_TITIK : ZOOM_NASIONAL}
              pick
              markers={
                coord
                  ? [
                      {
                        id: "titik",
                        lat: coord.lat,
                        lng: coord.lng,
                        color: "green",
                      },
                    ]
                  : []
              }
              onMapPress={(lat, lng) => setDariKoordinat(lat, lng)}
            />
          </View>
          {galat.field.lokasi ? (
            <Text
              style={styles.galatField}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galat.field.lokasi}
            </Text>
          ) : (
            <Text style={styles.petunjuk}>
              Ketuk peta untuk menandai titik. Alamat bisa Anda perbaiki manual
              di bawah.
            </Text>
          )}

          <View style={styles.alamatWrap}>
            <Feather
              name="map-pin"
              size={16}
              color={colors.brand}
              style={{ marginTop: 14 }}
            />
            <TextInput
              style={styles.alamatInput}
              value={alamat}
              onChangeText={setAlamat}
              placeholder={
                geoLoading ? "Mendeteksi alamat…" : "Tulis atau perbaiki alamat"
              }
              placeholderTextColor="#9AA5B1"
              multiline
              accessibilityLabel="Alamat lokasi laporan"
            />
            {geoLoading && (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginTop: 16, marginRight: 4 }}
              />
            )}
          </View>

          {/* Wilayah terdeteksi */}
          {!!coord && (
            <View style={styles.wilayahKotak}>
              {wilayahQ.isLoading ? (
                <Text style={styles.wilayahTeks}>Memeriksa wilayah…</Text>
              ) : wilayah?.ditemukan ? (
                <>
                  <Text style={styles.wilayahLabel}>Wilayah terdeteksi</Text>
                  <Text style={styles.wilayahTeks}>
                    {[
                      wilayah.desa?.nama,
                      wilayah.kecamatan?.nama,
                      wilayah.kabupaten?.nama,
                      wilayah.provinsi?.nama,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                  <Text style={styles.wilayahBantu}>
                    Kalau ini bukan lokasi yang Anda maksud, geser titik di
                    peta.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.wilayahLabel}>
                    Wilayah belum terjangkau
                  </Text>
                  <Text style={styles.wilayahBantu}>
                    Titik ini belum masuk wilayah yang terdaftar. Laporan tetap
                    bisa dikirim dan akan diteruskan Fasilitator Wilayah ke
                    dinas setempat.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Kandidat duplikat */}
          {adaDuplikat && (
            <Pressable
              style={styles.duplikatKotak}
              onPress={() => {
                duplikatSementara.simpanKandidat(
                  duplikatQ.data?.kandidat ?? [],
                  duplikatQ.data?.radius_meter,
                );
                router.push("/lapor/duplikat" as Href);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ada ${duplikatQ.data?.kandidat.length ?? 0} laporan serupa dalam radius ${duplikatQ.data?.radius_meter ?? 50} meter. Ketuk untuk melihat`}
            >
              <Feather name="copy" size={18} color="#8A6D1B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.duplikatJudul}>
                  Ada {duplikatQ.data?.kandidat.length ?? 0} laporan serupa di
                  dekat sini
                </Text>
                <Text style={styles.duplikatTeks}>
                  Ketuk untuk melihat dan memutuskan apakah ini masalah yang
                  sama.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#8A6D1B" />
            </Pressable>
          )}

          {!!gabungKe && (
            <View style={styles.gabungKotak}>
              <Feather name="git-merge" size={16} color={colors.brand} />
              <Text style={styles.gabungTeks}>
                Akan digabungkan ke {gabungKe.tiket}
              </Text>
              <Pressable
                onPress={() => {
                  duplikatSementara.pilih(null);
                  setGabungKe(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Batalkan penggabungan"
              >
                <Feather name="x" size={16} color={colors.subtext} />
              </Pressable>
            </View>
          )}

          {/* Kategori */}
          <Text
            style={[
              styles.label,
              !!galat.field.kategori_id && styles.labelGalat,
            ]}
          >
            Kategori Masalah <Text style={styles.wajib}>*</Text>
          </Text>
          <Pressable
            style={[
              styles.select,
              !!galat.field.kategori_id && styles.selectGalat,
            ]}
            onPress={() => setPickerOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel={
              kategoriNama
                ? `Kategori: ${kategoriNama}`
                : "Pilih kategori masalah"
            }
            accessibilityState={{ expanded: pickerOpen }}
          >
            <Text style={{ color: kategoriNama ? colors.text : "#9AA5B1" }}>
              {katQ.isLoading
                ? "Memuat kategori…"
                : (kategoriNama ?? "Pilih kategori")}
            </Text>
            <Feather
              name={pickerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.subtext}
            />
          </Pressable>
          {pickerOpen && (
            <View style={styles.opsiWrap}>
              {kategori.map((k) => (
                <Pressable
                  key={k.id}
                  style={styles.opsi}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setKategoriId(k.id);
                    setPickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={k.nama}
                  accessibilityState={{ selected: kategoriId === k.id }}
                >
                  <Text style={{ color: colors.text }}>{k.nama}</Text>
                  {kategoriId === k.id && (
                    <Feather name="check" size={16} color={colors.brand} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
          {!!galat.field.kategori_id && (
            <Text
              style={styles.galatField}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galat.field.kategori_id}
            </Text>
          )}

          {/* Deskripsi, ketik atau suara */}
          <Text
            style={[
              styles.label,
              { marginTop: spacing.md },
              !!galat.field.deskripsi && styles.labelGalat,
            ]}
          >
            Deskripsi Masalah <Text style={styles.wajib}>*</Text>
          </Text>
          <VoiceInput
            nilai={deskripsi}
            onUbah={setDeskripsi}
            onSumberBerubah={setSumber}
            label="Deskripsi masalah"
            placeholder="Jelaskan apa yang Anda temukan di lokasi…"
          />
          {!!galat.field.deskripsi && (
            <Text
              style={styles.galatField}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {galat.field.deskripsi}
            </Text>
          )}

          <Pressable
            style={[styles.kirim, kirim.isPending && { opacity: 0.7 }]}
            onPress={submit}
            disabled={kirim.isPending}
            accessibilityRole="button"
            accessibilityLabel="Kirim laporan"
            accessibilityState={{ busy: kirim.isPending }}
          >
            {kirim.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kirimTeks}>Kirim Laporan</Text>
            )}
          </Pressable>

          {!user && (
            <Text style={styles.petunjuk}>
              Anda perlu masuk untuk mengirim laporan.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    marginTop: 6,
  },
  labelGalat: { color: colors.danger },
  wajib: { color: colors.danger },
  galatField: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  galatLokasi: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  fotoRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  fotoBox: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  foto: { width: "100%", height: "100%" },
  fotoHapus: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoAksi: { flexDirection: "row", gap: 12, marginTop: 12 },
  fotoTombol: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    backgroundColor: colors.white,
  },
  fotoTombolTeks: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  petunjuk: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 8,
    lineHeight: 17,
  },
  lokasiHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.pill,
  },
  gpsTeks: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  mapGalat: { borderColor: colors.danger, borderWidth: 1.5 },
  map: { height: 200, width: "100%" },
  alamatWrap: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  alamatInput: {
    flex: 1,
    minHeight: 60,
    paddingVertical: 14,
    color: colors.text,
    textAlignVertical: "top",
  },
  wilayahKotak: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  wilayahLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.subtext,
    marginBottom: 4,
  },
  wilayahTeks: { fontSize: 14, color: colors.text, lineHeight: 20 },
  wilayahBantu: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 6,
    lineHeight: 17,
  },
  duplikatKotak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF9E7",
    borderWidth: 1,
    borderColor: "#F5E6A8",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 12,
  },
  duplikatJudul: { fontSize: 14, fontWeight: "700", color: "#8A6D1B" },
  duplikatTeks: {
    fontSize: 12,
    color: "#8A6D1B",
    marginTop: 2,
    lineHeight: 17,
  },
  gabungKotak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 12,
  },
  gabungTeks: { flex: 1, fontSize: 13, color: colors.brand, fontWeight: "600" },
  select: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectGalat: { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
  opsiWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    overflow: "hidden",
  },
  opsi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  kirim: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  kirimTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
