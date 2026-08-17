import { isRunningInExpoGo } from "expo";
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
type ModulNotifikasi = typeof import("expo-notifications");

/**
 * Muat modulnya, lalu **normalkan bentuknya**.
 *
 * `await import(...)` tidak selalu mengembalikan namespace yang sama di Metro.
 * Pada sebagian jalur interop, isi modul justru berada di balik `default`,
 * sehingga `modul.setNotificationHandler` bernilai `undefined` dan pemanggilan
 * apa pun gagal dengan "undefined is not a function" — galat yang menunjuk
 * baris pemanggilnya, bukan penyebabnya, sehingga terbaca seolah fungsi itu
 * tidak ada di paketnya. Ia ada; hanya letaknya yang satu lapis lebih dalam.
 *
 * Pemeriksaannya memakai `setNotificationHandler` sebagai penanda karena itu
 * fungsi pertama yang dipakai berkas ini, jadi kalau ia ada, sisanya pun ada.
 */
async function muatNotifications(): Promise<ModulNotifikasi> {
  const modul = await import("expo-notifications");
  const bungkus = modul as ModulNotifikasi & { default?: ModulNotifikasi };
  if (typeof bungkus.setNotificationHandler === "function") return bungkus;
  return bungkus.default ?? bungkus;
}

/**
 * Expo Go tidak lagi membawa notifikasi push sejak SDK 53.
 *
 * Ini bukan sekadar fitur yang absen. Pada Android, `warnOfExpoGoPushUsage()`
 * di dalam `expo-notifications` **melempar galat**, dan ia dipanggil di lingkup
 * global `DevicePushTokenAutoRegistration.fx.js` — modul yang ikut termuat oleh
 * `index.js`. Akibatnya `import("expo-notifications")` di berkas ini berhenti
 * di tengah jalan dan mengembalikan namespace yang setengah terisi, sehingga
 * `setNotificationHandler` tampak "tidak ada" padahal ia hanya belum sempat
 * ditetapkan.
 *
 * Karena itu modulnya tidak boleh disentuh sama sekali di Expo Go, bukan
 * dibungkus `try`. Push diuji lewat development build.
 */
const diExpoGo = isRunningInExpoGo();

/**
 * Notifikasi push hanya berjalan di perangkat asli.
 *
 * Emulator tidak punya layanan push, dan push di web menuntut kunci VAPID yang
 * dikonfigurasi di sisi proyek Expo. Keduanya keadaan normal, bukan galat.
 */
const didukung = Platform.OS !== "web" && Device.isDevice && !diExpoGo;

if (__DEV__ && diExpoGo && Platform.OS !== "web") {
  console.log(
    "[push] Berjalan di Expo Go, notifikasi push dinonaktifkan. " +
      "Pakai development build (`npx expo run:android`) untuk mengujinya.",
  );
}

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
  } catch (e) {
    // Gagal mendaftar bukan alasan mengganggu pengguna. Ia akan dicoba lagi
    // pada pembukaan aplikasi berikutnya.
    //
    // Tapi diam sepenuhnya juga keliru: `catch` kosong di sini menelan galat
    // pemuatan modul yang sama persis dengan yang meledak di
    // `siapkanPenangananNotifikasi`, sehingga pendaftaran push bisa mati
    // berbulan-bulan tanpa satu pun jejak. Di mode pengembangan sebabnya
    // dicetak; di rilis tetap senyap bagi pengguna.
    if (__DEV__) console.warn("[push] pendaftaran perangkat gagal:", e);
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
    let Notifications: ModulNotifikasi;
    try {
      Notifications = await muatNotifications();
    } catch (e) {
      // Modulnya gagal dimuat sama sekali. Notifikasi mati, tapi aplikasinya
      // harus tetap hidup — ini dipanggil dari `_layout.tsx`, dan lemparan di
      // sini menjatuhkan seluruh aplikasi saat dibuka.
      if (__DEV__) console.warn("[push] expo-notifications gagal dimuat:", e);
      return;
    }
    if (dibatalkan) return;

    /*
      Penjagaan terakhir. Kalau bentuk modulnya berubah lagi di versi
      berikutnya, notifikasi berhenti berfungsi — tapi aplikasinya tidak ikut
      mati, dan di mode pengembangan sebabnya tertulis jelas alih-alih muncul
      sebagai "undefined is not a function" tanpa konteks.
    */
    if (typeof Notifications.setNotificationHandler !== "function") {
      if (__DEV__) {
        console.warn(
          "[push] `setNotificationHandler` tidak ditemukan pada expo-notifications. " +
            "Penanganan notifikasi dilewati.",
        );
      }
      return;
    }

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
