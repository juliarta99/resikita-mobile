import { colors, radius, spacing } from "@/constants/theme";
import { getKlasifikasiDetail, hapusKlasifikasi } from "@/lib/api";
import { katColor } from "@/lib/katColor";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DetailRiwayat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c, isLoading } = useQuery({
    queryKey: ["klasifikasi", id],
    queryFn: () => getKlasifikasiDetail(id),
  });

  const hapus = () =>
    Alert.alert("Hapus Riwayat", "Yakin menghapus riwayat ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await hapusKlasifikasi(id);
          router.back();
        },
      },
    ]);

  if (isLoading || !c)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );

  const kc = katColor(c.kategori);
  const tanggal = new Date(c.tanggal).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const waktu =
    new Date(c.tanggal).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail Riwayat</Text>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <Feather name="share-2" size={20} color={colors.text} />
          <Pressable onPress={hapus} hitSlop={8}>
            <Feather name="trash-2" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          {c.foto ? (
            <Image source={{ uri: c.foto }} style={styles.heroImg} />
          ) : (
            <Feather name="image" size={40} color="#CBD5E1" />
          )}
        </View>

        <View style={styles.body}>
          <View style={[styles.kat, { backgroundColor: "#DCF3EA" }]}>
            <Text
              style={{ color: colors.brand, fontWeight: "700", fontSize: 12 }}
            >
              {c.kategori_label}
              {c.material ? " - " + c.material : ""}
            </Text>
          </View>
          <Text style={styles.name}>{c.hasil_jenis}</Text>
          {!!c.deskripsi && <Text style={styles.desc}>{c.deskripsi}</Text>}

          <View style={styles.dtRow}>
            <View style={styles.dtCard}>
              <View style={styles.dtHead}>
                <Feather name="calendar" size={14} color={colors.subtext} />
                <Text style={styles.dtLabel}>Tanggal</Text>
              </View>
              <Text style={styles.dtVal}>{tanggal}</Text>
            </View>
            <View style={styles.dtCard}>
              <View style={styles.dtHead}>
                <Feather name="clock" size={14} color={colors.subtext} />
                <Text style={styles.dtLabel}>Waktu</Text>
              </View>
              <Text style={styles.dtVal}>{waktu}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Klasifikasi</Text>
            <InfoRow
              icon="target"
              label="Akurasi AI"
              value={`${c.akurasi_persen}%`}
            />
            <InfoRow
              icon="refresh-ccw"
              label="Dapat Didaur Ulang"
              value={c.dapat_didaur_ulang ? "Ya" : "Tidak"}
            />
            <InfoRow
              icon="trending-up"
              label="Nilai Jual"
              value={
                c.nilai_jual > 0
                  ? `Rp ${Number(c.nilai_jual).toLocaleString("id-ID")}/kg`
                  : "-"
              }
            />
            <InfoRow
              icon="box"
              label="Estimasi Berat"
              value={`${c.estimasi_berat} kg`}
              last
            />
          </View>

          {(c.langkah_pengolahan ?? []).length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Langkah Pengolahan</Text>
              {c.langkah_pengolahan.map((l: string, i: number) => (
                <View key={i} style={styles.langkah}>
                  <View style={styles.langkahNum}>
                    <Text style={styles.langkahNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.langkahText}>{l}</Text>
                </View>
              ))}
            </View>
          )}
          {!!c.rekomendasi && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rekomendasi Daur Ulang</Text>
              <Text style={styles.desc}>{c.rekomendasi}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: any;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoLeft}>
        <Feather name={icon} size={16} color={colors.brand} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  hero: {
    height: 260,
    backgroundColor: "#DDE6E2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  body: { padding: spacing.lg },
  kat: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 12 },
  desc: { fontSize: 14, color: colors.subtext, marginTop: 8, lineHeight: 20 },
  dtRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  dtCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
  },
  dtHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  dtLabel: { color: colors.subtext, fontSize: 12 },
  dtVal: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { color: colors.text, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  langkah: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignItems: "flex-start",
  },
  langkahNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  langkahNumText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  langkahText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
});
