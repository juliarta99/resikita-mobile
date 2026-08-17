import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * Skema warna sistem, aman untuk render statis di web.
 *
 * `expo export -p web` merender halaman lebih dulu di Node, tempat preferensi
 * tema perangkat belum bisa ditanyakan. Nilainya karena itu baru boleh dipakai
 * setelah halaman terhidrasi; sebelum itu jawabannya selalu `light`, sama
 * dengan yang dirender peladen, sehingga tidak ada ketidakcocokan hidrasi.
 *
 * Versi sebelumnya menandai hidrasi dengan `useState` plus efek. Itu memaksa
 * satu render tambahan pada setiap pemakaian dan melanggar aturan React soal
 * `setState` sinkron di dalam efek. `useSyncExternalStore` memang dirancang
 * untuk perbedaan peladen-klien semacam ini: ia memberi dua jawaban tanpa efek
 * sama sekali. Langganannya kosong karena status hidrasi tidak pernah berubah
 * kembali selama halaman hidup.
 */
export function useColorScheme() {
  const sudahTerhidrasi = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const skema = useRNColorScheme();

  return sudahTerhidrasi ? skema : "light";
}
