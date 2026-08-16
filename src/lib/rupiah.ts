import type { Rupiah } from "@/types/api";

/**
 * Sisipkan titik pemisah ribuan.
 *
 * Ditulis tangan, bukan memakai `toLocaleString("id-ID")`, karena dukungan ICU
 * di Hermes tidak seragam antar-build Android: di perangkat tanpa data lokal
 * `id-ID`, `toLocaleString` diam-diam mundur ke format Inggris dan `12500`
 * tampil sebagai "12,500". Salah baca koma jadi desimal pada angka uang adalah
 * kesalahan yang mahal, dan diamnya kegagalan itu membuatnya sulit terlihat
 * saat diuji di emulator yang justru punya ICU lengkap.
 */
function pisahRibuan(bilangan: number): string {
  return String(bilangan).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Format nilai uang jadi teks rupiah.
 *
 * Masukannya **integer rupiah** — `12500` berarti Rp 12.500. Jangan pernah
 * membaginya dengan 100 atau mem-parsing-nya sebagai float sebelum masuk ke
 * sini.
 *
 * ```ts
 * formatRupiah(12500)   // "Rp 12.500"
 * formatRupiah(-5000)   // "-Rp 5.000"
 * formatRupiah(0)       // "Rp 0"
 * ```
 */
export function formatRupiah(nilai: Rupiah): string {
  if (!Number.isFinite(nilai)) return "Rp 0";

  if (__DEV__ && !Number.isInteger(nilai)) {
    // Bukan sekadar cerewet: nilai pecahan di sini berarti ada tempat yang
    // memperlakukan uang sebagai float — kemungkinan besar sisa pembagian 100
    // dari skema lama. Membulatkannya diam-diam akan menyembunyikan sumbernya.
    console.warn(
      `formatRupiah menerima nilai pecahan (${nilai}). API mengembalikan integer rupiah — telusuri asal nilai ini.`,
    );
  }

  const bulat = Math.trunc(nilai);
  const teks = pisahRibuan(Math.abs(bulat));
  return bulat < 0 ? `-Rp ${teks}` : `Rp ${teks}`;
}

/**
 * Sama seperti `formatRupiah`, tapi untuk nilai yang boleh kosong.
 *
 * Dipakai pada field seperti `estimasi_nilai` yang bernilai `null` untuk
 * kategori tanpa nilai ekonomi. Menampilkan "Rp 0" di sana keliru — nol berarti
 * tidak bernilai, sementara `null` berarti tidak diketahui.
 */
export function formatRupiahOpsional(
  nilai: Rupiah | null | undefined,
  kosong = "—",
): string {
  return nilai == null ? kosong : formatRupiah(nilai);
}
