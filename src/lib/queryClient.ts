import { QueryClient } from "@tanstack/react-query";

/**
 * Klien TanStack Query tunggal untuk seluruh aplikasi.
 *
 * Ia tinggal di sini, bukan di `_layout.tsx`, karena penanganan 401 di
 * `lib/api/client.ts` harus bisa mengosongkan cache-nya. Kalau klien ini dibuat
 * di dalam komponen, lapis API tidak punya cara meraihnya, dan data pengguna
 * lama akan tetap terpampang setelah pengguna lain masuk.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * API-DOCS.md §15 mengizinkan percobaan ulang **hanya untuk GET, maksimal
       * sekali**. Angka ini yang menegakkan aturan itu — jadi jangan tambahkan
       * lagi mekanisme retry di lapis axios, karena keduanya berlipat: satu
       * ulangan axios di dalam satu ulangan Query berarti empat permintaan.
       */
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      /**
       * Nol, dan harus tetap nol. Mutasi di aplikasi ini membuat pesanan,
       * setoran, dan penarikan saldo; mengulanginya otomatis berarti menagih
       * pengguna dua kali untuk satu perintah.
       */
      retry: 0,
    },
  },
});
