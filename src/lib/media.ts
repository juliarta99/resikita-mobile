/**
 * Penyusun URL berkas media dari peladen.
 *
 * ### Masalah yang diselesaikan
 *
 * Peladen mengembalikan jalur berkas yang tidak selalu berupa URL utuh — kadang
 * `/storage/produk/77.jpg`, kadang `produk/77.jpg`, dan pada lingkungan
 * pengembangan kadang beralamat `localhost` milik komputer pengembang.
 *
 * Jalur relatif diselesaikan klien terhadap **asal halaman itu sendiri**. Di
 * Expo web itu berarti `http://localhost:8081`, yaitu server bundler — tempat
 * yang tidak menyimpan satu pun berkas unggahan. Gambarnya tidak muncul, dan
 * tidak ada galat apa pun yang menjelaskan kenapa: permintaannya berhasil,
 * jawabannya sekadar bukan gambar.
 *
 * Alamat `localhost` yang datang dari peladen sama bermasalahnya di perangkat
 * fisik, karena di sana `localhost` berarti ponselnya sendiri.
 *
 * ### Cara kerjanya
 *
 * Basisnya diturunkan dari `EXPO_PUBLIC_API_URL` dengan menukar `/api/v1`
 * menjadi `/storage`, sehingga hanya ada **satu** alamat yang perlu disetel
 * untuk API sekaligus media, dan keduanya tidak mungkin berselisih.
 */

/** Skema yang menunjuk berkas di perangkat, bukan di peladen. */
const SKEMA_LOKAL = /^(data|blob|file|content|ph|assets-library):/i;

/**
 * Basis media, mis. `https://resikita.id/storage`.
 *
 * `null` bila `EXPO_PUBLIC_API_URL` belum disetel; pada keadaan itu nilai apa
 * pun diteruskan apa adanya, karena menebak alamat hanya menukar satu kegagalan
 * dengan kegagalan lain yang lebih sulit dilacak.
 */
export const BASIS_MEDIA: string | null = (() => {
  const api = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!api) return null;
  // Buang `/api/v1` beserta garis miring penutupnya, lalu pasang `/storage`.
  return `${api.replace(/\/+$/, "").replace(/\/api\/v\d+$/i, "")}/storage`;
})();

/**
 * Ubah jalur berkas dari peladen menjadi URL yang benar-benar bisa dimuat.
 *
 * Mengembalikan `undefined` untuk nilai kosong, supaya pemanggil bisa
 * menyerahkannya langsung ke prop `source` dan komponen gambar menampilkan
 * penggantinya alih-alih mencoba memuat alamat kosong.
 *
 * @example
 * urlMedia("/storage/produk/77.jpg")                        // https://resikita.id/storage/produk/77.jpg
 * urlMedia("http://localhost:8000/storage/produk/77.jpg")   // https://resikita.id/storage/produk/77.jpg
 * urlMedia("produk/77.jpg")                                 // https://resikita.id/storage/produk/77.jpg
 * urlMedia("file:///var/tmp/foto.jpg")                      // diteruskan apa adanya
 * urlMedia(null)                                            // undefined
 */
export function urlMedia(jalur?: string | null): string | undefined {
  const nilai = jalur?.trim();
  if (!nilai) return undefined;

  // Foto yang baru diambil kamera atau dipilih dari galeri belum pernah sampai
  // ke peladen. Menyentuhnya akan merusak pratinjau sebelum diunggah.
  if (SKEMA_LOKAL.test(nilai)) return nilai;

  if (!BASIS_MEDIA) return nilai;

  // Apa pun yang memuat `/storage/` dialihkan ke basis yang benar, termasuk URL
  // utuh yang menunjuk host keliru. Inilah yang menyelamatkan jawaban peladen
  // yang menyebut `localhost`.
  const posisi = nilai.indexOf("/storage/");
  if (posisi !== -1) {
    return BASIS_MEDIA + nilai.slice(posisi + "/storage".length);
  }

  // URL utuh ke host lain yang bukan berkas storage — avatar dari penyedia
  // pihak ketiga, misalnya — dibiarkan sebagaimana adanya.
  if (/^https?:\/\//i.test(nilai)) return nilai;

  return `${BASIS_MEDIA}/${nilai.replace(/^\/+/, "")}`;
}
