import { colors, spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from '@/components/PlatformWebView';

// Ganti ke https://app.midtrans.com/... untuk produksi
const SNAP_BASE = "https://app.sandbox.midtrans.com/snap/v2/vtweb/";

export default function Bayar() {
  const { snap_token, title } = useLocalSearchParams<{
    snap_token: string;
    title?: string;
  }>();

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
      {snap_token ? (
        <WebView
          source={{ uri: SNAP_BASE + snap_token }}
          startInLoadingState
          onNavigationStateChange={(nav) => {
            if (
              /status_code=200|transaction_status=(settlement|capture)/.test(
                nav.url,
              )
            ) {
              setTimeout(() => router.back(), 800);
            }
          }}
        />
      ) : (
        <View style={styles.center}>
          <Text style={{ color: colors.subtext }}>
            Token pembayaran tidak ditemukan.
          </Text>
        </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  note: {
    color: colors.subtext,
    fontSize: 11,
    textAlign: "center",
    padding: 10,
  },
});
