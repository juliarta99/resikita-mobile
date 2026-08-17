import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { Platform } from "react-native";

import { cabutPerangkat, daftarkanPerangkat } from "@/lib/api/auth";
import type { PlatformPerangkat } from "@/types/enums";

/**
 * `expo-notifications` sengaja **tidak** diimpor di puncak berkas.
 *
 * Modul itu menjalankan inisialisasi saat diimpor, dan salah satu langkahnya
 * menyentuh `localStorage`. Pada render statis web (`expo export`) kode berjalan
 * di Node, `localStorage` tidak ada, dan hasilnya galat konsol di setiap halaman
 *, melanggar syarat "berjalan di web tanpa galat konsol" pada CLAUDE.md §14.
 *
 * Impor dinamis di dalam fungsi membuat modulnya hanya dimuat di platform yang
 * benar-benar memakainya.
 */
async function muatNotifications() {
  return import("expo-notifications");
}

/**
 * Notifikasi push hanya berjalan di perangkat asli.
 *
 * Emulator tidak punya layanan push, dan push di web menuntut kunci VAPID yang
 * dikonfigurasi di sisi proyek Expo. Keduanya keadaan normal, bukan galat.
 */
const didukung = Platform.OS !== "web" && Device.isDevice;

/**
 * Token yang terakhir berhasil didaftarkan.
 *
 * Disimpan di tingkat modul karena ia dibutuhkan **setelah** pengguna keluar,
 * saat token Sanctum-nya sudah dibuang: peladen perlu tahu perangkat mana yang
 * harus dicabut, dan menanyakannya ulang ke sistem operasi pada saat itu bisa
 * mengembalikan token yang berbeda.
 */
let tokenTerdaftar: string | null = null;

function platformPerangkat(): PlatformPerangkat {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/** Ambil token push dari sistem operasi, atau `null` bila tidak tersedia. */
async function ambilToken(): Promise<string | null> {
  if (!didukung) return null;

  const Notifications = await muatNotifications();

  const sekarang = await Notifications.getPermissionsAsync();
  let status = sekarang.status;
  if (status !== "granted") {
    const diminta = await Notifications.requestPermissionsAsync();
    status = diminta.status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;

  const hasil = await Notifications.getExpoPushTokenAsync({ projectId });
  return hasil.data;
}

/**
 * Daftarkan perangkat ini agar bisa menerima notifikasi.
 *
 * Aman dipanggil berkali-kali: bila tokennya sama dengan yang sudah terdaftar,
 * tidak ada permintaan yang dikirim.
 */
export async function daftarkanPush(): Promise<void> {
  try {
    const token = await ambilToken();
    if (!token || token === tokenTerdaftar) return;
    await daftarkanPerangkat({ token, platform: platformPerangkat() });
    tokenTerdaftar = token;
  } catch {
    // Gagal mendaftar bukan alasan mengganggu pengguna. Ia akan dicoba lagi
    // pada pembukaan aplikasi berikutnya.
  }
}

/** Cabut perangkat ini saat pengguna keluar, supaya notifikasi tidak menyusul. */
export async function cabutPush(): Promise<void> {
  if (!tokenTerdaftar) return;
  const token = tokenTerdaftar;
  // Dikosongkan lebih dulu supaya kegagalan jaringan tidak menyisakan keadaan
  // yang membuat pendaftaran berikutnya dilewati.
  tokenTerdaftar = null;
  try {
    await cabutPerangkat(token);
  } catch {
    // Token akan kedaluwarsa sendiri di peladen bila tidak pernah dipakai.
  }
}

/** Buka layar tujuan dari sebuah notifikasi yang diketuk. */
function bukaTautan(tautan: string | null) {
  // Tautan datang dari peladen dan bisa menunjuk rute yang tidak ada di versi
  // aplikasi ini. Jatuh ke daftar notifikasi lebih baik daripada menutup
  // aplikasi dengan galat saat pengguna hanya menekan sebuah notifikasi.
  try {
    router.push((tautan ?? "/notifikasi") as never);
  } catch {
    router.push("/notifikasi" as never);
  }
}

/**
 * Pasang penanganan notifikasi. Panggil sekali dari `_layout.tsx`.
 *
 * Mengembalikan fungsi pembersih; tanpa memanggilnya, pendengar menumpuk setiap
 * kali komponen dipasang ulang dan satu ketukan notifikasi berpindah layar
 * beberapa kali sekaligus.
 */
export function siapkanPenangananNotifikasi(): () => void {
  if (!didukung) return () => {};

  let lepas: (() => void) | null = null;
  let dibatalkan = false;

  void (async () => {
    const Notifications = await muatNotifications();
    if (dibatalkan) return;

    /**
     * Notifikasi yang tiba saat aplikasi sedang dibuka tetap ditampilkan.
     *
     * Perilaku bawaan menyembunyikannya, masuk akal untuk aplikasi obrolan
     * yang layarnya sudah menampilkan pesan itu, tapi keliru di sini: kabar
     * bahwa laporan sudah ditangani atau setoran tercatat datang dari luar
     * layar yang sedang dilihat pengguna.
     */
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });

    const langganan = Notifications.addNotificationResponseReceivedListener(
      (respons) => {
        const data = respons.notification.request.content.data;
        bukaTautan(typeof data?.tautan === "string" ? data.tautan : null);
      },
    );
    lepas = () => langganan.remove();
  })();

  return () => {
    dibatalkan = true;
    lepas?.();
  };
}
