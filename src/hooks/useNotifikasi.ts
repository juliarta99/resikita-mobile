import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bacaNotifikasi,
  bacaSemuaNotifikasi,
  jumlahBelumDibaca,
} from "@/lib/api/notifikasi";

export const KUNCI_NOTIFIKASI = ["notifikasi"] as const;

/**
 * Jeda antar-pemeriksaan jumlah notifikasi belum dibaca.
 *
 * Dua menit, bukan beberapa detik. Batas umum API ini 60 permintaan per menit,
 * dan lencana yang terlambat dua menit tidak merugikan siapa pun — sementara
 * polling agresif memakan kuota data pengguna sepanjang aplikasi terbuka.
 * Angka yang tepat tetap datang saat layar notifikasi dibuka.
 */
const JEDA_PERIKSA_MS = 2 * 60_000;

/** Lencana jumlah notifikasi belum dibaca. */
export function useJumlahNotifikasi(aktif = true) {
  const q = useQuery({
    queryKey: [...KUNCI_NOTIFIKASI, "jumlah"],
    queryFn: jumlahBelumDibaca,
    enabled: aktif,
    refetchInterval: aktif ? JEDA_PERIKSA_MS : false,
    // Kegagalan memuat lencana tidak layak ditampilkan sebagai galat; ia cukup
    // tidak muncul.
    retry: false,
  });

  return q.data?.belum_dibaca ?? 0;
}

/** Aksi menandai notifikasi terbaca. */
export function useAksiNotifikasi() {
  const qc = useQueryClient();
  const segarkan = () =>
    qc.invalidateQueries({ queryKey: KUNCI_NOTIFIKASI });

  const baca = useMutation({
    mutationFn: (id: number) => bacaNotifikasi(id),
    onSuccess: segarkan,
  });

  const bacaSemua = useMutation({
    mutationFn: bacaSemuaNotifikasi,
    onSuccess: segarkan,
  });

  return { baca, bacaSemua };
}
