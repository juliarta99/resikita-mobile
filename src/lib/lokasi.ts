import * as Location from "expo-location";
import { Platform } from "react-native";

export type Posisi = { lat: number; lng: number };

/** Kenapa deteksi lokasi gagal. Menentukan kalimat yang ditampilkan ke pengguna. */
export type SebabGagalLokasi =
  | "izin_ditolak"
  | "layanan_mati"
  | "konteks_tidak_aman"
  | "tidak_didukung"
  | "waktu_habis"
  | "gagal";

export class GalatLokasi extends Error {
  readonly sebab: SebabGagalLokasi;

  constructor(sebab: SebabGagalLokasi, pesan: string) {
    super(pesan);
    this.name = "GalatLokasi";
    this.sebab = sebab;
  }
}

const BATAS_MS = 15_000;

/**
 * Deteksi lokasi perangkat, satu jalur untuk web dan native.
 *
 * Dibuat terpisah karena "Deteksi Lokasi" yang tidak bereaksi ternyata punya
 * empat sebab berbeda, dan tiga di antaranya tidak pernah melempar galat:
 *
 * 1. **Halaman disajikan lewat `http://` di alamat IP lokal.** Browser menolak
 *    `geolocation` di konteks yang tidak aman — hanya `https` dan `localhost`
 *    yang diizinkan. Ini kasus yang paling sering terjadi saat menguji Expo web
 *    dari ponsel di jaringan yang sama, dan `expo-location` di web hanya
 *    menggantung tanpa satu pun pesan.
 * 2. **Layanan lokasi perangkat mati.** Izin bisa saja sudah diberikan, tapi
 *    GPS-nya nonaktif; `getCurrentPositionAsync` menunggu tanpa batas.
 * 3. **Izin ditolak permanen.** Panggilan berikutnya langsung kembali `denied`
 *    tanpa dialog, sehingga dari sisi pengguna tombolnya tampak mati.
 * 4. Kegagalan biasa.
 *
 * Ketiga sebab pertama itulah yang membuat tombolnya terasa "tidak mau". Fungsi
 * ini memaksa semuanya menjadi `GalatLokasi` dengan sebab yang bisa
 * diterjemahkan jadi kalimat yang benar-benar menolong.
 *
 * Di web dipakai `navigator.geolocation` langsung, bukan `expo-location`:
 * pembungkusnya menambahkan lapisan yang menyembunyikan kode galat asli browser
 * — dan kode itulah yang membedakan "izin ditolak" dari "waktu habis".
 */
export async function deteksiPosisi(): Promise<Posisi> {
  if (Platform.OS === "web") return posisiWeb();
  return posisiNative();
}

function posisiWeb(): Promise<Posisi> {
  return new Promise((selesai, gagal) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      gagal(
        new GalatLokasi(
          "tidak_didukung",
          "Peramban ini tidak menyediakan layanan lokasi. Tandai titiknya langsung di peta.",
        ),
      );
      return;
    }

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      gagal(
        new GalatLokasi(
          "konteks_tidak_aman",
          "Peramban hanya mengizinkan deteksi lokasi pada halaman https atau localhost. Buka aplikasi lewat https, atau tandai titiknya langsung di peta.",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => selesai({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => {
        if (e.code === e.PERMISSION_DENIED) {
          gagal(
            new GalatLokasi(
              "izin_ditolak",
              "Izin lokasi ditolak. Aktifkan kembali lewat ikon gembok di bilah alamat peramban, atau tandai titiknya langsung di peta.",
            ),
          );
          return;
        }
        if (e.code === e.TIMEOUT) {
          gagal(
            new GalatLokasi(
              "waktu_habis",
              "Lokasi terlalu lama tidak terbaca. Coba lagi di tempat yang lebih terbuka, atau tandai titiknya langsung di peta.",
            ),
          );
          return;
        }
        gagal(
          new GalatLokasi(
            "layanan_mati",
            "Layanan lokasi tidak tersedia. Pastikan lokasi perangkat menyala, atau tandai titiknya langsung di peta.",
          ),
        );
      },
      { enableHighAccuracy: true, timeout: BATAS_MS, maximumAge: 30_000 },
    );
  });
}

async function posisiNative(): Promise<Posisi> {
  const { status, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new GalatLokasi(
      "izin_ditolak",
      canAskAgain
        ? "Izin lokasi belum diberikan. Beri izin agar titik laporan bisa dideteksi otomatis, atau tandai titiknya sendiri di peta."
        : "Izin lokasi ditolak permanen. Aktifkan kembali lewat Pengaturan perangkat, atau tandai titiknya sendiri di peta.",
    );
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new GalatLokasi(
      "layanan_mati",
      "Layanan lokasi perangkat sedang mati. Nyalakan GPS lebih dulu, atau tandai titiknya sendiri di peta.",
    );
  }

  try {
    const posisi = await denganBatasWaktu(
      Location.getCurrentPositionAsync({
        // `High` menunggu kunci GPS penuh dan bisa memakan puluhan detik di
        // dalam ruangan. `Balanced` sudah cukup tepat untuk menandai tumpukan
        // sampah, dan yang penting: ia menjawab.
        accuracy: Location.Accuracy.Balanced,
      }),
      BATAS_MS,
    );
    return { lat: posisi.coords.latitude, lng: posisi.coords.longitude };
  } catch {
    // Posisi terakhir yang diketahui jauh lebih baik daripada tidak ada apa-apa:
    // pengguna tinggal menggeser titiknya sedikit, alih-alih memulai dari peta
    // seluruh Nusantara.
    const terakhir = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60_000,
    });
    if (terakhir) {
      return {
        lat: terakhir.coords.latitude,
        lng: terakhir.coords.longitude,
      };
    }
    throw new GalatLokasi(
      "waktu_habis",
      "Lokasi terlalu lama tidak terbaca. Coba lagi di tempat yang lebih terbuka, atau tandai titiknya sendiri di peta.",
    );
  }
}

function denganBatasWaktu<T>(janji: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((selesai, gagal) => {
    const pewaktu = setTimeout(
      () => gagal(new GalatLokasi("waktu_habis", "Waktu deteksi lokasi habis.")),
      ms,
    );
    janji.then(
      (nilai) => {
        clearTimeout(pewaktu);
        selesai(nilai);
      },
      (galat) => {
        clearTimeout(pewaktu);
        gagal(galat);
      },
    );
  });
}

/** Pesan siap tampil untuk galat apa pun dari `deteksiPosisi()`. */
export function pesanGalatLokasi(galat: unknown): string {
  if (galat instanceof GalatLokasi) return galat.message;
  return "Lokasi tidak dapat dideteksi. Tandai titiknya langsung di peta.";
}
