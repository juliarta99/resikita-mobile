import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/constants/theme";
import { labelTipe, namaKategori } from "@/lib/artikel";
import type { KategoriArtikel } from "@/types/artikel";

/**
 * Cukup longgar untuk menerima artikel bentuk ringkas maupun detail — dua-
 * duanya punya `tipe`, dan `kategori`-nya berbeda bentuk saja.
 */
type ArtikelBerlencana = {
  tipe?: string | null;
  tipe_label?: string | null;
  kategori?: string | KategoriArtikel | null;
};

type Props = {
  a: ArtikelBerlencana;
  /**
   * `pekat` untuk kartu di atas latar putih bersih, `lembut` untuk kartu yang
   * sudah ramai. Keduanya menampilkan informasi yang sama persis.
   */
  varian?: "pekat" | "lembut";
};

/**
 * Lencana kategori dan tipe sebuah artikel.
 *
 * Keduanya menjawab pertanyaan yang berbeda: kategori menjawab "tentang apa",
 * tipe menjawab "berbentuk apa" — panduan langkah demi langkah dibaca berbeda
 * dari jurnal, dan pembaca berhak tahu sebelum membukanya. Disatukan di satu
 * komponen supaya beranda dan halaman edukasi tidak bisa lagi menampilkan
 * kelengkapan yang berbeda untuk artikel yang sama.
 */
export function LencanaArtikel({ a, varian = "lembut" }: Props) {
  const kategori = namaKategori(a.kategori);
  const tipe = labelTipe(a);

  // Tanpa keduanya, barisnya tidak digambar sama sekali — bukan digambar
  // kosong. Inilah yang dulu menyisakan kotak berwarna tanpa teks.
  if (!kategori && !tipe) return null;

  const pekat = varian === "pekat";

  return (
    <View style={styles.baris}>
      {!!kategori && (
        <View
          style={[styles.pil, pekat ? styles.kategoriPekat : styles.kategoriLembut]}
        >
          <Text
            style={[styles.teks, pekat ? styles.teksPekat : styles.teksKategori]}
            numberOfLines={1}
          >
            {kategori}
          </Text>
        </View>
      )}

      {!!tipe && (
        <View style={[styles.pil, styles.tipe]}>
          <Text style={[styles.teks, styles.teksTipe]} numberOfLines={1}>
            {tipe}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  pil: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  kategoriPekat: { backgroundColor: colors.brand },
  kategoriLembut: { backgroundColor: "#DCF3EA" },
  tipe: { borderWidth: 1, borderColor: colors.border },
  teks: { fontSize: 10, fontWeight: "700" },
  teksPekat: { color: colors.white },
  teksKategori: { color: colors.brand },
  teksTipe: { color: colors.subtext },
});

export default LencanaArtikel;
