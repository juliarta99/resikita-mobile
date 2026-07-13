import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profil() {
  const { user, logout } = useAuth();

  if (!user) {
    const fitur = [
      {
        icon: "refresh-ccw" as const,
        title: "Bank Sampah Digital",
        sub: "Tukar sampah jadi rupiah",
      },
      {
        icon: "zap" as const,
        title: "Klasifikasi AI",
        sub: "Identifikasi jenis sampah",
      },
      {
        icon: "award" as const,
        title: "Reward & Pencapaian",
        sub: "Dapatkan badge & poin",
      },
    ];
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={styles.guestHead}>
            <View style={styles.bigAvatar}>
              <Feather name="user" size={40} color={colors.white} />
            </View>
            <Text style={styles.mode}>Mode Tamu</Text>
            <Text style={styles.modeSub}>
              Masuk atau daftar untuk akses fitur lengkap
            </Text>
            <View style={styles.guestBtns}>
              <Pressable
                style={styles.btnWhite}
                onPress={() => router.push("/login")}
              >
                <Feather name="log-in" size={16} color={colors.brand} />
                <Text style={styles.btnWhiteText}>Masuk</Text>
              </Pressable>
              <Pressable
                style={styles.btnGhost}
                onPress={() => router.push("/register")}
              >
                <Feather name="user-plus" size={16} color={colors.white} />
                <Text style={styles.btnGhostText}>Daftar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fitur Setelah Login</Text>
            {fitur.map((f) => (
              <Pressable
                key={f.title}
                style={styles.listItem}
                onPress={() => router.push("/login")}
              >
                <View style={styles.listIcon}>
                  <Feather name={f.icon} size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{f.title}</Text>
                  <Text style={styles.listSub}>{f.sub}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#CBD5E1" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Authed
  const doLogout = () =>
    Alert.alert("Keluar", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/beranda");
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.guestHead}>
          <View style={styles.bigAvatar}>
            <Feather name="user" size={40} color={colors.white} />
          </View>
          <Text style={styles.mode}>{user.name}</Text>
          <Text style={styles.modeSub}>NIK: {user.nik ?? "-"}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.saldoRow}>
            <Text style={{ color: colors.subtext }}>Saldo</Text>
            <Text style={styles.saldo}>
              Rp {Number(user.saldo ?? 0).toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {[
            { icon: "user" as const, label: "Edit Profil" },
            { icon: "lock" as const, label: "Ubah Kata Sandi" },
            { icon: "credit-card" as const, label: "QR Identitas Saya" },
          ].map((m) => (
            <Pressable
              key={m.label}
              style={styles.listItem}
              onPress={() => Alert.alert("Segera", "Halaman ini segera hadir.")}
            >
              <View style={styles.listIconLight}>
                <Feather name={m.icon} size={18} color={colors.brand} />
              </View>
              <Text style={[styles.listTitle, { flex: 1 }]}>{m.label}</Text>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logout} onPress={doLogout}>
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  guestHead: { alignItems: "center", paddingTop: 24, paddingBottom: 20 },
  bigAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  mode: { color: colors.white, fontSize: 20, fontWeight: "700", marginTop: 12 },
  modeSub: { color: colors.white70, fontSize: 13, marginTop: 4 },
  guestBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    paddingHorizontal: spacing.lg,
  },
  btnWhite: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  btnWhiteText: { color: colors.brand, fontWeight: "700" },
  btnGhost: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  btnGhostText: { color: colors.white, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: 14,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  listIconLight: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  listSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  saldoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  saldo: { fontSize: 22, fontWeight: "800", color: colors.brand },
  logout: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginHorizontal: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: "#FEF2F2",
  },
  logoutText: { color: colors.danger, fontWeight: "700" },
});
