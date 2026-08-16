import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PemutarArtikel from "@/components/PemutarArtikel";
import RichContent from "@/components/RichContent";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { detailArtikel } from "@/lib/api/artikel";
import { markdownKeHtml } from "@/lib/markdown";

export default function DetailEdukasi() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const q = useQuery({
    queryKey: ["artikel", "detail", slug],
    queryFn: () => detailArtikel(slug),
    enabled: !!slug,
  });

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
      <Text style={styles.appbarTitle}>Artikel Edukasi</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat artikel…" />
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

  const a = q.data;
  const tanggal = new Date(a.published_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ImageBackground
          source={a.thumbnail_url ? { uri: a.thumbnail_url } : undefined}
          style={styles.hero}
          imageStyle={{ resizeMode: "cover" }}
        >
          <View style={styles.heroTirai} />
          <View style={styles.heroIsi}>
            <View style={styles.lencanaBaris}>
              <View style={styles.kategori}>
                <Text style={styles.kategoriTeks}>
                  {a.kategori?.nama ?? "Edukasi"}
                </Text>
              </View>
              {!!a.tipe && (
                <View style={styles.tipe}>
                  <Text style={styles.tipeTeks}>{a.tipe}</Text>
                </View>
              )}
            </View>
            <Text style={styles.judul}>{a.judul}</Text>
          </View>
        </ImageBackground>

        <View style={styles.isi}>
          <View style={styles.metaBaris}>
            <View style={styles.meta}>
              <Feather name="calendar" size={13} color={colors.subtext} />
              <Text style={styles.metaTeks}>{tanggal}</Text>
            </View>
            <View style={styles.meta}>
              <Feather name="clock" size={13} color={colors.subtext} />
              <Text style={styles.metaTeks}>
                {a.estimasi_baca_menit} menit baca
              </Text>
            </View>
            <View style={styles.meta}>
              <Feather name="eye" size={13} color={colors.subtext} />
              <Text style={styles.metaTeks}>{a.dilihat}</Text>
            </View>
            {a.didengarkan > 0 && (
              <View style={styles.meta}>
                <Feather name="headphones" size={13} color={colors.subtext} />
                <Text style={styles.metaTeks}>{a.didengarkan}</Text>
              </View>
            )}
          </View>

          {/*
            Pemutar suara ditaruh sebelum isi artikel, bukan di akhir.
            Pengguna yang datang ke sini justru karena kesulitan membaca tidak
            seharusnya menggulir melewati seluruh artikel untuk menemukan tombol
            yang membacakannya.
          */}
          <PemutarArtikel slug={a.slug} judul={a.judul} />

          <RichContent html={markdownKeHtml(a.konten)} />
        </View>
      </ScrollView>
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
  hero: {
    height: 220,
    justifyContent: "flex-end",
    backgroundColor: "#0F172A",
  },
  heroTirai: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  heroIsi: { padding: spacing.lg, gap: 10 },
  kategori: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  kategoriTeks: { color: colors.white, fontSize: 11, fontWeight: "700" },
  lencanaBaris: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tipe: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  tipeTeks: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  judul: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
  },
  isi: { padding: spacing.lg },
  metaBaris: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTeks: { fontSize: 12, color: colors.subtext },
});
