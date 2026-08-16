/**
 * Titik awal peta ketika lokasi pengguna belum diketahui.
 *
 * Kira-kira pusat geografis kepulauan Indonesia. Dipakai hanya sebagai
 * cadangan terakhir — urutan yang benar adalah: lokasi GPS pengguna, lalu
 * wilayah pada profilnya, baru titik ini.
 *
 * Sebelumnya beberapa layar menanam koordinat Denpasar sebagai bawaan. Untuk
 * aplikasi berskala nasional itu berarti warga di Medan membuka peta dan
 * mendarat di Bali. Titik tengah tidak menyenangkan siapa pun secara khusus,
 * tapi juga tidak menyesatkan siapa pun secara khusus.
 */
export const TENGAH_NUSANTARA = { lat: -2.5, lng: 118 } as const;

/** Zoom saat menampilkan seluruh kepulauan. */
export const ZOOM_NASIONAL = 5;

/** Zoom saat menyorot satu titik tertentu. */
export const ZOOM_TITIK = 16;
