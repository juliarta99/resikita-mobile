import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { evaluate, EvaluatedAchievement, Stats } from "@/lib/achievements";
import { getPesanan, getSaldo, getSetoran } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const initials = (name: string) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

const MENU: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  sub: string;
  go: () => void;
}[] = [
  {
    icon: "settings",
    title: "Pengaturan",
    sub: "Preferensi & keamanan akun",
    go: () => router.push("/pengaturan" as Href),
  },
  {
    icon: "help-circle",
    title: "Bantuan & FAQ",
    sub: "Pertanyaan umum",
    go: () => router.push("/bantuan" as Href),
  },
  {
    icon: "info",
    title: "Tentang Aplikasi",
    sub: "Informasi Niti Resik",
    go: () => router.push("/tentang" as Href),
  },
  {
    icon: "shield",
    title: "Kebijakan Privasi",
    sub: "Perlindungan data",
    go: () => router.push("/privasi" as Href),
  },
  {
    icon: "file-text",
    title: "Syarat & Ketentuan",
    sub: "Aturan penggunaan",
    go: () => router.push("/syarat" as Href),
  },
];

export default function Profil() {
  const { user, logout } = useAuth();
  const enabled = !!user;

  const saldoQ = useQuery({ queryKey: ["saldo"], queryFn: getSaldo, enabled });
  const setoranQ = useQuery({
    queryKey: ["setoran"],
    queryFn: getSetoran,
    enabled,
  });
  const pesananQ = useQuery({
    queryKey: ["pesanan-ringkas"],
    queryFn: () => getPesanan(),
    enabled,
  });

  const asList = (d: any) => (Array.isArray(d) ? d : (d?.data ?? []));
  const setoranList = asList(setoranQ.data);
  const totalSetorKg = setoranList.reduce(
    (n: number, s: any) =>
      n + Number(s.berat ?? s.berat_kg ?? s.total_berat ?? 0),
    0,
  );
  const saldo = saldoQ.data ?? Number(user?.saldo ?? 0);
  const jumlahBelanja = pesananQ.data?.total ?? asList(pesananQ.data).length;

  const stats: Stats = {
    saldo,
    totalSetorKg,
    jumlahSetor: setoranList.length,
    jumlahBelanja,
    jumlahLaporan: 0,
    jumlahKlasifikasi: 0,
    jumlahTps: 0,
  };
  const achievements = evaluate(stats);

  const co2Kg = Math.round(totalSetorKg * 3);
  const pohon = Math.round(totalSetorKg / 7);
  const ribu = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

  if (!user) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.guest}>
          <View style={styles.guestIcon}>
            <Feather name="user" size={34} color={colors.brand} />
          </View>
          <Text style={styles.guestTitle}>Belum Masuk</Text>
          <Text style={styles.guestDesc}>
            Masuk untuk mengakses profil, saldo, dan pencapaianmu.
          </Text>
          <Pressable
            style={styles.guestBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.guestBtnText}>Masuk / Daftar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const bergabung = user.bergabung
    ? new Date(user.bergabung).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : null;

  const keluar = () =>
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => logout() },
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>Profil Saya</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            {!!user.email && <Text style={styles.email}>{user.email}</Text>}
            {!!user.kode_qr && (
              <Text style={styles.idNasabah}>ID: {user.kode_qr}</Text>
            )}
          </View>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push("/profil/edit" as Href)}
          >
            <Feather name="edit-2" size={18} color={colors.white} />
          </Pressable>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Stat icon="credit-card" label="Saldo" value={`Rp${ribu(saldo)}`} />
            <Stat
              icon="shopping-bag"
              label="Pesanan"
              value={`${jumlahBelanja}`}
            />
            <Stat
              icon="refresh-ccw"
              label="Daur Ulang"
              value={`${totalSetorKg}kg`}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.ecoRow}>
            <View style={styles.ecoBox}>
              <Text style={styles.ecoLabel}>CO₂ Tersimpan</Text>
              <Text style={styles.ecoValue}>{co2Kg} kg</Text>
            </View>
            <View style={styles.ecoBox}>
              <Text style={styles.ecoLabel}>Setara Pohon</Text>
              <Text style={styles.ecoValue}>{pohon} pohon</Text>
            </View>
          </View>
        </View>

        {/* Pencapaian */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Feather name="award" size={18} color={colors.brand} />
            <Text style={styles.sectionTitle}>Pencapaian</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
          >
            {achievements.map((a: EvaluatedAchievement) => (
              <View
                key={a.key}
                style={[styles.badge, !a.done && styles.badgeLocked]}
              >
                <Feather
                  name={(a.done ? a.icon : "lock") as any}
                  size={22}
                  color={a.done ? colors.brand : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: a.done ? colors.text : "#94A3B8" },
                  ]}
                  numberOfLines={2}
                >
                  {a.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleAlt}>Pengaturan & Lainnya</Text>
          {MENU.map((m) => (
            <Pressable key={m.title} style={styles.menuRow} onPress={m.go}>
              <View style={styles.menuIcon}>
                <Feather name={m.icon} size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{m.title}</Text>
                <Text style={styles.menuSub}>{m.sub}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </Pressable>
          ))}
        </View>

        {/* Keluar */}
        <Pressable style={styles.logout} onPress={keluar}>
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>

        <Text style={styles.footer}>
          {bergabung ? `Bergabung sejak ${bergabung}` : "Niti Resik"}
        </Text>
        <Text style={styles.footerVer}>Niti Resik v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Feather name={icon} size={18} color={colors.brand} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pageTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: 14,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 20 },
  name: { color: colors.white, fontSize: 19, fontWeight: "700" },
  email: { color: colors.white70, fontSize: 13, marginTop: 2 },
  idNasabah: { color: colors.white70, fontSize: 12, marginTop: 2 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  statsCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: -6,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center", gap: 6 },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 12, color: colors.subtext },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  ecoRow: { flexDirection: "row", gap: 12 },
  ecoBox: {
    flex: 1,
    backgroundColor: "#F1F8F5",
    borderRadius: radius.md,
    padding: 14,
  },
  ecoLabel: { fontSize: 12, color: colors.subtext },
  ecoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand,
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 16,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  sectionTitleAlt: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  badge: {
    width: 92,
    backgroundColor: "#E9F7F0",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  badgeLocked: { backgroundColor: "#F1F5F9" },
  badgeText: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  menuSub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginTop: 18,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FBD5D5",
    backgroundColor: "#FEF2F2",
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  footer: {
    textAlign: "center",
    color: colors.subtext,
    fontSize: 12,
    marginTop: 20,
  },
  footerVer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  guest: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 6,
  },
  guestIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  guestTitle: { color: colors.white, fontSize: 20, fontWeight: "700" },
  guestDesc: {
    color: colors.white70,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  guestBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  guestBtnText: { color: colors.brand, fontWeight: "700" },
});
