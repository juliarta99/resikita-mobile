import { QueryClient } from "@tanstack/react-query";

/**
 * Kunci cache profil pengguna.
 *
 * Tinggal di sini, bukan di `context/AuthContext.tsx`, supaya `lib/api/client.ts`
 * bisa memakainya saat menangani `401` tanpa mengimpor konteks — impor itu akan
 * melingkar: client → AuthContext → lib/api/auth → client.
 */
export const KUNCI_PROFIL = ["auth", "me"] as const;

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
       * sekali**. Angka ini yang menegakkan aturan itu, jadi jangan tambahkan
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

/**
 * Kosongkan seluruh jejak sesi di memori.
 *
 * **Bukan `queryClient.clear()`.** `clear()` memusnahkan objek Query yang
 * sedang diamati `useQuery`, dan observer yang menganggur itu tidak pernah
 * diberi tahu apa pun sesudahnya — ia terus menyajikan nilai terakhir yang
 * pernah dilihatnya. Akibatnya nama dan saldo pengguna sebelumnya tetap
 * terpampang meski sesinya sudah dicabut, persis hal yang ingin dicegah dengan
 * menyimpan profil di Query alih-alih di `useState`.
 *
 * Dua langkah di bawah mencapai maksud yang sama tanpa memutus observer mana
 * pun: profil disetel ke `null` sehingga seluruh layar seketika kembali ke
 * tampilan tamu, lalu sisa cache dibuang. Tidak ada satu pun permintaan
 * jaringan yang dipicu — penting untuk penanganan `401`, karena memuat ulang
 * query dengan token yang baru saja dibuang hanya melahirkan `401` berikutnya.
 */
export function bersihkanSesi(): void {
  queryClient.setQueryData(KUNCI_PROFIL, null);
  queryClient.removeQueries({
    predicate: (q) => q.queryKey[0] !== KUNCI_PROFIL[0],
  });
}
