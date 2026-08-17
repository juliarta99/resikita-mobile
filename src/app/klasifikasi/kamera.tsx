import { colors, radius, spacing } from "@/constants/theme";
import { fotoSementara } from "@/lib/fotoSementara";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { type Href, router } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Kamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const camRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.screen} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Feather name="camera-off" size={40} color={colors.white} />
        <Text style={styles.permText}>
          Butuh izin kamera untuk memindai sampah.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Beri Izin</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.permCancel}>Batal</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const jepret = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        // URI disimpan di memori, JANGAN dioper lewat params router,
        // karena akan rusak oleh encode/decode URL (lihat lib/fotoSementara.ts)
        fotoSementara.set(photo.uri);
        router.replace("/klasifikasi/hasil" as Href);
      }
    } finally {
      setBusy(false);
    }
  };

  const galeri = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      mediaTypes: ["images"],
    });
    if (!res.canceled && res.assets[0]) {
      fotoSementara.set(res.assets[0].uri);
      router.replace("/klasifikasi/hasil" as Href);
    }
  };

  return (
    <View style={styles.screen}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.modePill}>
            <Text style={styles.modeText}>Mode Pindai</Text>
          </View>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
          <View style={styles.hint}>
            <Text style={styles.hintText}>Posisikan sampah di dalam frame</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable style={styles.galeri} onPress={galeri}>
            <Feather name="image" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={styles.shutter} onPress={jepret} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.shutterInner}>
                <Feather name="camera" size={26} color={colors.white} />
              </View>
            )}
          </Pressable>
          <View style={{ width: 52 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const m: Record<typeof pos, ViewStyle> = {
    tl: {
      top: -2,
      left: -2,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 12,
    },
    tr: {
      top: -2,
      right: -2,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 12,
    },
    bl: {
      bottom: -2,
      left: -2,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 12,
    },
    br: {
      bottom: -2,
      right: -2,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 12,
    },
  };
  return <View style={[styles.corner, m[pos]]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 30,
  },
  permText: { color: colors.white, textAlign: "center", fontSize: 15 },
  permBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  permBtnText: { color: colors.white, fontWeight: "700" },
  permCancel: { color: colors.white70, marginTop: 6 },
  overlay: { flex: 1, justifyContent: "space-between" },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  modePill: {
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  modeText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  frameWrap: { alignItems: "center", gap: 20 },
  frame: { width: 260, height: 260 },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: colors.white,
  },
  hint: {
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  hintText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  galeri: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
  },
  shutterInner: { alignItems: "center", justifyContent: "center" },
});
