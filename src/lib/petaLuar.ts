import { Linking, Platform } from "react-native";

/**
 * Buka sebuah titik di aplikasi peta perangkat.
 *
 * **Selalu memakai URL Google Maps, tidak pernah skema `geo:`.** Skema `geo:`
 * tampak lebih "asli", tapi ia gagal di tiga tempat sekaligus: di web ia tidak
 * dikenali sama sekali, di iOS tidak ada penanganannya, dan di Android
 * `canOpenURL` bisa menjawab `true` untuk aplikasi yang ternyata menolak
 * intent-nya. Yang terjadi kemudian adalah ketukan yang mengarahkan pengguna ke
 * layar kosong — atau tidak melakukan apa-apa.
 *
 * URL `https://` selalu punya penanganan: di ponsel ia dibuka aplikasi Maps
 * lewat deep link bawaan sistem, di web ia membuka tab baru. Koordinatlah yang
 * dikirim, bukan nama tempat, supaya titiknya persis di lokasi fasilitas dan
 * bukan hasil tebakan pencarian teks.
 */
export async function bukaDiPeta(
  latitude: number,
  longitude: number,
  nama?: string,
): Promise<void> {
  const koordinat = `${latitude},${longitude}`;
  const url =
    `https://www.google.com/maps/search/?api=1&query=${koordinat}` +
    // Label hanya hiasan pada URL pencarian, tapi ia membuat nama fasilitas
    // ikut muncul di riwayat aplikasi peta pengguna.
    (nama ? `&query_place_id=&z=17` : "");

  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}

/** Buka petunjuk arah dari posisi pengguna ke sebuah titik. */
export async function bukaRuteKe(
  latitude: number,
  longitude: number,
): Promise<void> {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}
