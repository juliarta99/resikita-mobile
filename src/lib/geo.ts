import Constants from "expo-constants";
import * as Location from "expo-location";
import { Platform } from "react-native";

/**
 * Header untuk permintaan ke Nominatim.
 *
 * Kebijakan pemakaian Nominatim menuntut setiap permintaan membawa pengenal
 * aplikasi, dan permintaan tanpa itu boleh ditolak — bukan hari ini, tapi kapan
 * saja mereka memutuskan menegakkannya, dan pada saat itu geocode balik di web
 * akan diam-diam jatuh ke koordinat mentah tanpa penyebab yang kelihatan.
 *
 * `User-Agent` termasuk header terlarang di peramban: nilainya diabaikan diam-
 * diam, bukan ditolak dengan galat. Jadi ia hanya dipasang di build native.
 * Di web yang mengidentifikasi aplikasi adalah `Referer` yang dikirim peramban
 * sendiri, dan itu sudah memenuhi kebijakan yang sama.
 *
 * Namanya diambil dari `app.json` supaya tidak ada nama aplikasi yang ditanam
 * dua kali dan berselisih setelah rebranding berikutnya.
 */
function headerNominatim(): Record<string, string> {
  const dasar: Record<string, string> = { Accept: "application/json" };
  if (Platform.OS === "web") return dasar;

  const konfig = Constants.expoConfig;
  const nama = konfig?.name ?? "Resikita";
  const versi = konfig?.version ?? "1.0.0";
  const kontak =
    process.env.EXPO_PUBLIC_KONTAK_APLIKASI ??
    konfig?.android?.package ??
    konfig?.slug ??
    "resikita";

  return { ...dasar, "User-Agent": `${nama}/${versi} (${kontak})` };
}

/** Susun alamat dari hasil reverse geocode expo-location. */
function rangkaiAlamatExpo(a?: Location.LocationGeocodedAddress): string {
  if (!a) return "";
  return [
    a.name && a.name !== a.street ? a.name : null,
    a.street,
    a.district ?? a.subregion,
    a.city ?? a.region,
    a.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Ubah koordinat jadi alamat yang terbaca.
 *
 * Tiga lapis, dan ketiganya perlu:
 *
 * 1. `expo-location` — bekerja di Android dan iOS memakai layanan bawaan sistem.
 * 2. Nominatim OpenStreetMap — di web, `reverseGeocodeAsync` mengembalikan larik
 *    kosong tanpa Google API key. Bukan galat, hanya kosong, sehingga
 *    kegagalannya senyap dan dulu tampak seperti "alamat tidak terdeteksi".
 * 3. Koordinat mentah — supaya fungsi ini **selalu** menghasilkan sesuatu.
 *
 * Lapis ketiga itu yang membuat pemanggil bisa mematikan spinner tanpa syarat.
 * Versi sebelumnya bisa menggantung selamanya kalau Nominatim tidak menjawab;
 * karena itu ada `AbortController` dengan batas enam detik.
 */
export async function alamatDariKoordinat(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const hasil = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    const alamat = rangkaiAlamatExpo(hasil?.[0]);
    if (alamat) return alamat;
  } catch {
    // Izin ditolak atau layanan tidak tersedia — lanjut ke lapis berikutnya.
  }

  try {
    const kendali = new AbortController();
    const pewaktu = setTimeout(() => kendali.abort(), 6000);
    const respons = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: headerNominatim(), signal: kendali.signal },
    );
    clearTimeout(pewaktu);
    const json: unknown = await respons.json();
    if (
      json &&
      typeof json === "object" &&
      "display_name" in json &&
      typeof json.display_name === "string"
    ) {
      return json.display_name;
    }
  } catch {
    // Jaringan mati atau melewati batas waktu — jatuh ke koordinat.
  }

  return `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
}
