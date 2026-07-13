import { WebView } from "@/components/PlatformWebView";
import { colors, spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Ganti ke https://app.midtrans.com/... untuk produksi
const SNAP_BASE = "https://app.sandbox.midtrans.com/snap/v2/vtweb/";

export default function Bayar() {
  const { snap_token, title } = useLocalSearchParams<{
    snap_token: string;
    title?: string;
  }>();
  const url = snap_token ? SNAP_BASE + snap_token : null;
  const isWeb = Platform.OS === "web";

  // Di web: langsung buka tab baru (Snap tidak bisa dipakai penuh dalam iframe)
  useEffect(() => {
    if (isWeb && url) {
      try {
        window.open(url, "_blank");
      } catch {}
    }
  }, [isWeb, url]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title ?? "Pembayaran"}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.done}>Selesai</Text>
        </Pressable>
      </View>

      {!url ? (
        <View style={styles.center}>
          <Text style={{ color: colors.subtext }}>
            Token pembayaran tidak ditemukan.
          </Text>
        </View>
      ) : isWeb ? (
        // WEB: jangan iframe — arahkan ke tab pembayaran penuh
        <View style={styles.center}>
          <Feather name="external-link" size={40} color={colors.brand} />
          <Text style={styles.webTitle}>Lanjutkan Pembayaran</Text>
          <Text style={styles.webDesc}>
            Halaman pembayaran dibuka di tab baru. Bila tidak terbuka otomatis,
            tekan tombol di bawah.
          </Text>
          <Pressable style={styles.payBtn} onPress={() => Linking.openURL(url)}>
            <Text style={styles.payBtnText}>Buka Halaman Pembayaran</Text>
          </Pressable>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Saya Sudah Membayar</Text>
          </Pressable>
        </View>
      ) : (
        // NATIVE: WebView asli — pilih metode berfungsi normal
        <WebView
          source={{ uri: url }}
          startInLoadingState
          onNavigationStateChange={(nav: { url: string }) => {
            if (
              /status_code=200|transaction_status=(settlement|capture)/.test(
                nav.url,
              )
            ) {
              setTimeout(() => router.back(), 800);
            }
          }}
        />
      )}

      <Text style={styles.note}>
        Status keanggotaan/pesanan diperbarui otomatis setelah pembayaran
        terkonfirmasi.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  done: { color: colors.brand, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  webDesc: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  payBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  payBtnText: { color: colors.white, fontWeight: "700" },
  doneBtn: { paddingHorizontal: 26, paddingVertical: 12 },
  doneBtnText: { color: colors.brand, fontWeight: "700" },
  note: {
    color: colors.subtext,
    fontSize: 11,
    textAlign: "center",
    padding: 10,
  },
});
