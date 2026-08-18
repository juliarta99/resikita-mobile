import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import LencanaArtikel from "@/components/LencanaArtikel";
import { colors, radius } from "@/constants/theme";
import { labelTipe, namaKategori } from "@/lib/artikel";
import type { ArtikelRingkas } from "@/types/artikel";
import { urlMedia } from "@/lib/media";

/**
 * Kartu artikel ringkas untuk beranda.
 *
 * Bentuknya `ArtikelRingkas`, bukan `Artikel`: yang sampai ke beranda datang
 * dari `GET /artikel`, dan di sana `konten`, `didengarkan`, serta objek
 * kategori memang tidak ikut. Menyebutnya `Artikel` membuat TypeScript
 * menjanjikan field yang tidak pernah ada, persis bagaimana lencana kategori
 * bisa kosong tanpa satu pun galat muncul.
 */
export function KartuArtikel({ a }: { a: ArtikelRingkas }) {
  const kategori = namaKategori(a.kategori);
  const tipe = labelTipe(a);
  const menit = a.estimasi_baca_menit;

  return (
    <Pressable
      style={styles.kartu}
      onPress={() => router.push(`/edukasi/${a.slug}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={[
        a.judul,
        kategori ? `kategori ${kategori}` : null,
        tipe,
        menit ? `${menit} menit baca` : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <View style={styles.thumb}>
        {a.thumbnail_url ? (
          <Image
            source={{ uri: urlMedia(a.thumbnail_url) }}
            style={styles.gambar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={22} color="#CBD5E1" />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <LencanaArtikel a={a} varian="pekat" />
        <Text style={styles.judul} numberOfLines={2}>
          {a.judul}
        </Text>
        {/* Estimasi baca bisa `null` untuk artikel yang belum dihitung
            peladen; tanpa penjaga ini barisnya berbunyi "null menit". */}
        {menit != null && (
          <View style={styles.meta}>
            <Feather name="clock" size={12} color={colors.subtext} />
            <Text style={styles.metaTeks}>{menit} menit</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kartu: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gambar: { width: "100%", height: "100%" },
  judul: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 19,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaTeks: { fontSize: 12, color: colors.subtext },
});

export default KartuArtikel;
