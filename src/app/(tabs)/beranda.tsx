import KartuArtikel from "@/components/KartuArtikel";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { evaluate, Stats } from "@/lib/achievements";
import { useJumlahNotifikasi } from "@/hooks/useNotifikasi";
import { useStatistikSaya } from "@/hooks/useStatistikSaya";
import { daftarArtikel } from "@/lib/api/artikel";
import { statistikPublik } from "@/lib/api/publik";
import { notify } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Item = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  go: () => void;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function Beranda() {
  const { user } = useAuth();
  const soon = () => notify("Segera", "Fitur ini akan segera hadir.");
  const enabled = !!user;

  const stat = useStatistikSaya(enabled);
  const jumlahNotifikasi = useJumlahNotifikasi(enabled);

  const artikelQ = useQuery({
    queryKey: ["artikel", "unggulan"],
    queryFn: () => daftarArtikel({ unggulan: true, per_page: 3 }),
    staleTime: 10 * 60_000,
  });

  /**
   * Statistik nasional untuk tamu maupun pengguna terdaftar.
   *
   * Peladen men-cache-nya 15 menit, jadi `staleTime` di sini mengikuti angka
   * yang sama — memanggil lebih sering hanya menghabiskan kuota untuk jawaban
   * yang identik.
   */
  const publikQ = useQuery({
    queryKey: ["publik", "statistik"],
    queryFn: statistikPublik,
    staleTime: 15 * 60_000,
  });

  const stats: Stats = {
    saldo: stat.saldo,
    totalSetorKg: stat.totalSetorKg,
    jumlahSetor: stat.jumlahSetor,
    jumlahBelanja: stat.jumlahPesanan,
    jumlahLaporan: stat.jumlahLaporan,
    jumlahKlasifikasi: stat.jumlahKlasifikasi,
    jumlahTps: 0,
  };
  const achievements = evaluate(stats);
  const artikel = artikelQ.data?.data ?? [];
  const saldo = stat.saldo;

  /* ---------------- GUEST ---------------- */
  if (!user) {
    const fiturPublik: Item[] = [
      {
        key: "edukasi",
        label: "Edukasi",
        icon: "book-open",
        go: () => router.push("/edukasi"),
      },
      {
        key: "fasilitas",
        label: "TPS & Bank Sampah",
        icon: "map",
        go: () => router.push("/peta"),
      },
      {
        key: "belanja",
        label: "Belanja",
        icon: "shopping-bag",
        go: () => router.push("/pasar"),
      },
    ];
    const terkunci: Item[] = [
      {
        key: "setoran",
        label: "Setoran",
        icon: "lock",
        go: () => router.push("/login"),
      },
      {
        key: "scan",
        label: "Scan AI",
        icon: "lock",
        go: () => router.push("/login"),
      },
      {
        key: "chatbot",
        label: "Chatbot",
        icon: "lock",
        go: () => router.push("/login"),
      },
    ];
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.hi}>Selamat Datang di</Text>
                <Text style={styles.brand}>Resikita</Text>
              </View>
            </View>
            <Pressable
              style={styles.avatar}
              onPress={() => router.push("/login")}
            >
              <Feather name="log-in" size={20} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Bersama Wujudkan Bumi Bersih</Text>
            <Text style={styles.heroDesc}>
              Tukar sampah jadi rupiah, belanja produk ramah lingkungan, dan
              berkontribusi untuk bumi yang lebih hijau.
            </Text>
            <View style={styles.heroBtns}>
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
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Fitur Utama</Text>
            <View style={styles.grid3}>
              {fiturPublik.map((f) => (
                <Tile key={f.key} item={f} />
              ))}
            </View>
            <Text style={styles.hint}>
              Fitur lengkap tersedia setelah login
            </Text>
            <View style={styles.grid3}>
              {terkunci.map((f) => (
                <Tile key={f.key} item={f} locked />
              ))}
            </View>
          </View>

          {/* Artikel Pilihan */}
          <View style={styles.pencapaianHead}>
            <Text style={styles.sheetTitle}>Artikel Pilihan</Text>
            <Pressable
              onPress={() => router.push("/edukasi")}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={styles.lihatSemua}>Lihat Semua</Text>
              <Feather name="chevron-right" size={16} color={colors.brand} />
            </Pressable>
          </View>
          <View
            style={{
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.card,
            }}
          >
            {artikel.length === 0 ? (
              <Text style={styles.emptyMini}>Belum ada artikel.</Text>
            ) : (
              artikel.map((a) => <KartuArtikel key={a.slug} a={a} />)
            )}
          </View>

          {/* Promo / entry fitur */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: 16 }}>
            <PromoCard
              solid
              icon="refresh-ccw"
              title="Bank Sampah Digital"
              desc="Tukar sampah jadi rupiah. Lingkungan bersih, dompet terisi!"
              cta="Mulai Sekarang"
              onPress={() => router.push("/login")}
            />
            <PromoCard
              tinted
              icon="zap"
              title="Klasifikasi AI"
              desc="Scan sampah dengan AI untuk identifikasi jenis dan cara pengolahan."
              cta="Coba Sekarang"
              onPress={() => router.push("/login")}
            />
            <PromoCard
              outline
              icon="shopping-bag"
              title="E-Commerce Ramah Lingkungan"
              desc="Belanja produk eco-friendly dengan saldo Bank Sampah."
              cta="Belanja Sekarang"
              onPress={() => router.push("/pasar")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------- AUTHED ---------------- */
  /*
    Empat angka dihapus dari kartu ini: berat sampah, CO₂ tersimpan, setara
    pohon, dan tren persen bulan ini vs bulan lalu.

    Keempatnya dihitung dari `GET /setoran` **halaman pertama saja** — pengguna
    dengan 200 setoran melihat angka yang berasal dari 15 di antaranya. Salah,
    tapi tampak presisi, dan itu gabungan terburuk. Tidak ada endpoint yang
    mengembalikan akumulasi berat setoran (catatan T18); begitu peladen
    menyediakannya, keempatnya bisa kembali dengan angka yang benar.

    Yang menggantikan: jumlah setoran, laporan, dan sampah terpindai — semuanya
    dari `meta.total`, yang memang jumlah sebenarnya di peladen.
  */

  const aksi: Item[] = [
    {
      key: "bank",
      label: "Bank Sampah",
      icon: "refresh-ccw",
      go: () => router.push("/dompet"),
    },
    {
      key: "scan",
      label: "Scan AI",
      icon: "zap",
      go: () => router.push("/aksi"),
    },
    {
      key: "belanja",
      label: "Belanja",
      icon: "shopping-bag",
      go: () => router.push("/pasar"),
    },
    {
      key: "lapor",
      label: "Laporan",
      icon: "alert-triangle",
      go: () => router.push("/lapor"),
    },
    {
      key: "tarik",
      label: "Tarik Saldo",
      icon: "credit-card",
      go: () => router.push("/dompet/tarik"),
    },
    {
      key: "edukasi",
      label: "Edukasi",
      icon: "book-open",
      go: () => router.push("/edukasi"),
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* Greeting */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.hi}>Selamat Datang,</Text>
            <Text style={styles.brand} numberOfLines={1}>
              {user.name}
            </Text>
          </View>
          <Pressable
            style={styles.lonceng}
            onPress={() => router.push("/notifikasi" as Href)}
            accessibilityRole="button"
            accessibilityLabel={
              jumlahNotifikasi > 0
                ? `Notifikasi, ${jumlahNotifikasi} belum dibaca`
                : "Notifikasi"
            }
          >
            <Feather name="bell" size={22} color={colors.white} />
            {jumlahNotifikasi > 0 && (
              <View style={styles.lencana}>
                <Text style={styles.lencanaTeks}>
                  {jumlahNotifikasi > 99 ? "99+" : jumlahNotifikasi}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.avatarInit}
            onPress={() => router.push("/profil")}
            accessibilityRole="button"
            accessibilityLabel="Buka profil saya"
          >
            <Text style={styles.avatarInitText}>{initials(user.name)}</Text>
          </Pressable>
        </View>

        {/* Saldo + eco stats */}
        <View style={styles.saldoCard}>
          <View style={styles.saldoTop}>
            <Text style={styles.saldoLabel}>Total Saldo</Text>
          </View>
          <Text
            style={styles.saldoValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={`Total saldo Anda ${formatRupiah(saldo)}`}
          >
            {stat.memuat ? "—" : formatRupiah(saldo)}
          </Text>
          <View style={styles.statsRow}>
            <Stat
              icon="package"
              label="Setoran"
              value={stat.memuat ? "—" : String(stat.jumlahSetor)}
            />
            <Stat
              icon="file-text"
              label="Laporan"
              value={stat.memuat ? "—" : String(stat.jumlahLaporan)}
            />
            <Stat
              icon="camera"
              label="Dipindai"
              value={stat.memuat ? "—" : String(stat.jumlahKlasifikasi)}
            />
          </View>
        </View>

        {/* Aksi Cepat */}
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Aksi Cepat</Text>
          <View style={styles.aksiGrid}>
            {aksi.map((a) => (
              <Pressable key={a.key} style={styles.aksiItem} onPress={a.go}>
                <View style={styles.aksiIcon}>
                  <Feather name={a.icon} size={22} color={colors.brand} />
                </View>
                <Text style={styles.aksiLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pencapaian */}
        <View style={styles.pencapaianHead}>
          <Text style={styles.sheetTitle}>Pencapaian Terbaru</Text>
          <Pressable
            onPress={() => router.push("/pencapaian")}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Text style={styles.lihatSemua}>Lihat Semua</Text>
            <Feather name="chevron-right" size={16} color={colors.brand} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            gap: 12,
            backgroundColor: colors.card,
          }}
        >
          {achievements.map((a) => (
            <View
              key={a.key}
              style={[styles.badgeCard, !a.done && styles.badgeLocked]}
            >
              <View
                style={[
                  styles.badgeIcon,
                  !a.done && { backgroundColor: "#E2E8F0" },
                ]}
              >
                <Feather
                  name={
                    a.done === true
                      ? (a.icon as keyof typeof Feather.glyphMap)
                      : a.done === false
                        ? "lock"
                        : "help-circle"
                  }
                  size={22}
                  color={a.done ? colors.brand : "#94A3B8"}
                />
              </View>
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

        {/* Artikel Pilihan */}
        <View style={styles.pencapaianHead}>
          <Text style={styles.sheetTitle}>Artikel Pilihan</Text>
          <Pressable
            onPress={() => router.push("/edukasi")}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Text style={styles.lihatSemua}>Lihat Semua</Text>
            <Feather name="chevron-right" size={16} color={colors.brand} />
          </Pressable>
        </View>
        <View
          style={{
            paddingHorizontal: spacing.lg,
            backgroundColor: colors.card,
          }}
        >
          {artikel.length === 0 ? (
            <Text style={styles.emptyMini}>Belum ada artikel.</Text>
          ) : (
            artikel.map((a) => <KartuArtikel key={a.slug} a={a} />)
          )}
        </View>

        {/* Promo / entry fitur */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 16 }}>
          <PromoCard
            solid
            icon="refresh-ccw"
            title="Bank Sampah Digital"
            desc="Tukar sampah jadi rupiah. Lingkungan bersih, dompet terisi!"
            cta="Mulai Sekarang"
            onPress={() => router.push("/dompet")}
          />
          <PromoCard
            tinted
            icon="zap"
            title="Klasifikasi AI"
            desc="Scan sampah dengan AI untuk identifikasi jenis dan cara pengolahan."
            cta="Coba Sekarang"
            onPress={() => router.push("/aksi")}
          />
          <PromoCard
            outline
            icon="shopping-bag"
            title="E-Commerce Ramah Lingkungan"
            desc="Belanja produk eco-friendly dengan saldo Bank Sampah."
            cta="Belanja Sekarang"
            onPress={() => router.push("/pasar")}
          />
        </View>
      </ScrollView>

      {/* Floating chatbot */}
      <Pressable style={styles.chatFab} onPress={() => router.push("/chatbot")}>
        <Feather name="message-circle" size={24} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function Tile({ item, locked }: { item: Item; locked?: boolean }) {
  return (
    <Pressable
      style={[styles.tile, locked && styles.tileLocked]}
      onPress={item.go}
    >
      <Feather
        name={item.icon}
        size={22}
        color={locked ? "#9AA5B1" : colors.brand}
      />
      <Text style={[styles.tileText, locked && { color: "#9AA5B1" }]}>
        {item.label}
      </Text>
    </Pressable>
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
      <Feather name={icon} size={16} color={colors.white} />
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
function PromoCard({
  icon,
  title,
  desc,
  cta,
  onPress,
  solid,
  tinted,
  outline,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  cta: string;
  onPress: () => void;
  solid?: boolean;
  tinted?: boolean;
  outline?: boolean;
}) {
  const dark = !!solid;
  const bg = solid ? colors.brand : tinted ? "#E4F3EC" : colors.white;
  const fg = dark ? colors.white : colors.text;
  const sub = dark ? "rgba(255,255,255,0.85)" : colors.subtext;
  return (
    <Pressable
      style={[
        styles.promo,
        { backgroundColor: bg },
        outline && styles.promoOutline,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.promoIcon,
          { backgroundColor: dark ? "rgba(255,255,255,0.18)" : "#DCF3EA" },
        ]}
      >
        <Feather
          name={icon}
          size={22}
          color={dark ? colors.white : colors.brand}
        />
      </View>
      <Text style={[styles.promoTitle, { color: fg }]}>{title}</Text>
      <Text style={[styles.promoDesc, { color: sub }]}>{desc}</Text>
      <View style={styles.promoCta}>
        <Text
          style={[
            styles.promoCtaText,
            { color: dark ? colors.white : colors.brand },
          ]}
        >
          {cta}
        </Text>
        <Feather
          name="arrow-right"
          size={16}
          color={dark ? colors.white : colors.brand}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  petugasKartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0F766E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    minHeight: 44,
  },
  petugasIkon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  petugasJudul: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  petugasSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    marginTop: 3,
    lineHeight: 17,
  },
  petugasLencana: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  petugasLencanaTeks: { color: "#0F766E", fontSize: 12, fontWeight: "800" },
  lonceng: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  lencana: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  lencanaTeks: { color: colors.white, fontSize: 10, fontWeight: "700" },
  logo: { width: 34, height: 34 },
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 14,
  },
  hi: { color: colors.white70, fontSize: 13 },
  brand: { color: colors.white, fontSize: 22, fontWeight: "700" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInit: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  hero: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white15,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  heroDesc: {
    color: colors.white70,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 19,
  },
  heroBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  btnWhite: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  btnWhiteText: { color: colors.brand, fontWeight: "700" },
  btnGhost: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  btnGhostText: { color: colors.white, fontWeight: "700" },
  saldoCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  saldoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saldoLabel: { color: colors.white70, fontSize: 13 },
  trend: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  saldoValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  statLabel: { color: colors.white70, fontSize: 12 },
  statValue: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 20,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  grid3: { flexDirection: "row", gap: 12, marginBottom: 8 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#D8EFE7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tileLocked: { borderColor: colors.border, backgroundColor: "#F8FAFC" },
  tileText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    color: colors.subtext,
    fontSize: 12,
    marginVertical: 14,
  },
  aksiGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 20 },
  aksiItem: { width: "33.33%", alignItems: "center", gap: 8 },
  aksiIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EAF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  aksiLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  pencapaianHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 12,
  },
  lihatSemua: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  badgeCard: {
    width: 96,
    backgroundColor: "#E9F7F0",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  badgeLocked: { backgroundColor: "#F1F5F9" },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  emptyMini: { color: colors.subtext, fontSize: 13, paddingVertical: 8 },
  // Rupa kartu artikel pindah ke `components/KartuArtikel.tsx` supaya beranda
  // tamu dan beranda pengguna terdaftar tidak bisa lagi berbeda isinya.
  promo: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: 14 },
  promoOutline: { borderWidth: 1, borderColor: colors.border },
  promoIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  promoTitle: { fontSize: 17, fontWeight: "700" },
  promoDesc: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  promoCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  promoCtaText: { fontWeight: "700", fontSize: 14 },
  chatFab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
