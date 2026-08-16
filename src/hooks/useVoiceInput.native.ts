import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useState } from "react";

import { BAHASA_STT, type HasilVoiceInput } from "@/types/suara";

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
  const didukung = ExpoSpeechRecognitionModule.isRecognitionAvailable();

  useSpeechRecognitionEvent("result", (peristiwa) => {
    const ucapan = peristiwa.results?.[0]?.transcript ?? "";
    if (ucapan) setTeks(ucapan);
  });

  useSpeechRecognitionEvent("error", (peristiwa) => {
    setGalat(pesanGalat(peristiwa.error));
    setMerekam(false);
  });

  useSpeechRecognitionEvent("end", () => setMerekam(false));

  const mulai = useCallback(async () => {
    setGalat(null);
    const izin = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!izin.granted) {
      setGalat(
        "Izin mikrofon diperlukan untuk mendiktekan. Anda tetap bisa mengetik.",
      );
      return;
    }
    setTeks("");
    setMerekam(true);
    ExpoSpeechRecognitionModule.start({
      lang: BAHASA_STT,
      // Hasil sementara ditampilkan supaya pengguna melihat ucapannya tertulis
      // saat itu juga, bukan menatap layar diam sambil menebak apakah
      // aplikasinya mendengar.
      interimResults: true,
      continuous: false,
    });
  }, []);

  const berhenti = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setMerekam(false);
  }, []);

  const bersihkan = useCallback(() => {
    setTeks("");
    setGalat(null);
  }, []);

  return { didukung, merekam, teks, galat, mulai, berhenti, bersihkan };
}
