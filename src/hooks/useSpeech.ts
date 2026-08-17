import * as Speech from "expo-speech";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Platform } from "react-native";

export const BAHASA_TTS = "id-ID";

/** Kecepatan baca yang ditawarkan pemutar artikel. */
export const KECEPATAN = [0.75, 1, 1.25] as const;
export type Kecepatan = (typeof KECEPATAN)[number];

export type StatusSuara = "diam" | "membaca" | "jeda";

const web = Platform.OS === "web";

/**
 * Pecah teks jadi paragraf.
 *
 * Bukan sekadar untuk penanda visual. Seluruh mekanisme jeda-lanjut di bawah
 * bergantung pada pemenggalan ini, lihat catatan pada `jeda()`.
 */
export function pecahParagraf(teks: string): string[] {
  return teks
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Pembacaan teks lintas platform, dibaca per paragraf.
 *
 * Membungkus `expo-speech` di native dan `speechSynthesis` di web. Bahasa
 * dikunci `id-ID`.
 *
 * ### Kenapa per paragraf, bukan sekali telan
 *
 * `Speech.pause()` dan `Speech.resume()` **tidak tersedia di Android**, itu
 * tertulis di deklarasi tipe expo-speech, dan Android adalah mayoritas pengguna
 * aplikasi ini. Kalau seluruh artikel dikirim sebagai satu ucapan, tombol jeda
 * yang diminta `CLAUDE.md` §9 tidak akan berfungsi di sana sama sekali.
 *
 * Dengan membaca paragraf demi paragraf, "jeda" menjadi: hentikan ucapan, ingat
 * paragraf keberapa. "Lanjutkan" berarti mengucapkan paragraf itu dari awal.
 * Pengguna mendengar satu paragraf terulang, bukan kehilangan tempatnya,
 * pertukaran yang jauh lebih baik daripada tombol yang mati.
 *
 * Pemenggalan yang sama sekaligus memberi penanda paragraf berjalan dan
 * membuat perubahan kecepatan di tengah pemutaran bisa langsung terasa.
 */
export function useSpeech() {
  const [status, setStatus] = useState<StatusSuara>("diam");
  const [indeksParagraf, setIndeksParagraf] = useState(0);
  const [kecepatan, setKecepatan] = useState<Kecepatan>(1);

  /**
   * Ketersediaan TTS.
   *
   * Di web ini pemeriksaan kemampuan peramban, dan peramban baru bisa ditanya
   * setelah halamannya terhidrasi — `expo export -p web` merender statis lebih
   * dulu, saat `window` belum ada. Versi sebelumnya menyetelnya lewat `useState`
   * plus efek, yang berarti satu render tambahan pada setiap pemakaian hook ini
   * dan peringatan React soal setState di dalam efek.
   *
   * `useSyncExternalStore` memang dibuat untuk kasus ini: ia memberi nilai
   * berbeda untuk render peladen dan render klien tanpa efek sama sekali, dan
   * tanpa ketidakcocokan hidrasi. Langganannya kosong karena jawabannya tidak
   * pernah berubah selama halaman hidup.
   */
  const didukung = useSyncExternalStore(
    () => () => {},
    () => !web || (typeof window !== "undefined" && "speechSynthesis" in window),
    () => false,
  );

  const paragrafRef = useRef<string[]>([]);
  const indeksRef = useRef(0);
  const kecepatanRef = useRef<Kecepatan>(1);
  /**
   * Menandai penghentian yang kita minta sendiri, supaya `onDone` tidak
   * dianggap "paragraf selesai wajar" lalu melompat ke paragraf berikutnya.
   */
  const dihentikanSengaja = useRef(false);

  /**
   * Ucapkan satu paragraf, lalu lanjut sendiri ke paragraf berikutnya.
   *
   * Rekursinya lewat ref, bukan dengan memanggil `ucapkan` dari dalam
   * `useCallback` yang sedang mendefinisikannya. Pemanggilan langsung itu
   * membaca pengikatan yang belum selesai dibentuk, dan meski di praktiknya
   * berjalan, ia menutup jalan bagi versi fungsi ini yang mana pun untuk
   * diperbarui — `onDone` selamanya memanggil salinan dari render pertama.
   */
  const ucapkanRef = useRef<(indeks: number) => void>(() => {});

  const ucapkan = useCallback((indeks: number) => {
    const daftar = paragrafRef.current;
    const paragraf = daftar[indeks];
    if (paragraf === undefined) {
      setStatus("diam");
      setIndeksParagraf(0);
      indeksRef.current = 0;
      return;
    }

    indeksRef.current = indeks;
    setIndeksParagraf(indeks);
    setStatus("membaca");
    dihentikanSengaja.current = false;

    Speech.speak(paragraf, {
      language: BAHASA_TTS,
      rate: kecepatanRef.current,
      onDone: () => {
        if (dihentikanSengaja.current) return;
        ucapkanRef.current(indeks + 1);
      },
      onError: () => setStatus("diam"),
    });
  }, []);

  // Disinkronkan lewat efek, bukan ditulis saat render: menulis ref saat render
  // sama tidak amannya dengan membacanya. `onDone` baru bisa berbunyi setelah
  // ucapan pertama dimulai, jauh sesudah efek ini berjalan, jadi ref-nya tidak
  // pernah benar-benar masih berisi fungsi kosong ketika dipanggil.
  useEffect(() => {
    ucapkanRef.current = ucapkan;
  }, [ucapkan]);

  const putar = useCallback(
    (teks: string, mulaiDari = 0) => {
      const daftar = pecahParagraf(teks);
      if (daftar.length === 0) return;
      paragrafRef.current = daftar;
      dihentikanSengaja.current = true;
      Speech.stop();
      ucapkan(Math.min(mulaiDari, daftar.length - 1));
    },
    [ucapkan],
  );

  /**
   * Hentikan ucapan tapi pertahankan posisi paragraf.
   *
   * Sengaja tidak memakai `Speech.pause()` walau tersedia di iOS dan web,
   * satu perilaku untuk semua platform lebih mudah dipercaya daripada jeda
   * yang halus di satu tempat dan kasar di tempat lain, dan pengujian di iOS
   * tidak akan pernah memunculkan bug yang hanya ada di Android.
   */
  const jeda = useCallback(() => {
    dihentikanSengaja.current = true;
    Speech.stop();
    setStatus("jeda");
  }, []);

  const lanjut = useCallback(() => {
    if (paragrafRef.current.length === 0) return;
    ucapkan(indeksRef.current);
  }, [ucapkan]);

  const henti = useCallback(() => {
    dihentikanSengaja.current = true;
    Speech.stop();
    indeksRef.current = 0;
    setIndeksParagraf(0);
    setStatus("diam");
  }, []);

  /** Ganti kecepatan; bila sedang membaca, paragraf berjalan diulang dengan kecepatan baru. */
  const ubahKecepatan = useCallback(
    (nilai: Kecepatan) => {
      setKecepatan(nilai);
      kecepatanRef.current = nilai;
      if (status === "membaca") {
        dihentikanSengaja.current = true;
        Speech.stop();
        ucapkan(indeksRef.current);
      }
    },
    [status, ucapkan],
  );

  /** Ucapkan sepotong teks pendek, mis. satu balasan chatbot. */
  const ucapkanSekali = useCallback(
    (teks: string) => {
      if (!teks.trim()) return;
      putar(teks, 0);
    },
    [putar],
  );

  // Suara harus berhenti saat layar ditinggalkan. Tanpa ini, artikel terus
  // dibacakan di latar sementara pengguna sudah pindah ke layar lain, dan
  // satu-satunya cara menghentikannya adalah menutup aplikasi.
  useEffect(() => {
    return () => {
      dihentikanSengaja.current = true;
      Speech.stop();
    };
  }, []);

  return {
    status,
    sedangMembaca: status === "membaca",
    indeksParagraf,
    kecepatan,
    didukung,
    putar,
    jeda,
    lanjut,
    henti,
    ubahKecepatan,
    ucapkanSekali,
  };
}
