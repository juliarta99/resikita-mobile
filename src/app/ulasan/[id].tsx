import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { type Href, router, useLocalSearchParams } from "expo-router";
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

import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { ApiError } from "@/lib/api/error";
import { detailPesanan, kirimUlasan } from "@/lib/api/pesanan";
import { notify } from "@/lib/dialog";

const LABEL_BINTANG = [
  "",
  "Sangat mengecewakan",
  "Kurang memuaskan",
  "Cukup",
  "Bagus",
  "Sangat bagus",
];

export default function BeriUlasan() {
  // Segmen rutenya `[id]`, tapi nilainya `kode` pesanan.
  const { id: kode } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [error, setError] = useState("");

  const q = useQuery({
    queryKey: ["pesanan", "detail", kode],
    queryFn: () => detailPesanan(kode),
    enabled: !!kode,
  });

  const kirim = useMutation({
    mutationFn: () =>
      kirimUlasan(kode, { rating, komentar: komentar.trim() || undefined }, foto ?? undefined),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pesanan"] });
      await qc.invalidateQueries({ queryKey: ["produk"] });
      notify("Terima kasih", "Ulasan Anda sudah terkirim.");
      router.replace(`/pesanan/${kode}` as Href);
    },
    onError: (e: unknown) =>
      setError(
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Ulasan tidak dapat dikirim.",
      ),
  });

  const ambilFoto = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      notify("Izin ditolak", "Beri izin galeri untuk melampirkan foto.");
      return;
    }
    const hasil = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      mediaTypes: ["images"],
    });
    if (!hasil.canceled && hasil.assets[0]) setFoto(hasil.assets[0].uri);
  };

  const submit = () => {
    setError("");
    if (rating === 0) return setError("Pilih berapa bintang lebih dulu.");
    kirim.mutate();
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
      <Text style={styles.appbarTitle}>Beri Ulasan</Text>
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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/*
            Satu ulasan untuk satu pesanan, bukan satu per produk.
            Itu yang ditetapkan kontrak (`POST /pesanan/{kode}/ulasan` menerima
            satu `rating` dan satu `komentar`), sementara versi sebelumnya
            mengirim larik ulasan per produk. Daftar produk di bawah ditampilkan
            supaya pengguna tahu persis apa yang sedang ia nilai — kalau ternyata
            penilaian memang harus per produk, layar ini yang berubah, bukan
            kontraknya yang ditambal di klien. Lihat catatan T6.
          */}
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Anda menilai pesanan</Text>
            <Text style={styles.kode}>{p.kode}</Text>
            {p.items.map((it) => (
              <View key={it.id} style={styles.item}>
                <View style={styles.gambar}>
                  {it.produk.foto_url ? (
                    <Image
                      source={{ uri: it.produk.foto_url }}
                      style={styles.gambarIsi}
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <Feather name="image" size={18} color="#CBD5E1" />
                  )}
                </View>
                <Text style={styles.itemNama} numberOfLines={2}>
                  {it.produk.nama}
                </Text>
                <Text style={styles.itemQty}>×{it.qty}</Text>
              </View>
            ))}
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Seberapa puas Anda?</Text>
            <View style={styles.bintangBaris}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setRating(n)}
                  style={styles.bintangTombol}
                  accessibilityRole="radio"
                  accessibilityLabel={`${n} bintang — ${LABEL_BINTANG[n]}`}
                  accessibilityState={{ selected: rating === n }}
                >
                  <Feather
                    name="star"
                    size={34}
                    color={n <= rating ? "#F59E0B" : "#E2E8F0"}
                  />
                </Pressable>
              ))}
            </View>
            <Text
              style={styles.bintangLabel}
              accessibilityLiveRegion="polite"
            >
              {rating > 0 ? LABEL_BINTANG[rating] : "Ketuk bintang untuk menilai"}
            </Text>
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Ceritakan pengalaman Anda</Text>
            <TextInput
              style={styles.komentar}
              value={komentar}
              onChangeText={setKomentar}
              placeholder="Bagaimana kualitas produk dan pengirimannya? (opsional)"
              placeholderTextColor="#9AA5B1"
              multiline
              accessibilityLabel="Komentar ulasan, opsional"
            />

            {foto ? (
              <View style={styles.fotoWrap}>
                <Image
                  source={{ uri: foto }}
                  style={styles.foto}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel="Foto yang dilampirkan pada ulasan"
                />
                <Pressable
                  style={styles.fotoHapus}
                  onPress={() => setFoto(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus foto lampiran"
                >
                  <Feather name="x" size={14} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.fotoTambah}
                onPress={ambilFoto}
                accessibilityRole="button"
                accessibilityLabel="Lampirkan foto pada ulasan, opsional"
              >
                <Feather name="camera" size={18} color={colors.brand} />
                <Text style={styles.fotoTambahTeks}>
                  Lampirkan Foto (opsional)
                </Text>
              </Pressable>
            )}
          </View>

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
            accessibilityLabel="Kirim ulasan"
            accessibilityState={{ busy: kirim.isPending }}
          >
            {kirim.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kirimTeks}>Kirim Ulasan</Text>
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
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 14,
  },
  kartuJudul: { fontSize: 15, fontWeight: "700", color: colors.text },
  kode: { fontSize: 12, color: colors.subtext, marginTop: 4, marginBottom: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  gambar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambarIsi: { width: "100%", height: "100%" },
  itemNama: { flex: 1, fontSize: 13, color: colors.text },
  itemQty: { fontSize: 12, color: colors.subtext },
  bintangBaris: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  bintangTombol: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  bintangLabel: {
    textAlign: "center",
    fontSize: 13,
    color: colors.subtext,
    marginTop: 6,
  },
  komentar: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 110,
    marginTop: 12,
    color: colors.text,
    textAlignVertical: "top",
  },
  fotoTambah: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginTop: 12,
  },
  fotoTambahTeks: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  fotoWrap: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: 12,
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
  galat: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  kirim: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  kirimTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
