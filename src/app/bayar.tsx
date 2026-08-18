import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WebView } from "@/components/PlatformWebView";
import { colors, radius, spacing } from "@/constants/theme";

/**
 * Basis Snap Midtrans.
 *
 * Sandbox dan produksi memakai domain berbeda, dan token yang diterbitkan
 * peladen hanya berlaku di domain yang sepasang dengannya, token sandbox yang
 * dibuka di `app.midtrans.com` menghasilkan halaman "transaksi tidak ditemukan"
 * yang terbaca seperti pesanannya gagal dibuat. Setel
 * `EXPO_PUBLIC_MIDTRANS_SNAP_URL` mengikuti mode backend; bawaannya produksi
 * supaya build rilis tidak pernah diam-diam menunjuk sandbox.
 */
const SNAP_BASE =
  process.env.EXPO_PUBLIC_MIDTRANS_SNAP_URL ??
  "https://app.midtrans.com/snap/v2/vtweb/";

/**
 * Status transaksi yang berarti "halaman Snap sudah selesai dengan pengguna".
 *
 * Termasuk `pending`, pembayaran virtual account dan gerai ritel memang berakhir
 * dalam keadaan itu, dan menahan pengguna di halaman Snap sesudahnya tidak
 * memberi mereka apa pun.
 */
const STATUS_SELESAI =
  /transaction_status=(settlement|capture|pending|deny|cancel|expire)/;

export default function Bayar() {
  const { snap_token, kode, title } = useLocalSearchParams<{
    snap_token: string;
    kode?: string;
    title?: string;
  }>();
  const qc = useQueryClient();
  const url = snap_token ? SNAP_BASE + snap_token : null;
  const isWeb = Platform.OS === "web";

  // Snap bisa memicu beberapa kali navigasi ke URL selesai yang sama; tanpa
  // penjaga ini layar berpindah dua kali dan yang kedua mendarat di tumpukan
  // rute yang sudah tidak ada.
  const sudahSelesai = useRef(false);

  /**
   * Tutup layar pembayaran.
   *
   * **Status tidak pernah disimpulkan dari sisi klien**, hasil di halaman Snap
   * hanya menandakan pengguna sudah selesai berinteraksi, sedangkan yang
   * mengubah status pesanan adalah callback Midtrans ke peladen (§17). Karena
   * itu yang dilakukan di sini cuma satu: buang cache pesanan dan dompet, lalu
   * biarkan detail pesanan memuat kebenarannya sendiri.
   */
  const selesai = useCallback(() => {
    if (sudahSelesai.current) return;
    sudahSelesai.current = true;

    void qc.invalidateQueries({ queryKey: ["pesanan"] });
    void qc.invalidateQueries({ queryKey: ["dompet"] });
    void qc.invalidateQueries({ queryKey: ["keranjang"] });

    router.replace(kode ? (`/pesanan/${kode}` as Href) : ("/pesanan" as Href));
  }, [qc, kode]);

  // Web: Snap tidak bisa dipilih metode-nya dari dalam iframe, jadi dibuka di
  // tab baru. Pemblokir popup bisa menggagalkannya, tombolnya tetap disediakan.
  useEffect(() => {
    if (isWeb && url) {
      try {
        window.open(url, "_blank");
      } catch {
        // Diabaikan: tombol "Buka Halaman Pembayaran" di bawah menjadi jalannya.
      }
    }
  }, [isWeb, url]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={selesai}
          hitSlop={10}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Tutup halaman pembayaran"
        >
          <Feather name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title ?? "Pembayaran"}</Text>
        <Pressable
          onPress={selesai}
          hitSlop={10}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Selesai, lihat status pesanan"
        >
          <Text style={styles.done}>Selesai</Text>
        </Pressable>
      </View>

      {!url ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.danger} />
          <Text style={styles.webTitle}>Token pembayaran tidak ada</Text>
          <Text style={styles.webDesc}>
            Buka pesanan Anda lalu tekan Bayar Sekarang untuk menerbitkan tautan
            pembayaran baru.
          </Text>
          <Pressable
            style={styles.payBtn}
            onPress={selesai}
            accessibilityRole="button"
            accessibilityLabel="Buka pesanan saya"
          >
            <Text style={styles.payBtnText}>Lihat Pesanan</Text>
          </Pressable>
        </View>
      ) : isWeb ? (
        <View style={styles.center}>
          <Feather name="external-link" size={40} color={colors.brand} />
          <Text style={styles.webTitle}>Lanjutkan Pembayaran</Text>
          <Text style={styles.webDesc}>
            Halaman pembayaran dibuka di tab baru. Bila tidak terbuka otomatis,
            tekan tombol di bawah.
          </Text>
          <Pressable
            style={styles.payBtn}
            onPress={() => void Linking.openURL(url)}
            accessibilityRole="button"
            accessibilityLabel="Buka halaman pembayaran Midtrans di tab baru"
          >
            <Text style={styles.payBtnText}>Buka Halaman Pembayaran</Text>
          </Pressable>
          <Pressable
            style={styles.doneBtn}
            onPress={selesai}
            accessibilityRole="button"
            accessibilityLabel="Saya sudah membayar, lihat status pesanan"
          >
            <Text style={styles.doneBtnText}>Saya Sudah Membayar</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          startInLoadingState
          onNavigationStateChange={(nav: { url: string }) => {
            if (
              STATUS_SELESAI.test(nav.url) ||
              /status_code=20[01]/.test(nav.url)
            ) {
              // Jeda pendek supaya pengguna sempat membaca layar konfirmasi
              // Midtrans sebelum layarnya berganti.
              setTimeout(selesai, 900);
            }
          }}
        />
      )}

      <Text style={styles.note}>
        Status pesanan diperbarui peladen setelah pembayaran terkonfirmasi.
        Tutup halaman ini kapan saja, pesanan Anda tidak hilang.
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
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
    borderRadius: radius.md,
    paddingHorizontal: 26,
    minHeight: 48,
    justifyContent: "center",
  },
  payBtnText: { color: colors.white, fontWeight: "700" },
  doneBtn: {
    paddingHorizontal: 26,
    minHeight: 44,
    justifyContent: "center",
  },
  doneBtnText: { color: colors.brand, fontWeight: "700" },
  note: {
    color: colors.subtext,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    padding: 12,
  },
});
