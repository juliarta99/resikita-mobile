import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { keanggotaanTps } from "@/lib/api/fasilitas";
import type { KeanggotaanTps } from "@/types/fasilitas";

/**
 * Kunci tunggal untuk keanggotaan TPS.
 *
 * Dipakai bersama oleh peta, daftar TPS, layar detail, dan tagihan iuran.
 * Satu kunci berarti satu kali panggil dan, yang lebih penting, satu kali
 * segarkan: setelah pengguna keluar atau pindah TPS, seluruh layar yang
 * menampilkan status keanggotaannya ikut berubah tanpa perlu diingat satu per
 * satu.
 */
export const KUNCI_KEANGGOTAAN_TPS = ["tps", "keanggotaan"] as const;

/**
 * Keanggotaan TPS pengguna saat ini (§13.1).
 *
 * `data` bernilai `null` bila pengguna belum menjadi anggota TPS mana pun.
 * Itu **keadaan normal, bukan galat**, peladen tetap menjawab `200`, jadi
 * periksa nilainya, jangan menangkapnya lewat `isError`.
 *
 * Seorang pengguna hanya boleh menjadi anggota satu TPS pada satu waktu; itu
 * aturan peladen (§13.2), dan seluruh tampilan di klien menyesuaikan diri
 * dengannya alih-alih menegakkannya sendiri.
 */
export function useKeanggotaanTps() {
  const { user } = useAuth();

  return useQuery<KeanggotaanTps | null>({
    queryKey: KUNCI_KEANGGOTAAN_TPS,
    queryFn: keanggotaanTps,
    enabled: !!user,
    staleTime: 60_000,
  });
}
