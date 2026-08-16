import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/lib/api/error";
import { kirimProgresPenugasan, selesaikanPenugasan } from "@/lib/api/petugas";
import { confirmDialog, notify } from "@/lib/dialog";

type Mode = "progres" | "selesai";

export default function CatatProgres() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("progres");
  const [catatan, setCatatan] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [koordinat, setKoordinat] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mengambilLokasi, setMengambilLokasi] = useState(false);
  const [error, setError] = useState("");

  const ambilLokasi = async () => {
    setError("");
    setMengambilLokasi(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(
          "Izin lokasi diperlukan untuk mencatat progres di titik penanganan.",
        );
        return;
      }
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setKoordinat({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch {
      setError("Lokasi tidak dapat dideteksi. Coba lagi di area terbuka.");
    } finally {
      setMengambilLokasi(false);
    }
  };

  const ambilFoto = async (sumber: "kamera" | "galeri") => {
    const izin =
      sumber === "kamera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      notify("Izin ditolak", "Beri izin akses untuk melampirkan foto bukti.");
      return;
    }
    const hasil =
      sumber === "kamera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.6,
            mediaTypes: ["images"],
          });
    if (!hasil.canceled && hasil.assets[0]) setFoto(hasil.assets[0].uri);
  };

  const kirim = useMutation({
    mutationFn: () =>
      mode === "selesai"
        ? selesaikanPenugasan(nomor, { catatan: catatan.trim() }, foto ?? undefined)
        : kirimProgresPenugasan(
            nomor,
            {
              catatan: catatan.trim(),
              latitude: koordinat!.lat,
              longitude: koordinat!.lng,
            },
            foto ?? undefined,
          ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["petugas"] });
      notify(
        mode === "selesai" ? "Penugasan selesai" : "Progres tercatat",
        mode === "selesai"
          ? "Terima kasih. Pelapor akan menerima kabar bahwa laporannya sudah ditangani."
          : "Catatan Anda tersimpan dan terlihat oleh pelapor.",
      );
      router.back();
    },
    onError: (e: unknown) =>
      setError(
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Catatan tidak dapat dikirim.",
      ),
  });

  const submit = async () => {
    setError("");
    if (!catatan.trim()) return setError("Isi catatan penanganan.");
    if (mode === "selesai" && !foto)
      return setError("Foto bukti wajib dilampirkan saat menandai selesai.");
    /**
     * Koordinat wajib untuk progres, tapi tidak untuk penyelesaian.
     *
     * Kontrak yang menentukan: `POST …/progres` menerima `latitude` dan
     * `longitude`, sementara `POST …/selesai` tidak. Masuk akal — catatan
     * progres membuktikan petugas benar-benar berada di lokasi, sedangkan
     * laporan penyelesaian bisa dikirim setelah ia kembali.
     */
    if (mode === "progres" && !koordinat)
      return setError("Ambil lokasi Anda lebih dulu.");

    if (mode === "selesai") {
      const yakin = await confirmDialog(
        "Tandai selesai?",
        "Penugasan ini akan ditutup dan pelapor menerima pemberitahuan. Tindakan ini tidak bisa dibatalkan dari aplikasi.",
        "Tandai Selesai",
      );
      if (!yakin) return;
    }
    kirim.mutate();
  };

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
        <Text style={styles.appbarTitle}>Catat Penanganan</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modeBaris}>
            {(["progres", "selesai"] as Mode[]).map((m) => {
              const aktif = mode === m;
              const label =
                m === "progres" ? "Catatan Progres" : "Tandai Selesai";
              return (
                <Pressable
                  key={m}
                  style={[styles.mode, aktif && styles.modeAktif]}
                  onPress={() => setMode(m)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: aktif }}
                >
                  <Text
                    style={[styles.modeTeks, aktif && { color: colors.white }]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>
            Catatan <Text style={styles.wajib}>*</Text>
          </Text>
          <TextInput
            style={styles.catatan}
            value={catatan}
            onChangeText={setCatatan}
            placeholder={
              mode === "selesai"
                ? "Jelaskan kondisi akhir lokasi setelah ditangani…"
                : "Apa yang sedang Anda kerjakan di lokasi?"
            }
            placeholderTextColor="#9AA5B1"
            multiline
            accessibilityLabel="Catatan penanganan"
          />

          <Text style={styles.label}>
            Foto Bukti{" "}
            {mode === "selesai" && <Text style={styles.wajib}>*</Text>}
          </Text>
          {foto ? (
            <View style={styles.fotoWrap}>
              <Image
                source={{ uri: foto }}
                style={styles.foto}
                accessibilityIgnoresInvertColors
                accessibilityLabel="Foto bukti penanganan"
              />
              <Pressable
                style={styles.fotoHapus}
                onPress={() => setFoto(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Hapus foto bukti"
              >
                <Feather name="x" size={14} color={colors.white} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.fotoAksi}>
              <Pressable
                style={styles.fotoTombol}
                onPress={() => ambilFoto("kamera")}
                accessibilityRole="button"
                accessibilityLabel="Ambil foto bukti dengan kamera"
              >
                <Feather name="camera" size={18} color={colors.brand} />
                <Text style={styles.fotoTombolTeks}>Kamera</Text>
              </Pressable>
              <Pressable
                style={styles.fotoTombol}
                onPress={() => ambilFoto("galeri")}
                accessibilityRole="button"
                accessibilityLabel="Pilih foto bukti dari galeri"
              >
                <Feather name="image" size={18} color={colors.brand} />
                <Text style={styles.fotoTombolTeks}>Galeri</Text>
              </Pressable>
            </View>
          )}

          {mode === "progres" && (
            <>
              <Text style={styles.label}>
                Lokasi Anda <Text style={styles.wajib}>*</Text>
              </Text>
              {koordinat ? (
                <View style={styles.lokasiKotak}>
                  <Feather name="map-pin" size={16} color={colors.brand} />
                  <Text style={styles.lokasiTeks}>
                    {koordinat.lat.toFixed(5)}, {koordinat.lng.toFixed(5)}
                  </Text>
                  <Pressable
                    onPress={ambilLokasi}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Perbarui lokasi"
                  >
                    <Feather
                      name="refresh-cw"
                      size={16}
                      color={colors.subtext}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.lokasiTombol}
                  onPress={ambilLokasi}
                  disabled={mengambilLokasi}
                  accessibilityRole="button"
                  accessibilityLabel="Ambil lokasi saya sekarang"
                  accessibilityState={{ busy: mengambilLokasi }}
                >
                  {mengambilLokasi ? (
                    <ActivityIndicator size="small" color={colors.brand} />
                  ) : (
                    <>
                      <Feather
                        name="crosshair"
                        size={16}
                        color={colors.brand}
                      />
                      <Text style={styles.lokasiTombolTeks}>
                        Ambil Lokasi Saya
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
              <Text style={styles.bantu}>
                Koordinat ikut tercatat sebagai bukti bahwa penanganan dilakukan
                di lokasi laporan.
              </Text>
            </>
          )}

          {!!error && (
            <Text style={styles.galat} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable
            style={[styles.kirim, kirim.isPending && { opacity: 0.7 }]}
            onPress={submit}
            disabled={kirim.isPending}
            accessibilityRole="button"
            accessibilityLabel={
              mode === "selesai"
                ? "Kirim laporan penyelesaian"
                : "Kirim catatan progres"
            }
            accessibilityState={{ busy: kirim.isPending }}
          >
            {kirim.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kirimTeks}>
                {mode === "selesai" ? "Tandai Selesai" : "Kirim Catatan"}
              </Text>
            )}
          </Pressable>
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
  modeBaris: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
  mode: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  modeAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  modeTeks: { fontSize: 13, fontWeight: "700", color: colors.text },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    marginTop: 6,
  },
  wajib: { color: colors.danger },
  catatan: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: 14,
    minHeight: 110,
    color: colors.text,
    textAlignVertical: "top",
    marginBottom: 6,
  },
  fotoAksi: { flexDirection: "row", gap: 12 },
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
  fotoWrap: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  foto: { width: "100%", height: "100%" },
  fotoHapus: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  lokasiKotak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    padding: 14,
    minHeight: 44,
  },
  lokasiTeks: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  lokasiTombol: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.white,
  },
  lokasiTombolTeks: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  bantu: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 8,
    lineHeight: 17,
  },
  galat: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
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
