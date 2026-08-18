import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
    anakWilayah,
    daftarProvinsi,
    resolusiWilayah,
} from "@/lib/api/wilayah";
import type { TingkatWilayah } from "@/types/enums";
import type { Wilayah } from "@/types/wilayah";

/** Yang dibutuhkan pemilih dari sebuah wilayah: cukup id dan namanya. */
export type WilayahTerpilih = { id: number; nama: string };

export type PilihanWilayah = Record<TingkatWilayah, WilayahTerpilih | null>;

const KOSONG: PilihanWilayah = {
  provinsi: null,
  kabupaten: null,
  kecamatan: null,
  desa: null,
};

/** Urutan tingkat dari yang teratas. Dipakai mengosongkan tingkat di bawahnya. */
const URUTAN: TingkatWilayah[] = ["provinsi", "kabupaten", "kecamatan", "desa"];

/**
 * Data wilayah praktis tidak berubah selama aplikasi terbuka, pemekaran daerah
 * terjadi hitungan tahun sekali. Menandainya tidak pernah basi menghapus
 * pemanggilan ulang setiap kali pemilih dibuka tutup, yang pada pemilih
 * bertingkat empat terjadi sangat sering.
 */
const SELAMANYA_SEGAR = Infinity;

const ringkas = (w?: Wilayah | null): WilayahTerpilih | null =>
  w ? { id: w.id, nama: w.nama } : null;

/**
 * Bongkar sebuah wilayah beserta rantai `parent`-nya menjadi keempat tingkat.
 *
 * Profil pengguna hanya menyimpan **satu** wilayah (§3.1), biasanya tingkat
 * desa. Yang membuatnya cukup untuk memulihkan pemilih adalah relasi `parent`
 * yang rekursif, kalau peladen tidak memuatnya, tingkat di atasnya memang
 * tidak bisa dipulihkan, dan pemilih dibiarkan kosong alih-alih diisi tebakan.
 */
function pecahJenjang(wilayah?: Wilayah | null): PilihanWilayah {
  const hasil: PilihanWilayah = { ...KOSONG };
  let simpul: Wilayah | null | undefined = wilayah;
  while (simpul) {
    hasil[simpul.tingkat] = ringkas(simpul);
    simpul = simpul.parent;
  }
  return hasil;
}

/**
 * Keadaan pemilih wilayah bertingkat empat.
 *
 * Tiap tingkat hanya dimuat setelah induknya dipilih. Ini bukan pengoptimalan
 * yang bisa ditawar: daftar desa se-Indonesia sekitar 84.000 baris, dan
 * memuatnya sekaligus akan menghabiskan memori perangkat kelas bawah, persis
 * perangkat yang paling banyak dipakai pengguna aplikasi ini.
 *
 * @param awal Wilayah yang sudah tersimpan di profil, untuk mengisi pemilih
 *   saat layar dibuka.
 */
export function useWilayah(awal?: Wilayah | null) {
  const [pilihan, setPilihan] = useState<PilihanWilayah>(() =>
    pecahJenjang(awal),
  );

  const qProvinsi = useQuery({
    queryKey: ["wilayah", "provinsi"],
    queryFn: daftarProvinsi,
    staleTime: SELAMANYA_SEGAR,
  });

  const qKabupaten = useQuery({
    queryKey: ["wilayah", "anak", pilihan.provinsi?.id],
    queryFn: () => anakWilayah(pilihan.provinsi!.id),
    enabled: !!pilihan.provinsi,
    staleTime: SELAMANYA_SEGAR,
  });

  const qKecamatan = useQuery({
    queryKey: ["wilayah", "anak", pilihan.kabupaten?.id],
    queryFn: () => anakWilayah(pilihan.kabupaten!.id),
    enabled: !!pilihan.kabupaten,
    staleTime: SELAMANYA_SEGAR,
  });

  const qDesa = useQuery({
    queryKey: ["wilayah", "anak", pilihan.kecamatan?.id],
    queryFn: () => anakWilayah(pilihan.kecamatan!.id),
    enabled: !!pilihan.kecamatan,
    staleTime: SELAMANYA_SEGAR,
  });

  /**
   * Pilih satu tingkat, dan kosongkan seluruh tingkat di bawahnya.
   *
   * Tanpa pengosongan itu, mengganti provinsi akan menyisakan desa dari
   * provinsi sebelumnya, dan `wilayah_id` yang terkirim menunjuk tempat yang
   * sama sekali berbeda dari yang tampak dipilih pengguna.
   */
  const pilih = (tingkat: TingkatWilayah, wilayah: WilayahTerpilih | null) => {
    setPilihan((sebelumnya) => {
      const berikutnya: PilihanWilayah = { ...sebelumnya, [tingkat]: wilayah };
      for (const lebihDalam of URUTAN.slice(URUTAN.indexOf(tingkat) + 1)) {
        berikutnya[lebihDalam] = null;
      }
      return berikutnya;
    });
  };

  const reset = () => setPilihan(KOSONG);

  /**
   * Isi keempat tingkat sekaligus dari sebuah koordinat.
   *
   * `POST /wilayah/resolusi` adalah satu-satunya endpoint yang mengembalikan
   * seluruh jenjang sekaligus, `/wilayah/cari` dan `/wilayah/terdekat`
   * mengembalikan wilayah dengan satu tingkat induk saja, tidak cukup untuk
   * memulihkan pemilih bertingkat empat.
   *
   * Mengembalikan `false` bila koordinatnya tidak jatuh di wilayah terdaftar
   * mana pun, supaya pemanggil bisa menjelaskan alih-alih diam.
   */
  const isiDariKoordinat = async (
    lat: number,
    lng: number,
  ): Promise<boolean> => {
    const hasil = await resolusiWilayah(lat, lng);
    if (!hasil.ditemukan) return false;
    setPilihan({
      provinsi: ringkas(hasil.provinsi),
      kabupaten: ringkas(hasil.kabupaten),
      kecamatan: ringkas(hasil.kecamatan),
      desa: ringkas(hasil.desa),
    });
    return true;
  };

  return {
    pilihan,
    pilih,
    reset,
    isiDariKoordinat,
    opsi: {
      provinsi: qProvinsi,
      kabupaten: qKabupaten,
      kecamatan: qKecamatan,
      desa: qDesa,
    },
    /**
     * Id yang dikirim ke API sebagai `wilayah_id`.
     *
     * Dipakai tingkat terdalam yang sudah dipilih, bukan hanya desa: kontrak
     * hanya menuntut id yang ada di tabel wilayah, dan pengguna yang berhenti di
     * kecamatan tetap lebih berguna bagi penyesuaian konteks daripada tidak
     * mengirim apa pun.
     */
    wilayahId:
      pilihan.desa?.id ??
      pilihan.kecamatan?.id ??
      pilihan.kabupaten?.id ??
      pilihan.provinsi?.id ??
      null,
    /** Keempat tingkat sudah terpilih. */
    lengkap: !!pilihan.desa,
  };
}
