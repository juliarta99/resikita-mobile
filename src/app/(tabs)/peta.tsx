import LeafletMap, { LeafletMapHandle } from "@/components/LeafletMap";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { direktori, getPetaLaporan } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = "tps" | "bank" | "laporan";
const DEFAULT = { lat: -8.7906, lng: 115.1663 };

export default function Peta() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("tps");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [center, setCenter] = useState(DEFAULT);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const mapRef = React.useRef<LeafletMapHandle>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoords(c);
      setCenter(c);
      mapRef.current?.setView(c.lat, c.lng, 15);
    })();
  }, []);

  const near = coords ?? undefined;
  const tpsQ = useQuery({
    queryKey: ["peta-tps", coords],
    queryFn: () => direktori("tps", near),
  });
  const bankQ = useQuery({
    queryKey: ["peta-bank", coords],
    queryFn: () => direktori("bank-sampah", near),
  });
  const lapQ = useQuery({
    queryKey: ["peta-lapor", coords],
    queryFn: () => getPetaLaporan(near),
  });

  const cfg = {
    tps: {
      headTitle: "Peta TPS Terdekat",
      sheet: "TPS Terdekat",
      unit: "lokasi",
      q: tpsQ,
      ph: "Cari TPS...",
    },
    bank: {
      headTitle: "Peta Bank Sampah",
      sheet: "Bank Sampah",
      unit: "lokasi",
      q: bankQ,
      ph: "Cari bank sampah...",
    },
    laporan: {
      headTitle: "Peta Laporan Terbaru",
      sheet: "Laporan Sampah",
      unit: "laporan",
      q: lapQ,
      ph: "Cari laporan...",
    },
  }[tab];
  const data: any[] = cfg.q.data ?? [];

  // Filter sesuai kata kunci (nama TPS/Bank atau judul Laporan + alamat)
  const term = query.trim().toLowerCase();
  const filtered = term
    ? data.filter(
        (d: any) =>
          (tab === "laporan" ? d.judul : d.nama)
            ?.toLowerCase()
            .includes(term) || d.alamat?.toLowerCase().includes(term),
      )
    : data;

  const cariData = () => {
    const first = filtered.find((d: any) => d.lat != null && d.lng != null);
    if (first) {
      const c = { lat: Number(first.lat), lng: Number(first.lng) };
      setCenter(c);
      mapRef.current?.setView(c.lat, c.lng, 16);
    }
  };
  const keLokasiSaya = () => {
    if (!coords) return;
    setCenter(coords);
    mapRef.current?.setView(coords.lat, coords.lng, 15);
  };
  const toggleSheet = () => {
    LayoutAnimation.easeInEaseOut();
    setExpanded((e) => !e);
  };

  const openDetail = (item: any) => {
    if (tab === "tps") router.push(`/tps/${item.id}`);
    else if (tab === "bank") router.push(`/bank-sampah/${item.id}`);
    else router.push(`/lapor/${item.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ height: insets.top, backgroundColor: colors.bg }} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{cfg.headTitle}</Text>
        <View style={styles.tabs}>
          {(["tps", "bank", "laporan"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "tps" ? "TPS" : t === "bank" ? "Bank Sampah" : "Laporan"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Map */}
      <View style={{ flex: 1 }}>
        <LeafletMap
          ref={mapRef}
          style={{ flex: 1 }}
          center={center}
          zoom={15}
          markers={filtered
            .filter((d: any) => d.lat != null && d.lng != null)
            .map((d: any) => ({
              id: d.id,
              lat: Number(d.lat),
              lng: Number(d.lng),
              color: tab === "laporan" ? "amber" : "green",
              label: tab === "laporan" ? d.judul : d.nama,
            }))}
          onMarkerPress={(id: string | number) => {
            const item = filtered.find((x: any) => String(x.id) === String(id));
            if (item) openDetail(item);
          }}
        />

        {/* Search overlay */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={colors.subtext} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={cariData}
              placeholder={cfg.ph}
              placeholderTextColor="#9AA5B1"
              returnKeyType="search"
            />
          </View>
          <Pressable style={styles.locBtn} onPress={keLokasiSaya}>
            <Feather name="navigation" size={18} color={colors.brand} />
          </Pressable>
        </View>

        {/* FABs: hanya untuk pengguna yang sudah login */}
        {user && (
          <View style={styles.fabs}>
            <Pressable
              style={styles.fabWhite}
              onPress={() => router.push("/lapor/riwayat")}
            >
              <Feather name="clock" size={20} color={colors.brand} />
            </Pressable>
            <Pressable
              style={styles.fabRed}
              onPress={() => router.push("/lapor")}
            >
              <Feather name="alert-triangle" size={22} color={colors.white} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { height: expanded ? 420 : 190 }]}>
        <Pressable style={styles.grabber} onPress={toggleSheet}>
          <Feather
            name={expanded ? "chevron-down" : "chevron-up"}
            size={20}
            color={colors.subtext}
          />
        </Pressable>
        <Text style={styles.sheetTitle}>{cfg.sheet}</Text>
        <Text style={styles.sheetSub}>
          {cfg.q.isLoading
            ? "Memuat…"
            : `${filtered.length} ${cfg.unit} ditemukan`}
        </Text>
        {cfg.q.isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => `${tab}-${i.id}`}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlaceCard
                tab={tab}
                item={item}
                onPress={() => openDetail(item)}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {term ? "Tidak ada hasil yang cocok." : "Belum ada data."}
              </Text>
            }
          />
        )}
      </View>
    </View>
  );
}

function PlaceCard({
  tab,
  item,
  onPress,
}: {
  tab: Tab;
  item: any;
  onPress: () => void;
}) {
  const dist = item.jarak_km != null ? `${item.jarak_km} km` : null;
  const iconBg = tab === "laporan" ? "#F59E0B" : colors.brand;
  const icon =
    tab === "bank"
      ? "refresh-ccw"
      : tab === "laporan"
        ? "alert-triangle"
        : "map-pin";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={20} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {tab === "laporan" ? item.judul : item.nama}
          </Text>
          {tab === "tps" && (
            <Tag
              text={
                item.berbayar
                  ? `Rp${Number(item.tarif).toLocaleString("id-ID")}`
                  : "Gratis"
              }
              tone={item.berbayar ? "amber" : "green"}
            />
          )}
          {tab === "laporan" && <Tag text={item.status} tone="amber" />}
        </View>
        <Text style={styles.cardAddr} numberOfLines={1}>
          {item.alamat ?? "-"}
        </Text>
        <View style={styles.cardMeta}>
          {dist && (
            <>
              <Feather name="navigation" size={12} color={colors.subtext} />
              <Text style={styles.metaText}>{dist}</Text>
            </>
          )}
          {tab === "laporan" && item.kategori && (
            <Text style={[styles.tagGreen, { marginLeft: dist ? 8 : 0 }]}>
              {item.kategori}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Tag({ text, tone }: { text: string; tone: "green" | "amber" }) {
  const c =
    tone === "amber"
      ? { bg: "#FEF3C7", fg: "#B45309" }
      : { bg: "#DCF3EA", fg: colors.brand };
  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "700" }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.brand },
  tabText: { color: colors.subtext, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.white },
  searchWrap: {
    position: "absolute",
    top: 12,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 46,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, color: colors.text },
  locBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabs: {
    position: "absolute",
    right: spacing.md,
    bottom: 24,
    gap: 12,
    alignItems: "center",
  },
  fabWhite: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  fabRed: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  grabber: { alignSelf: "center", paddingVertical: 6 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  sheetSub: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F6FBF9",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E4F0EB",
    padding: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  cardAddr: { fontSize: 12, color: colors.subtext, marginTop: 3 },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaText: { fontSize: 12, color: colors.subtext },
  tagGreen: {
    backgroundColor: "#DCF3EA",
    color: colors.brand,
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  empty: { textAlign: "center", color: colors.subtext, marginTop: 20 },
});
