/** Dompet, mutasi, setoran, dan penarikan. Rujukan: API-DOCS.md §12. */

import type { ParamsHalaman } from "@/types/api";
import type {
    Dompet,
    DompetTransaksi,
    ParamsTransaksi,
    PayloadPenarikan,
    PenarikanSaldo,
    SetoranSampah,
} from "@/types/dompet";
import { get, pastikanHalaman, post } from "./client";

/**
 * Saldo, ringkasan bulan berjalan, dan `kode_qr` (§12.1).
 *
 * Endpoint ini juga **menerbitkan `kode_qr` bila belum ada**, jadi ia sekaligus
 * penjamin ketersediaan QR nasabah. Tidak ada `/dompet/qr` terpisah, layar QR
 * cukup memanggil ini.
 */
export const saldoDompet = () => get<Dompet>("/dompet/saldo");

/**
 * Mutasi saldo (§12.2).
 *
 * `jumlah` **selalu positif**; tanda plus atau minus di layar ditentukan
 * `is_pemasukan`, bukan oleh tanda angkanya.
 */
export const transaksiDompet = (params?: ParamsTransaksi) =>
  get<unknown>("/dompet/transaksi", { params }).then((d) =>
    pastikanHalaman<DompetTransaksi>(d, "GET /dompet/transaksi"),
  );

/**
 * Riwayat setoran sebagai nasabah (§12.3).
 *
 * Relasi `item` ikut dimuat di daftar, jadi tidak ada endpoint detail setoran
 * terpisah, rinciannya sudah ada di tangan begitu daftarnya termuat.
 */
export const riwayatSetoran = (params?: ParamsHalaman) =>
  get<unknown>("/dompet/setoran", { params }).then((d) =>
    pastikanHalaman<SetoranSampah>(d, "GET /dompet/setoran"),
  );

export const riwayatPenarikan = (params?: ParamsHalaman) =>
  get<unknown>("/dompet/penarikan", { params }).then((d) =>
    pastikanHalaman<PenarikanSaldo>(d, "GET /dompet/penarikan"),
  );

/**
 * Ajukan penarikan saldo (§12.5).
 *
 * **Saldo dipotong saat pengajuan dibuat**, bukan saat disetujui; bila ditolak,
 * dana kembali sebagai transaksi `refund`. Segarkan saldo setelah berhasil.
 *
 * Hanya satu pengajuan boleh menunggu dalam satu waktu, pengajuan kedua
 * ditolak dengan `422` beserta penjelasannya.
 */
export const ajukanPenarikan = (body: PayloadPenarikan) =>
  post<PenarikanSaldo>("/dompet/penarikan", body);
