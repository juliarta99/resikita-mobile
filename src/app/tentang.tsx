import { colors, radius, spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tentang() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.hero}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.back}
        >
          <Feather name="arrow-left" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.heroBarTitle}>Tentang Aplikasi</Text>
        <Image
          source={require("@/assets/images/logo-primary.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Resikita</Text>
        <Text style={styles.tagline}>Bersama Wujudkan Bumi Bersih</Text>
        <Text style={styles.ver}>Versi 1.0.0</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Tentang Kami</Text>
          <Text style={styles.p}>
            Resikita adalah platform ekonomi sirkular yang menghubungkan warga
            di seluruh Indonesia dengan ekosistem pengelolaan sampah
            berkelanjutan. Kami percaya sampah bukan sekadar masalah, melainkan
            peluang untuk menciptakan nilai ekonomi sekaligus menjaga
            lingkungan.
          </Text>
          <Text style={styles.p}>
            Dengan dukungan teknologi AI dan jaringan Bank Sampah, kami membantu
            mengubah kebiasaan memilah sampah menjadi kontribusi nyata bagi
            lingkungan yang lebih bersih dan hijau, dari desa hingga kota.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Visi & Misi</Text>
          <Text style={styles.sub}>Visi</Text>
          <Text style={styles.p}>
            Mewujudkan Indonesia bersih sampah melalui pengelolaan yang
            partisipatif, transparan, dan dapat diakses siapa pun.
          </Text>
          <Text style={styles.sub}>Misi</Text>
          <Text style={styles.li}>
            • Mendorong pemilahan sampah dari sumbernya.
          </Text>
          <Text style={styles.li}>
            • Memberi insentif ekonomi melalui Bank Sampah digital.
          </Text>
          <Text style={styles.li}>
            • Mempermudah pelaporan dan pemantauan sampah lewat teknologi.
          </Text>
          <Text style={styles.li}>
            • Menumbuhkan kesadaran lingkungan yang berakar pada kearifan lokal
            masing-masing daerah.
          </Text>
          <Text style={styles.li}>
            • Memastikan layanan tetap terjangkau lewat suara, bagi warga yang
            kesulitan membaca atau mengetik.
          </Text>
        </View>

        <Text style={styles.footer}>© 2026 Resikita</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  hero: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingBottom: 28,
    alignItems: "center",
  },
  back: { alignSelf: "flex-start", paddingVertical: 8 },
  heroBarTitle: {
    position: "absolute",
    top: 10,
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  appName: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
  },
  tagline: { color: colors.white70, fontSize: 13, marginTop: 4 },
  ver: { color: colors.white70, fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand,
    marginTop: 8,
    marginBottom: 4,
  },
  p: { fontSize: 14, color: colors.subtext, lineHeight: 21, marginBottom: 10 },
  li: { fontSize: 14, color: colors.subtext, lineHeight: 22 },
  footer: { textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 8 },
});
