import { colors, radius, spacing } from "@/constants/theme";
import { buatLaporan, getLaporanKategori } from "@/lib/api";
import { locationDraft, LocDraft } from "@/lib/draft";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

export default function BuatLaporan() {
  const [fotos, setFotos] = useState<string[]>([]);
  const [loc, setLoc] = useState<LocDraft | null>(null);
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [loading, setLoading] = useState(false);

  const katQ = useQuery({
    queryKey: ["lapor-kategori"],
    queryFn: getLaporanKategori,
  });
  const kategori = katQ.data ?? [];
  const kategoriNama = kategori.find((k: any) => k.id === kategoriId)?.nama;

  // Lokasi awal = lokasi sekarang (reverse geocode)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const p = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
      });
      const a = geo[0];
      setLoc({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        alamat: a
          ? `${a.street ?? a.name ?? ""}, ${a.subregion ?? a.city ?? ""}`.trim()
          : "Lokasi terdeteksi",
      });
    })();
  }, []);

  // Ambil hasil dari pemilih lokasi
  useFocusEffect(
    useCallback(() => {
      const d = locationDraft.take();
      if (d) setLoc(d);
    }, []),
  );

  const tambahFoto = async () => {
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
    if (!loc) return Alert.alert("Lengkapi", "Tentukan lokasi laporan.");
    if (!kategoriId) return Alert.alert("Lengkapi", "Pilih kategori masalah.");
    if (!deskripsi.trim())
      return Alert.alert("Lengkapi", "Isi deskripsi masalah.");

    const form = new FormData();
    form.append("kategori_id", String(kategoriId));
    form.append("judul", kategoriNama ?? "Laporan Sampah");
    form.append("deskripsi", deskripsi.trim());
    form.append("lat", String(loc.lat));
    form.append("lng", String(loc.lng));
    form.append("alamat", loc.alamat);
    fotos.forEach((uri, i) => {
      const file = { uri, name: `foto${i}.jpg`, type: "image/jpeg" } as any;
      if (i === 0) form.append("foto", file);
      form.append("images[]", file);
    });

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

          {/* Lokasi */}
          <Text style={styles.label}>
            Lokasi <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.locCard}>
            <View style={styles.locRow}>
              <View style={styles.locIcon}>
                <Feather name="map-pin" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>Lokasi Terdeteksi</Text>
                <Text style={styles.locVal}>
                  {loc?.alamat ?? "Mendeteksi lokasi…"}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.ubahBtn}
              onPress={() => router.push("/lapor/pilih-lokasi" as Href)}
            >
              <Text style={styles.ubahText}>Ubah Lokasi</Text>
            </Pressable>
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
  locCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  locLabel: { color: colors.subtext, fontSize: 12 },
  locVal: { color: colors.text, fontSize: 14, fontWeight: "600", marginTop: 2 },
  ubahBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  ubahText: { color: colors.brand, fontWeight: "700" },
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
