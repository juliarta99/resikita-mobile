import RichContent from "@/components/RichContent";
import { colors, radius, spacing } from "@/constants/theme";
import { getArtikelDetail } from "@/lib/api";
import { tipeMeta } from "@/lib/tipeMeta";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from '@/components/PlatformWebView';

const INFO: Record<
  string,
  { title: string; desc: string; icon: any; color: string }
> = {
  jurnal: {
    title: "Jurnal Ilmiah",
    desc: "Artikel ilmiah ini telah melalui proses peer-review dan dipublikasikan dalam jurnal terindeks.",
    icon: "file-text",
    color: "#6366F1",
  },
  panduan: {
    title: "Langkah-langkah Panduan",
    desc: "Ikuti langkah-langkah berikut dengan seksama untuk hasil terbaik.",
    icon: "info",
    color: "#3B82F6",
  },
};

export default function DetailEdukasi() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: a, isLoading } = useQuery({
    queryKey: ["artikel", slug],
    queryFn: () => getArtikelDetail(slug),
  });

  if (isLoading || !a)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );

  const m = tipeMeta(a.tipe);
  const info = INFO[a.tipe];
  const tanggal = a.published_at
    ? new Date(a.published_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail {m.label}</Text>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <Feather name="bookmark" size={20} color={colors.text} />
          <Feather name="share-2" size={20} color={colors.text} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <ImageBackground
          source={a.thumbnail ? { uri: a.thumbnail } : undefined}
          style={styles.hero}
          imageStyle={{ resizeMode: "cover" }}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View
              style={[
                styles.badge,
                { backgroundColor: m.bg, alignSelf: "flex-start" },
              ]}
            >
              <Feather name={m.icon} size={11} color="#fff" />
              <Text style={styles.badgeText}>{m.label}</Text>
            </View>
            <Text style={styles.heroTitle}>{a.judul}</Text>
          </View>
        </ImageBackground>

        {/* Meta */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Feather name="user" size={14} color={colors.subtext} />
            <Text style={styles.metaText}>{a.penulis ?? "Tim Niti Resik"}</Text>
            {!!tanggal && (
              <>
                <Feather
                  name="calendar"
                  size={14}
                  color={colors.subtext}
                  style={{ marginLeft: 14 }}
                />
                <Text style={styles.metaText}>{tanggal}</Text>
              </>
            )}
          </View>
          <View style={[styles.metaRow, { marginTop: 8 }]}>
            <Feather name="clock" size={14} color={colors.subtext} />
            <Text style={styles.metaText}>{a.waktu_baca} menit</Text>
            <Feather
              name="eye"
              size={14}
              color={colors.subtext}
              style={{ marginLeft: 14 }}
            />
            <Text style={styles.metaText}>
              {Number(a.dilihat).toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Info box per tipe */}
          {info && (
            <View
              style={[styles.infoBox, { backgroundColor: info.color + "14" }]}
            >
              <View style={[styles.infoIcon, { backgroundColor: info.color }]}>
                <Feather name={info.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{info.title}</Text>
                <Text style={styles.infoDesc}>{info.desc}</Text>
              </View>
            </View>
          )}

          {/* Video unggulan (YouTube) */}
          {a.video_embed && (
            <View style={styles.video}>
              <WebView
                source={{ uri: a.video_embed }}
                style={{ flex: 1 }}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          )}

          {/* Konten kaya (HTML) */}
          <RichContent html={a.konten_html} />
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
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 14,
  },
  hero: { height: 220, justifyContent: "flex-end", backgroundColor: "#94A3B8" },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  heroContent: { padding: spacing.lg },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 10,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  meta: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: colors.subtext, fontSize: 13 },
  body: { padding: spacing.lg },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  infoDesc: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 19,
  },
  video: {
    height: 210,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#000",
  },
});
