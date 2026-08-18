/**
 * Penampung URI foto sementara antar-layar.
 *
 * KENAPA ADA BERKAS INI:
 * URI cache Expo Go berbentuk seperti
 *   file:///data/user/0/host.exp.exponent/cache/ExperienceData/%40anonymous%2Fniti-resik-.../ImagePicker/xxx.jpeg
 *
 * Perhatikan `%40` dan `%2F`, itu bagian harfiah dari nama direktori.
 * Bila URI tersebut dioper lewat `router.push({ params: { uri } })`,
 * expo-router memperlakukannya sebagai URL: ter-encode lalu ter-decode,
 * sehingga `%40` berubah jadi `@` dan `%2F` jadi `/`. Path-nya lalu
 * menunjuk direktori yang tidak ada → "Loading bitmap failed" dan
 * FormData menolak dengan "Unsupported FormDataPart implementation".
 *
 * Layar Buat Laporan tidak pernah kena masalah ini karena URI-nya
 * dipakai di layar yang sama, tanpa melewati router.
 *
 * Solusinya: simpan URI di memori, oper hanya "sinyal pindah layar".
 */
let foto: string | null = null;

export const fotoSementara = {
  set: (uri: string) => {
    foto = uri;
  },
  get: () => foto,
  clear: () => {
    foto = null;
  },
};
