import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { KECEPATAN, pecahParagraf, useSpeech } from "@/hooks/useSpeech";
import { teksBacaArtikel } from "@/lib/api/artikel";

type Props = {
  slug: string;
  judul: string;
};

/**
 * Pemutar suara untuk satu artikel.
 *
 * Teksnya diambil dari `GET /artikel/{slug}/teks-baca`, **bukan** dari
 * `konten` yang masih bermarkdown, pembaca akan mengucapkan pagar dan
 * bintangnya. Pemanggilan itu sekaligus mencatat pemakaian fitur suara, jadi
 * ia baru dilakukan ketika pengguna benar-benar menekan putar; memuatnya
 * bersama detail artikel akan menggelembungkan metrik dengan pembaca yang tidak
 * pernah menyalakan suara.
 */
export function PemutarArtikel({ slug, judul }: Props) {
  const s = useSpeech();
  const [mengambil, setMengambil] = useState(false);

  /**
   * `enabled: false`, teksnya diambil hanya lewat `refetch()` saat pengguna
   * menekan putar.
   *
   * Pemanggilan endpoint ini sekaligus mencatat pemakaian fitur suara, jadi ia
   * tidak boleh berjalan otomatis: pembaca yang tidak pernah menyalakan suara
   * akan ikut terhitung, dan angka `artikel_didengarkan` di statistik publik
   * jadi tidak berarti apa-apa.
   */
  const q = useQuery({
    queryKey: ["artikel", "teks-baca", slug],
    queryFn: () => teksBacaArtikel(slug),
    enabled: false,
    staleTime: Infinity,
  });

  const paragraf = q.data ? pecahParagraf(q.data.teks_baca) : [];

  // Perangkat tanpa dukungan pembacaan tidak perlu diberi tahu apa-apa,
  // pemutarnya cukup tidak muncul.
  if (!s.didukung) return null;

  const mulai = async () => {
    setMengambil(true);
    try {
      const data = q.data ?? (await q.refetch()).data;
      if (data) s.putar(data.teks_baca, s.indeksParagraf);
    } finally {
      setMengambil(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.kepala}>
        <View style={styles.ikon}>
          <Feather name="headphones" size={16} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.judul}>Dengarkan Artikel</Text>
          <Text style={styles.sub}>
            {q.data
              ? `${paragraf.length} paragraf · ${q.data.estimasi_baca_menit} menit`
              : "Bacakan artikel ini dengan suara"}
          </Text>
        </View>
      </View>

      {q.isError && (
        <Pressable
          style={styles.gagal}
          onPress={() => q.refetch()}
          accessibilityRole="button"
          accessibilityLabel="Gagal memuat teks bacaan. Ketuk untuk coba lagi"
        >
          <Feather name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.gagalTeks}>
            Teks bacaan gagal dimuat. Ketuk untuk coba lagi.
          </Text>
        </Pressable>
      )}

      <View style={styles.kendali}>
        {mengambil ? (
          <View style={styles.tombolUtama}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : s.status === "membaca" ? (
          <Pressable
            style={styles.tombolUtama}
            onPress={s.jeda}
            accessibilityRole="button"
            accessibilityLabel="Jeda pembacaan"
          >
            <Feather name="pause" size={20} color={colors.white} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.tombolUtama}
            onPress={s.status === "jeda" ? s.lanjut : mulai}
            accessibilityRole="button"
            accessibilityLabel={
              s.status === "jeda"
                ? "Lanjutkan pembacaan"
                : `Bacakan artikel ${judul}`
            }
          >
            <Feather name="play" size={20} color={colors.white} />
          </Pressable>
        )}

        <Pressable
          style={styles.tombolKedua}
          onPress={s.henti}
          disabled={s.status === "diam"}
          accessibilityRole="button"
          accessibilityLabel="Hentikan pembacaan"
          accessibilityState={{ disabled: s.status === "diam" }}
        >
          <Feather
            name="square"
            size={16}
            color={s.status === "diam" ? "#CBD5E1" : colors.brand}
          />
        </Pressable>

        <View style={styles.kecepatan}>
          {KECEPATAN.map((k) => {
            const aktif = s.kecepatan === k;
            return (
              <Pressable
                key={k}
                style={[styles.kecBtn, aktif && styles.kecAktif]}
                onPress={() => s.ubahKecepatan(k)}
                accessibilityRole="button"
                accessibilityLabel={`Kecepatan ${k} kali`}
                accessibilityState={{ selected: aktif }}
              >
                <Text
                  style={[styles.kecTeks, aktif && { color: colors.white }]}
                >
                  {k}×
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/*
        Penanda paragraf berjalan. Paragraf yang sedang dibacakan disorot,
        sehingga pengguna yang mendengarkan sambil melihat layar tidak kehilangan
        tempatnya, dan pengguna yang kesulitan membaca tetap punya rujukan
        visual tentang sejauh mana pembacaan sudah berjalan.
      */}
      {paragraf.length > 0 && s.status !== "diam" && (
        <View style={styles.jejak}>
          <Text style={styles.jejakLabel}>
            Paragraf {s.indeksParagraf + 1} dari {paragraf.length}
          </Text>
          <ScrollView style={styles.jejakKotak} nestedScrollEnabled>
            <Text style={styles.jejakTeks}>
              {paragraf[s.indeksParagraf] ?? ""}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 16,
  },
  kepala: { flexDirection: "row", alignItems: "center", gap: 12 },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  judul: { fontSize: 14, fontWeight: "700", color: colors.text },
  sub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  gagal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    minHeight: 44,
  },
  gagalTeks: { flex: 1, fontSize: 12, color: colors.danger },
  kendali: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  tombolUtama: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  tombolKedua: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kecepatan: {
    flexDirection: "row",
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  kecBtn: {
    minWidth: 46,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  kecAktif: { backgroundColor: colors.brand },
  kecTeks: { fontSize: 12, fontWeight: "700", color: colors.text },
  jejak: { marginTop: 14 },
  jejakLabel: { fontSize: 11, color: colors.subtext, marginBottom: 6 },
  jejakKotak: {
    maxHeight: 96,
    backgroundColor: "#F3FBF7",
    borderRadius: radius.sm,
    padding: 12,
  },
  jejakTeks: { fontSize: 13, color: colors.text, lineHeight: 20 },
});

export default PemutarArtikel;
