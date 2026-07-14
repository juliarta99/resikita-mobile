import LeafletMap from "@/components/LeafletMap";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { gabungTps, getTpsDetail, getTpsSaya } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const openGoogleMaps = (lat: number, lng: number) =>
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  );

export default function TpsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loadingJoin, setLoadingJoin] = React.useState(false);

  const detailQ = useQuery({
    queryKey: ["tps", id],
    queryFn: () => getTpsDetail(id),
  });
  const sayaQ = useQuery({
    queryKey: ["tps-saya"],
    queryFn: getTpsSaya,
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      if (user) qc.invalidateQueries({ queryKey: ["tps-saya"] });
    }, [user]),
  );

  const tps = detailQ.data;
  const membership = (sayaQ.data ?? []).find(
    (m: any) => String(m.tps?.id) === String(id),
  );
  const sudahAktif = membership?.status === "aktif";

  const daftar = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (sudahAktif) return;
    setLoadingJoin(true);
    try {
      const res = await gabungTps(id);
      const d = res.data;
      if (d.berbayar && d.snap_token) {
        router.push({
          pathname: "/bayar",
          params: { snap_token: d.snap_token, title: "Iuran TPS" },
        });
      } else {
        Alert.alert("Berhasil", "Anda kini terdaftar sebagai nasabah TPS ini.");
        qc.invalidateQueries({ queryKey: ["tps-saya"] });
      }
    } catch (e: any) {
      Alert.alert(
        "Gagal",
        e?.response?.data?.message ?? "Tidak dapat mendaftar. Coba lagi.",
      );
    } finally {
      setLoadingJoin(false);
    }
  };

  if (detailQ.isLoading || !tps) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const hasCoord = tps.lat != null && tps.lng != null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Detail TPS</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {hasCoord && (
          <LeafletMap
            style={styles.map}
            center={{ lat: Number(tps.lat), lng: Number(tps.lng) }}
            zoom={16}
            markers={[
              {
                id: tps.id,
                lat: Number(tps.lat),
                lng: Number(tps.lng),
                color: "green",
              },
            ]}
          />
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{tps.nama}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: tps.berbayar ? "#FEF3C7" : "#DCF3EA" },
              ]}
            >
              <Text
                style={{
                  color: tps.berbayar ? "#B45309" : colors.brand,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {tps.berbayar ? "Berbayar" : "Gratis"}
              </Text>
            </View>
          </View>
          <Row icon="map-pin" text={tps.alamat} />
          {tps.jarak_km != null && (
            <Row
              icon="navigation"
              text={`${tps.jarak_km} km dari lokasi Anda`}
            />
          )}

          {/* Tombol Google Maps */}
          {hasCoord && (
            <Pressable
              style={styles.mapsBtn}
              onPress={() => openGoogleMaps(Number(tps.lat), Number(tps.lng))}
            >
              <Feather name="map" size={18} color={colors.brand} />
              <Text style={styles.mapsBtnText}>Lihat di Google Maps</Text>
              <Feather name="external-link" size={16} color={colors.brand} />
            </Pressable>
          )}

          <View style={styles.stats}>
            <Stat
              icon="users"
              label="Total Nasabah"
              value={`${tps.jumlah_nasabah}`}
            />
            <Stat
              icon="tag"
              label="Iuran"
              value={
                tps.berbayar
                  ? `Rp${Number(tps.tarif).toLocaleString("id-ID")}`
                  : "Gratis"
              }
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Kontak</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Feather name="phone" size={18} color={colors.white} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Kontak</Text>
                <Text style={styles.infoVal}>{tps.no_hp ?? "-"}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        {!user ? (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.ctaText}>Masuk untuk Daftar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.ctaBtn,
              sudahAktif && { backgroundColor: colors.muted },
            ]}
            onPress={daftar}
            disabled={sudahAktif || loadingJoin}
          >
            {loadingJoin ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.ctaText}>
                {sudahAktif
                  ? "Anda Sudah Nasabah"
                  : tps.berbayar
                    ? `Daftar Nasabah | Rp${Number(tps.tarif).toLocaleString("id-ID")}`
                    : "Daftar sebagai Nasabah"}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const Row = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.row}>
    <Feather name={icon} size={15} color={colors.subtext} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);
const Stat = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.stat}>
    <Feather name={icon} size={18} color={colors.brand} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statVal}>{value}</Text>
  </View>
);

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
  map: { height: 180 },
  body: { padding: spacing.lg },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.text },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  rowText: { color: colors.subtext, fontSize: 14, flex: 1 },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "#EAF7F1",
  },
  mapsBtnText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  stats: { flexDirection: "row", gap: 12, marginTop: 18 },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    gap: 6,
  },
  statLabel: { color: colors.subtext, fontSize: 12 },
  statVal: { color: colors.text, fontSize: 18, fontWeight: "800" },
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
    marginBottom: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: colors.subtext, fontSize: 12 },
  infoVal: { color: colors.text, fontSize: 15, fontWeight: "600" },
  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
