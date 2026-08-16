import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/constants/theme";
import { useSpeech } from "@/hooks/useSpeech";

type Props = {
  teks: string;
  /**
   * Instance `useSpeech()` bersama dari layar induk.
   *
   * Wajib diisi bila ada **lebih dari satu** tombol di layar yang sama, seperti
   * pada daftar balasan chatbot. `expo-speech` hanya punya satu antrean ucapan
   * untuk seluruh aplikasi: tombol kedua yang mulai berbicara menghentikan yang
   * pertama, tapi tombol pertama tidak tahu itu terjadi dan ikonnya akan
   * tertinggal pada keadaan "sedang membaca". Satu instance bersama membuat
   * hanya ada satu keadaan yang mungkin.
   */
  speech?: ReturnType<typeof useSpeech>;
  /** Dipanggil sekali setiap pembacaan selesai sampai habis, bukan saat dihentikan. */
  onSelesaiDibacakan?: () => void;
  label?: string;
  ukuran?: "kecil" | "sedang";
};

/**
 * Tombol "dengarkan" untuk sepotong teks.
 *
 * Disembunyikan sendiri bila perangkat tidak mendukung pembacaan — sesuai
 * ketentuan CLAUDE.md §9, ketidaktersediaan bukan galat yang perlu diberitakan.
 */
export function SpeechButton({
  teks,
  speech,
  onSelesaiDibacakan,
  label = "Dengarkan",
  ukuran = "sedang",
}: Props) {
  const milikSendiri = useSpeech();
  const s = speech ?? milikSendiri;
  const pernahMembaca = useRef(false);

  useEffect(() => {
    if (s.sedangMembaca) {
      pernahMembaca.current = true;
      return;
    }
    // Hanya hitung selesai bila sebelumnya memang sempat membaca, supaya
    // keadaan "diam" saat pertama render tidak dianggap pembacaan yang usai.
    if (pernahMembaca.current && s.status === "diam") {
      pernahMembaca.current = false;
      onSelesaiDibacakan?.();
    }
  }, [s.sedangMembaca, s.status, onSelesaiDibacakan]);

  if (!s.didukung || !teks.trim()) return null;

  const kecil = ukuran === "kecil";
  const aktif = s.sedangMembaca;

  return (
    <Pressable
      onPress={(e) => {
        e?.stopPropagation?.();
        if (aktif) s.henti();
        else s.ucapkanSekali(teks);
      }}
      style={[styles.tombol, kecil && styles.kecil, aktif && styles.aktif]}
      accessibilityRole="button"
      accessibilityLabel={aktif ? "Hentikan pembacaan" : label}
      accessibilityState={{ busy: aktif }}
    >
      <Feather
        name={aktif ? "square" : "volume-2"}
        size={kecil ? 13 : 15}
        color={aktif ? colors.white : colors.brand}
      />
      {!kecil && (
        <Text style={[styles.teks, aktif && { color: colors.white }]}>
          {aktif ? "Berhenti" : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tombol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    // 44 adalah target sentuh minimum WCAG 2.2.
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: "transparent",
  },
  kecil: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, gap: 0 },
  aktif: { backgroundColor: colors.brand },
  teks: { color: colors.brand, fontWeight: "700", fontSize: 13 },
});

export default SpeechButton;
