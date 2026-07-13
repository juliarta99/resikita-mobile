import LeafletMap, { LeafletMapHandle } from "@/components/LeafletMap";
import { colors, radius, spacing } from "@/constants/theme";
import { locationDraft } from "@/lib/draft";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT = { lat: -8.7906, lng: 115.1663 };

export default function PilihLokasi() {
  const [center, setCenter] = useState(DEFAULT);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [alamat, setAlamat] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const mapRef = React.useRef<LeafletMapHandle>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const p = await Location.getCurrentPositionAsync({});
      const c = { lat: p.coords.latitude, lng: p.coords.longitude };
      setCenter(c);
      setPicked(c);
      reverse(c);
      mapRef.current?.setView(c.lat, c.lng, 16);
    })();
  }, []);

  const reverse = async (coord: { lat: number; lng: number }) => {
    setLoadingGeo(true);
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: coord.lat,
        longitude: coord.lng,
      });
      const a = geo[0];
      if (a)
        setAlamat(
          `${a.street ?? a.name ?? ""} ${a.streetNumber ?? ""}, ${a.subregion ?? a.city ?? ""}`
            .replace(/\s+/g, " ")
            .trim(),
        );
    } catch {
    } finally {
      setLoadingGeo(false);
    }
  };

  const onPick = (lat: number, lng: number) => {
    const c = { lat, lng };
    setPicked(c);
    reverse(c);
  };

  const konfirmasi = () => {
    if (!picked) return;
    locationDraft.set({
      lat: picked.lat,
      lng: picked.lng,
      alamat: alamat || "Lokasi dipilih",
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Pilih Lokasi</Text>
      </View>

      <View style={{ flex: 1 }}>
        <LeafletMap
          ref={mapRef}
          style={{ flex: 1 }}
          center={center}
          zoom={16}
          pick
          onMapPress={onPick}
        />
        <View style={styles.hintBox}>
          <Feather name="info" size={14} color={colors.brand} />
          <Text style={styles.hintText}>
            Ketuk peta atau geser pin untuk memilih titik
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>
          Alamat{" "}
          {loadingGeo && (
            <ActivityIndicator size="small" color={colors.brand} />
          )}
        </Text>
        <TextInput
          style={styles.input}
          value={alamat}
          onChangeText={setAlamat}
          placeholder="Alamat (bisa diketik manual)"
          placeholderTextColor="#9AA5B1"
          multiline
        />
        {picked && (
          <Text style={styles.coord}>
            Lat: {picked.lat.toFixed(6)}, Lng: {picked.lng.toFixed(6)}
          </Text>
        )}
        <Pressable
          style={[styles.confirm, !picked && { backgroundColor: colors.muted }]}
          onPress={konfirmasi}
          disabled={!picked}
        >
          <Text style={styles.confirmText}>Gunakan Lokasi Ini</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  hintBox: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 3,
  },
  hintText: { fontSize: 12, color: colors.text },
  panel: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    textAlignVertical: "top",
  },
  coord: { fontSize: 12, color: colors.subtext, marginTop: 8 },
  confirm: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  confirmText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
