import type { QueryClient } from "@tanstack/react-query";

/**
 * Segarkan semua yang ikut berubah setelah keanggotaan TPS bergeser.
 *
 * Keanggotaan tampil di lebih banyak tempat daripada yang terlihat: bilah aksi
 * di layar detail, lencana pada kartu TPS, kartu pada peta, dan daftar tagihan
 * iuran. Melewatkan salah satunya menghasilkan bug yang paling membingungkan,
 * satu layar bilang pengguna sudah keluar, layar sebelahnya masih menampilkan
 * "Anggota".
 *
 * Awalan `["tps"]` sengaja dipakai apa adanya: ia mencakup `keanggotaan`,
 * `detail`, dan `daftar` sekaligus. Direktori punya awalannya sendiri karena
 * peta memakainya untuk kedua tab.
 */
export function segarkanKeanggotaanTps(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["tps"] }),
    qc.invalidateQueries({ queryKey: ["direktori"] }),
  ]).then(() => undefined);
}
