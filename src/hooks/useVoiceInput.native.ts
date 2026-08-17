import { useCallback, useState } from "react";

import { BAHASA_STT, type HasilVoiceInput } from "@/types/suara";

type ModulSTT = typeof import("expo-speech-recognition");

/**
 * Modul pengenalan ucapan, dimuat dengan cara yang boleh gagal.
 *
 * `expo-speech-recognition` memanggil `requireNativeModule("ExpoSpeechRecognition")`
 * di **tingkat modulnya sendiri**, dan panggilan itu melempar ketika modul
 * native tidak ada — di Expo Go, atau pada build yang dibuat sebelum paket ini
 * ditambahkan. Impor statis karenanya menjatuhkan seluruh layar yang menyentuh
 * hook ini, dengan galat yang menunjuk komponen acak yang kebetulan sedang
 * dirender, bukan penyebabnya.
 *
 * `require` di dalam `try` menahan lemparan itu. Hasilnya dihitung sekali saat
 * berkas dimuat: keberadaan modul native tidak berubah selama aplikasi hidup,
 * jadi percabangan di sini tetap dan tidak melanggar aturan urutan hook.
 *
 * Ini mewujudkan ketentuan CLAUDE.md §9: bila STT tidak tersedia, tombolnya
 * disembunyikan — bukan memunculkan galat.
 */
const modul: ModulSTT | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition") as ModulSTT;
  } catch {
    return null;
  }
})();

const Pengenal = modul?.ExpoSpeechRecognitionModule ?? null;

/**
 * Pendengar peristiwa, atau pengganti kosong bila modulnya tidak ada.
 *
 * Nilainya ditetapkan sekali dan tidak pernah berganti, sehingga jumlah hook
 * yang dipanggil tiap render selalu sama.
 */
const usePeristiwaSTT: ModulSTT["useSpeechRecognitionEvent"] =
  modul?.useSpeechRecognitionEvent ??
  (() => {}) as ModulSTT["useSpeechRecognitionEvent"];

/** Pesan galat yang layak dibaca pengguna, bukan kode mentah dari sistem. */
function pesanGalat(kode: string): string | null {
  switch (kode) {
    case "aborted":
      // Dihentikan pengguna sendiri. Bukan masalah, tidak perlu diberitahukan.
      return null;
    case "no-speech":
      return "Tidak ada suara yang terdengar. Coba bicara lebih dekat ke mikrofon.";
    case "not-allowed":
    case "service-not-allowed":
      return "Izin mikrofon belum diberikan. Aktifkan lewat pengaturan aplikasi.";
    case "network":
      return "Pengenalan suara butuh koneksi internet.";
    case "audio-capture":
      return "Mikrofon tidak dapat diakses.";
    default:
      return "Suara tidak dapat dikenali. Coba lagi atau ketik saja.";
  }
}

export function useVoiceInput(): HasilVoiceInput {
  const [merekam, setMerekam] = useState(false);
  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  // Dievaluasi tiap render, bukan disimpan sekali: ketersediaan pengenal ucapan
  // di Android bergantung pada paket layanan Google yang bisa dipasang atau
  // dinonaktifkan pengguna kapan saja.
  //
  // Pemeriksaannya sendiri dibungkus karena `isRecognitionAvailable` menyentuh
  // sisi native, dan sisi itu bisa menolak walau modulnya berhasil dimuat.
  let didukung = false;
  if (Pengenal) {
    try {
      didukung = Pengenal.isRecognitionAvailable();
    } catch {
      didukung = false;
    }
  }

  usePeristiwaSTT("result", (peristiwa) => {
    const ucapan = peristiwa.results?.[0]?.transcript ?? "";
    if (ucapan) setTeks(ucapan);
  });

  usePeristiwaSTT("error", (peristiwa) => {
    setGalat(pesanGalat(peristiwa.error));
    setMerekam(false);
  });

  usePeristiwaSTT("end", () => setMerekam(false));

  const mulai = useCallback(async () => {
    if (!Pengenal) return;
    setGalat(null);
    const izin = await Pengenal.requestPermissionsAsync();
    if (!izin.granted) {
      setGalat(
        "Izin mikrofon diperlukan untuk mendiktekan. Anda tetap bisa mengetik.",
      );
      return;
    }
    setTeks("");
    setMerekam(true);
    Pengenal.start({
      lang: BAHASA_STT,
      // Hasil sementara ditampilkan supaya pengguna melihat ucapannya tertulis
      // saat itu juga, bukan menatap layar diam sambil menebak apakah
      // aplikasinya mendengar.
      interimResults: true,
      continuous: false,
    });
  }, []);

  const berhenti = useCallback(() => {
    Pengenal?.stop();
    setMerekam(false);
  }, []);

  const bersihkan = useCallback(() => {
    setTeks("");
    setGalat(null);
  }, []);

  return { didukung, merekam, teks, galat, mulai, berhenti, bersihkan };
}
