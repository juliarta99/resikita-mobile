import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Hitung padding bawah untuk ScrollView/FlatList agar konten terakhir
 * tidak tertutup BottomBar maupun tombol navigasi HP.
 *
 * Pemakaian:
 *   const pad = useBottomPad();            // ada CTA melayang (default 120)
 *   const pad = useBottomPad(40);          // tanpa CTA, sekadar napas
 *
 *   <ScrollView contentContainerStyle={{ paddingBottom: pad }}>
 *
 * @param dasar tinggi ruang yang dibutuhkan di luar nav bar HP
 */
export function useBottomPad(dasar = 120): number {
  const insets = useSafeAreaInsets();
  return dasar + insets.bottom;
}
