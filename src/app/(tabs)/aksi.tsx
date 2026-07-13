import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, type Href } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = [
  {
    n: "1",
    t: "Ambil Foto",
    d: "Foto sampah dengan jelas atau pilih dari galeri",
  },
  {
    n: "2",
    t: "AI Menganalisis",
    d: "Sistem AI akan mengidentifikasi jenis dan kategori sampah",
  },
  {
    n: "3",
    t: "Dapatkan Saran",
    d: "Terima saran pengolahan dan ide daur ulang",
  },
];

export default function KlasifikasiLanding() {
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) router.replace("/login");
  }, [user]);

  const dariGaleri = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin ditolak", "Beri izin akses galeri.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets[0])
      router.push({
        pathname: "/klasifikasi/hasil",
        params: { uri: res.assets[0].uri },
      } as unknown as Href);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="zap" size={34} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>Klasifikasi AI</Text>
          <Text style={styles.heroSub}>
            Identifikasi jenis sampah dengan teknologi AI
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={styles.btnSolid}
            onPress={() => router.push("/klasifikasi/kamera" as Href)}
          >
            <Feather name="camera" size={20} color={colors.white} />
            <Text style={styles.btnSolidText}>Buka Kamera</Text>
          </Pressable>
          <View style={styles.orRow}>
            <View style={styles.line} />
            <Text style={styles.or}>atau</Text>
            <View style={styles.line} />
          </View>
          <Pressable style={styles.btnOutline} onPress={dariGaleri}>
            <Feather name="image" size={20} color={colors.brand} />
            <Text style={styles.btnOutlineText}>Pilih dari Galeri</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Cara Menggunakan</Text>
            <Pressable
              onPress={() => router.push("/klasifikasi/riwayat" as Href)}
              style={styles.riwayatBtn}
            >
              <Feather name="clock" size={14} color={colors.brand} />
              <Text style={styles.riwayatText}>Riwayat</Text>
            </Pressable>
          </View>
          {STEPS.map((s) => (
            <View key={s.n} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepDesc}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  hero: {
    backgroundColor: colors.bg,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E4F3EC",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  heroSub: { color: colors.white70, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: -36,
    borderRadius: radius.lg,
    padding: spacing.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  btnSolid: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  btnSolidText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 14,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.subtext, fontSize: 13 },
  btnOutline: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  btnOutlineText: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  section: { paddingHorizontal: spacing.lg, marginTop: 24 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  riwayatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCF3EA",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  riwayatText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  step: { flexDirection: "row", gap: 14, marginBottom: 18 },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: colors.white, fontWeight: "700" },
  stepTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  stepDesc: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 3,
    lineHeight: 18,
  },
});
