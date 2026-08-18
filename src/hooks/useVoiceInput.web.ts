import { useCallback, useEffect, useRef, useState } from "react";

import { BAHASA_STT, type HasilVoiceInput } from "@/types/suara";

/**
 * Permukaan Web Speech API yang benar-benar dipakai di sini.
 *
 * Ditulis sendiri karena API ini belum masuk tipe DOM baku, ia masih berstatus
 * draf dan hanya diimplementasikan sebagian browser. Mendeklarasikan hanya
 * bagian yang dipakai lebih jujur daripada memaksakan `any`.
 */
type PengenalUcapan = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: PeristiwaHasil) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type PeristiwaHasil = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type KonstruktorPengenal = new () => PengenalUcapan;

function ambilKonstruktor(): KonstruktorPengenal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: KonstruktorPengenal;
    webkitSpeechRecognition?: KonstruktorPengenal;
  };
  // Safari dan Chrome versi lama masih memakai awalan webkit.
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pesanGalat(kode: string): string | null {
  switch (kode) {
    case "aborted":
      return null;
    case "no-speech":
      return "Tidak ada suara yang terdengar. Coba bicara lebih dekat ke mikrofon.";
    case "not-allowed":
    case "service-not-allowed":
      return "Izin mikrofon ditolak. Aktifkan lewat pengaturan situs di peramban.";
    case "network":
      return "Pengenalan suara butuh koneksi internet.";
    case "audio-capture":
      return "Mikrofon tidak ditemukan.";
    default:
      return "Suara tidak dapat dikenali. Coba lagi atau ketik saja.";
  }
}

export function useVoiceInput(): HasilVoiceInput {
  const [merekam, setMerekam] = useState(false);
  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const pengenalRef = useRef<PengenalUcapan | null>(null);

  const didukung = ambilKonstruktor() !== null;

  useEffect(() => {
    // Pengenal yang masih hidup akan terus memegang mikrofon setelah komponen
    // hilang, di peramban itu tampak sebagai indikator merekam yang menyala
    // terus di tab, tanpa cara mematikannya selain menutup tab.
    return () => pengenalRef.current?.abort();
  }, []);

  const mulai = useCallback(async () => {
    const Konstruktor = ambilKonstruktor();
    if (!Konstruktor) return;

    setGalat(null);
    setTeks("");

    const pengenal = new Konstruktor();
    pengenal.lang = BAHASA_STT;
    pengenal.interimResults = true;
    pengenal.continuous = false;

    pengenal.onresult = (e) => {
      // Rangkai seluruh potongan, bukan hanya yang terakhir. Peramban memecah
      // ucapan panjang jadi beberapa hasil, dan mengambil satu saja membuat
      // kalimat pengguna terpotong di tengah.
      let rangkaian = "";
      for (let i = 0; i < e.results.length; i++) {
        rangkaian += e.results[i][0]?.transcript ?? "";
      }
      setTeks(rangkaian.trim());
    };
    pengenal.onerror = (e) => {
      setGalat(pesanGalat(e.error));
      setMerekam(false);
    };
    pengenal.onend = () => setMerekam(false);

    pengenalRef.current = pengenal;
    setMerekam(true);
    pengenal.start();
  }, []);

  const berhenti = useCallback(() => {
    pengenalRef.current?.stop();
    setMerekam(false);
  }, []);

  const bersihkan = useCallback(() => {
    setTeks("");
    setGalat(null);
  }, []);

  return { didukung, merekam, teks, galat, mulai, berhenti, bersihkan };
}
