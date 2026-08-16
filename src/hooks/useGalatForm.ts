import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api/error";

/** Pesan galat per nama field, mis. `{ email: "Email ini sudah terdaftar." }`. */
export type GalatField = Record<string, string | undefined>;

/**
 * Penampung galat sebuah formulir.
 *
 * Dibuat karena setiap layar formulir sebelumnya menulis ulang pola yang sama —
 * dan menulisnya sedikit berbeda-beda. Yang paling merugikan: galat validasi
 * sisi klien ("Email wajib diisi") ditumpuk jadi satu kalimat di atas tombol
 * kirim, jauh dari baris yang salah. Pengguna membaca kalimatnya, lalu harus
 * menebak sendiri field mana yang dimaksud.
 *
 * Di sini keduanya dipisahkan dengan tegas:
 *
 * - **`field`** — dipasang ke prop `error` masing-masing input. Bingkainya jadi
 *   merah dan pesannya muncul tepat di bawahnya.
 * - **`umum`** — hanya untuk galat yang memang tidak menunjuk satu field:
 *   jaringan mati, `403`, atau pelanggaran aturan bisnis yang datang sebagai
 *   `422` tanpa `errors` (§1.3). Tampilkan di **atas** formulir, bukan di atas
 *   tombol.
 */
export function useGalatForm() {
  const [field, setField] = useState<GalatField>({});
  const [umum, setUmum] = useState("");

  const bersihkan = useCallback(() => {
    setField({});
    setUmum("");
  }, []);

  /** Pasang galat validasi sisi klien pada satu field. */
  const tandai = useCallback((nama: string, pesan: string) => {
    setUmum("");
    setField({ [nama]: pesan });
  }, []);

  /**
   * Terjemahkan galat apa pun dari lapis API.
   *
   * `422` punya dua bentuk: Form Request menyertakan `errors` per field,
   * sedangkan pelanggaran aturan bisnis (saldo kurang, keranjang kosong) hanya
   * menyertakan `message`. Keduanya ditangani, dan yang punya `errors` **tidak**
   * ikut memunculkan pesan umum — kalau tidak, pengguna membaca keluhan yang
   * sama dua kali di dua tempat.
   *
   * `petaField` memetakan nama field peladen ke nama field di layar, untuk
   * kasus seperti `password_confirmation` yang di sini bernama `konfirmasi`.
   *
   * Kembaliannya adalah peta galat yang baru saja dipasang. Pemanggil yang
   * perlu bereaksi — membuka bagian form yang terlipat, menggulir ke field yang
   * salah — harus membaca nilai ini, bukan `field`: state React belum berubah
   * pada baris berikutnya.
   */
  const tangani = useCallback(
    (
      galat: unknown,
      cadangan: string,
      petaField?: Record<string, string>,
    ): GalatField => {
      if (!(galat instanceof ApiError)) {
        setField({});
        setUmum(cadangan);
        return {};
      }

      if (galat.errors) {
        const hasil: GalatField = {};
        for (const [nama, pesan] of Object.entries(galat.errors)) {
          const kunci = petaField?.[nama] ?? nama;
          if (pesan?.[0]) hasil[kunci] = pesan[0];
        }
        setField(hasil);
        // Sebagian galat 422 menyebut field yang tidak punya input di layar
        // (mis. `pengiriman` pada checkout). Tanpa cadangan ini pengguna
        // melihat kegagalan tanpa satu pun penjelasan.
        setUmum(Object.keys(hasil).length ? "" : galat.pesanUntukPengguna);
        return hasil;
      }

      setField({});
      setUmum(galat.message);
      return {};
    },
    [],
  );

  return { field, umum, setField, setUmum, bersihkan, tandai, tangani };
}
