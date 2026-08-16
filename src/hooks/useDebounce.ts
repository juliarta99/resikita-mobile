import { useEffect, useState } from "react";

/**
 * Tunda perubahan nilai sampai pengguna berhenti mengetik.
 *
 * Dipakai untuk kotak pencarian yang menyaring lewat peladen. Tanpa penundaan,
 * setiap ketukan tombol jadi satu permintaan — mengetik "botol plastik" berarti
 * 14 permintaan, dan batas umum API ini 60 per menit. Pengguna akan menabrak
 * `429` hanya dengan mengetik satu kata pencarian.
 *
 * `useEffect` di sini tidak melanggar aturan emas nomor 1: yang ditunda adalah
 * nilai masukan di layar, bukan pengambilan data.
 */
export function useDebounce<T>(nilai: T, jedaMs = 400): T {
  const [tertunda, setTertunda] = useState(nilai);

  useEffect(() => {
    const pewaktu = setTimeout(() => setTertunda(nilai), jedaMs);
    return () => clearTimeout(pewaktu);
  }, [nilai, jedaMs]);

  return tertunda;
}
