import LeafletMap, { LeafletMapHandle } from "@/components/LeafletMap";
import { colors, radius, spacing } from "@/constants/theme";
import { buatLaporan, getLaporanKategori } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Href, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const DEFAULT = { lat: -8.6478, lng: 115.2028 }; // Denpasar

// Susun alamat dari hasil expo reverse geocode
function fmtExpo(a?: Location.LocationGeocodedAddress): string {
  if (!a) return "";
  return [
    a.name && a.name !== a.street ? a.name : null,
    a.street,
    a.district ?? a.subregion,
    a.city ?? a.region,
    a.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

// Reverse geocode: expo dulu (native), fallback Nominatim (web). Selalu selesai (ada timeout).
async function reverseAddr(lat: number, lng: number): Promise<string> {
  try {
    const g = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    const s = fmtExpo(g?.[0]);
    if (s) return s;
  } catch {}

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000); // batalkan bila > 6 detik
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" }, signal: ctrl.signal },
    );
    clearTimeout(timer);
    const j = await r.json();
    if (j?.display_name) return j.display_name as string;
  } catch {}

  // Fallback terakhir: tampilkan koordinat, jangan biarkan kosong / menggantung
  return `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
}

async function appendFoto(
  form: FormData,
  field: string,
  uri: string,
  name: string,
) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, name);
  } else {
    form.append(field, { uri, name, type: "image/jpeg" } as any);
  }
}

export default function BuatLaporan() {
  const [fotos, setFotos] = useState<string[]>([]);
  const [coord, setCoord] = useState<{ lat: number; lng: number }>(DEFAULT);
  const [alamat, setAlamat] = useState("");
  const [geoLoading, setGeoLoading] = useState(true);
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [loading, setLoading] = useState(false);
  const mapRef = React.useRef<LeafletMapHandle>(null);

  const katQ = useQuery({
    queryKey: ["lapor-kategori"],
    queryFn: getLaporanKategori,
  });
  const kategori = katQ.data ?? [];
  const kategoriNama = kategori.find((k: any) => k.id === kategoriId)?.nama;

  const setDariKoordinat = async (
    lat: number,
    lng: number,
    moveMap = false,
  ) => {
    setCoord({ lat, lng });
    if (moveMap) mapRef.current?.setView(lat, lng, 16);
    setGeoLoading(true);
    try {
      const a = await reverseAddr(lat, lng);
      setAlamat(a);
    } finally {
      setGeoLoading(false); // apa pun hasilnya, spinner berhenti
    }
  };

  // Deteksi lokasi saat ini di awal
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setGeoLoading(false);
          return;
        }
        const p = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        await setDariKoordinat(p.coords.latitude, p.coords.longitude, true);
      } catch {
        setGeoLoading(false);
      }
    })();
  }, []);

  const deteksiUlang = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin lokasi",
          "Beri izin lokasi untuk mendeteksi posisi Anda.",
        );
        return;
      }
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await setDariKoordinat(p.coords.latitude, p.coords.longitude, true);
    } catch {
      setGeoLoading(false);
      Alert.alert("Gagal", "Tidak dapat mendeteksi lokasi.");
    }
  };

  const tambahFoto = () => {
    if (fotos.length >= 3) return;
    Alert.alert("Tambah Foto", "Pilih sumber foto", [
      { text: "Kamera", onPress: () => ambil("camera") },
      { text: "Galeri", onPress: () => ambil("library") },
      { text: "Batal", style: "cancel" },
    ]);
  };
  const ambil = async (src: "camera" | "library") => {
    const perm =
      src === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin ditolak", "Beri izin akses untuk menambah foto.");
      return;
    }
    const res =
      src === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.6,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });
    if (!res.canceled && res.assets[0])
      setFotos((f) => [...f, res.assets[0].uri].slice(0, 3));
  };

  const submit = async () => {
    if (fotos.length < 1)
      return Alert.alert("Lengkapi", "Unggah minimal 1 foto bukti.");
    if (!alamat.trim())
      return Alert.alert("Lengkapi", "Isi alamat lokasi laporan.");
    if (!kategoriId) return Alert.alert("Lengkapi", "Pilih kategori masalah.");
    if (!deskripsi.trim())
      return Alert.alert("Lengkapi", "Isi deskripsi masalah.");

    const form = new FormData();
    form.append("kategori_id", String(kategoriId));
    form.append("judul", kategoriNama ?? "Laporan Sampah");
    form.append("deskripsi", deskripsi.trim());
    form.append("lat", String(coord.lat));
    form.append("lng", String(coord.lng));
    form.append("alamat", alamat.trim());
    for (let i = 0; i < fotos.length; i++) {
      if (i === 0) await appendFoto(form, "foto", fotos[i], `foto${i}.jpg`);
      await appendFoto(form, "images[]", fotos[i], `foto${i}.jpg`);
    }

    setLoading(true);
    try {
      await buatLaporan(form);
      Alert.alert("Terkirim", "Laporan Anda berhasil dikirim.", [
        { text: "OK", onPress: () => router.replace("/lapor/riwayat" as Href) },
      ]);
    } catch (e: any) {
      const errs = e?.response?.data?.errors as
        | Record<string, string[]>
        | undefined;
      Alert.alert(
        "Gagal",
        errs
          ? Object.values(errs)[0]?.[0]
          : (e?.response?.data?.message ?? "Gagal mengirim laporan."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
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
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Laporkan masalah sampah di lingkungan Anda. Tim kami akan segera
              menindaklanjuti laporan Anda.
            </Text>
          </View>

          {/* Foto */}
          <Text style={styles.label}>
            Foto Bukti <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.fotoRow}>
            {fotos.map((uri, i) => (
              <View key={i} style={styles.fotoBox}>
                <Image source={{ uri }} style={styles.foto} />
                <Pressable
                  style={styles.fotoDel}
                  onPress={() =>
                    setFotos((f) => f.filter((_, idx) => idx !== i))
                  }
                >
                  <Feather name="x" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
            {fotos.length < 3 && (
              <Pressable style={styles.fotoAdd} onPress={tambahFoto}>
                <Feather name="camera" size={22} color={colors.subtext} />
                <Text style={styles.fotoAddText}>Tambah Foto</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.hint}>
            Upload minimal 1 foto, maksimal 3 foto
          </Text>

          {/* Lokasi — peta inline + alamat bisa diedit */}
          <View style={styles.locLabelRow}>
            <Text style={styles.label}>
              Lokasi <Text style={styles.req}>*</Text>
            </Text>
            <Pressable style={styles.gpsBtn} onPress={deteksiUlang}>
              <Feather name="crosshair" size={14} color={colors.brand} />
              <Text style={styles.gpsText}>Deteksi Ulang</Text>
            </Pressable>
          </View>
          <View style={styles.mapCard}>
            <LeafletMap
              ref={mapRef}
              style={styles.map}
              center={coord}
              zoom={16}
              pick
              markers={[
                { id: "me", lat: coord.lat, lng: coord.lng, color: "green" },
              ]}
              onMapPress={(lat: number, lng: number) =>
                setDariKoordinat(lat, lng)
              }
            />
          </View>
          <Text style={styles.hint}>
            Ketuk peta untuk memindahkan titik. Alamat bisa Anda perbaiki manual
            di bawah.
          </Text>

          <View style={styles.addrInputWrap}>
            <Feather
              name="map-pin"
              size={16}
              color={colors.brand}
              style={{ marginTop: 12 }}
            />
            <TextInput
              style={styles.addrInput}
              value={alamat}
              onChangeText={setAlamat}
              placeholder={
                geoLoading
                  ? "Mendeteksi alamat…"
                  : "Tulis / perbaiki alamat lengkap"
              }
              placeholderTextColor="#9AA5B1"
              multiline
            />
            {geoLoading && (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginTop: 14, marginRight: 4 }}
              />
            )}
          </View>

          {/* Kategori */}
          <Text style={styles.label}>
            Kategori Masalah <Text style={styles.req}>*</Text>
          </Text>
          <Pressable
            style={styles.select}
            onPress={() => setPickerOpen((o) => !o)}
          >
            <Text style={{ color: kategoriNama ? colors.text : "#9AA5B1" }}>
              {kategoriNama ?? "Pilih kategori"}
            </Text>
            <Feather
              name={pickerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.subtext}
            />
          </Pressable>
          {pickerOpen && (
            <View style={styles.options}>
              {kategori.map((k: any) => (
                <Pressable
                  key={k.id}
                  style={styles.option}
                  onPress={() => {
                    setKategoriId(k.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{k.nama}</Text>
                  {kategoriId === k.id && (
                    <Feather name="check" size={16} color={colors.brand} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Deskripsi */}
          <Text style={styles.label}>
            Deskripsi Masalah <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={styles.textarea}
            multiline
            placeholder="Jelaskan detail masalah yang Anda temukan..."
            placeholderTextColor="#9AA5B1"
            value={deskripsi}
            onChangeText={setDeskripsi}
          />

          <Pressable
            style={[styles.submit, loading && { opacity: 0.7 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Kirim Laporan</Text>
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
  banner: {
    backgroundColor: "#FEF9E7",
    borderWidth: 1,
    borderColor: "#F5E6A8",
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: { color: "#8A6D1B", fontSize: 13, lineHeight: 19 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    marginTop: 6,
  },
  req: { color: colors.danger },
  fotoRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  fotoBox: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  foto: { width: "100%", height: "100%" },
  fotoDel: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoAdd: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
  },
  fotoAddText: { fontSize: 11, color: colors.subtext },
  hint: { fontSize: 12, color: colors.subtext, marginTop: 8 },
  locLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gpsText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  map: { height: 200, width: "100%" },
  addrInputWrap: {
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
  addrInput: {
    flex: 1,
    minHeight: 60,
    paddingVertical: 12,
    color: colors.text,
    textAlignVertical: "top",
  },
  select: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  options: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  textarea: {
    minHeight: 110,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    color: colors.text,
    textAlignVertical: "top",
  },
  submit: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
