// Modul dipecah per platform; lihat penjelasan pola `.d.ts` di
// `components/LeafletMap.d.ts`.
//
// Pemisahannya bukan pilihan gaya. `expo-speech-recognition` memasang hook
// pendengar peristiwa yang harus dipanggil tanpa syarat, sementara web memakai
// Web Speech API yang sama sekali berbeda. Menyatukannya dalam satu berkas
// berarti memanggil hook di dalam cabang `if` — yang dilarang React.
import type { HasilVoiceInput } from "@/types/suara";

export declare function useVoiceInput(): HasilVoiceInput;
