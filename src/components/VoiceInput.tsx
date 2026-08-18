import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { SumberInput } from "@/types/enums";

type Props = {
  nilai: string;
  onUbah: (teks: string) => void;
  /**
   * Melaporkan asal isi field: `ketik` atau `suara`.
   *
   * Nilai ini dikirim ke API sebagai `deskripsi_sumber` pada laporan dan
   * `sumber_input` pada pesan chatbot. Ia bukan detail teknis, inilah yang
   * membuat pemakaian fitur suara terukur, dan angkanya muncul di
   * `/publik/statistik` sebagai `persen_laporan_suara`.
   */
  onSumberBerubah?: (sumber: SumberInput) => void;
  placeholder?: string;
  label: string;
  multiline?: boolean;
  tinggiMinimum?: number;
};

/**
 * Field teks dengan tombol dikte.
 *
 * Mewujudkan arsitektur cascaded CLAUDE.md §9: ucapan diubah jadi teks, teksnya
 * **selalu muncul di field yang bisa disunting**, baru dikirim setelah pengguna
 * puas. Itu keputusan desain, bukan keterbatasan, pengguna bisa membetulkan
 * salah dengar, dan yang terkirim selalu bisa ditelusuri.
 *
 * Mengetik tetap tersedia sepenuhnya, dan tombol mikrofon menghilang tanpa
 * pesan apa pun di perangkat yang tidak mendukung pengenalan ucapan.
 */
export function VoiceInput({
  nilai,
  onUbah,
  onSumberBerubah,
  placeholder,
  label,
  multiline = true,
  tinggiMinimum = 110,
}: Props) {
  const suara = useVoiceInput();
  /*
    Penanda "isi field ini pernah berasal dari dikte". Disimpan sebagai ref,
    bukan state: tidak ada satu pun bagian tampilan yang berubah karenanya, dan
    sebagai state ia memaksa satu render tambahan pada setiap kata yang
    ditranskripsi — tepat saat pengguna sedang berbicara dan field sedang
    diperbarui berulang kali.
  */
  const pernahDikte = useRef(false);
  // Dibaca saat render lewat `transform: [{ scale: denyut }]`, jadi ia state
  // berinisialisasi malas, bukan isi ref. Lihat catatan yang sama di TypingDots.
  const [denyut] = useState(() => new Animated.Value(1));

  // Transkrip mengalir langsung ke field. Pengguna melihat kalimatnya tumbuh
  // saat berbicara, bukan menunggu di depan layar diam.
  useEffect(() => {
    if (suara.merekam && suara.teks) {
      onUbah(suara.teks);
      if (!pernahDikte.current) {
        pernahDikte.current = true;
        onSumberBerubah?.("suara");
      }
    }
  }, [suara.teks, suara.merekam, onUbah, onSumberBerubah]);

  // Denyut pada tombol saat merekam. Indikator visual ini diwajibkan
  // CLAUDE.md §9: tanpa tanda yang jelas, pengguna tidak tahu mikrofon hidup.
  useEffect(() => {
    if (!suara.merekam) {
      denyut.setValue(1);
      return;
    }
    const animasi = Animated.loop(
      Animated.sequence([
        Animated.timing(denyut, {
          toValue: 1.18,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(denyut, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animasi.start();
    return () => animasi.stop();
  }, [suara.merekam, denyut]);

  const ubahManual = (teks: string) => {
    onUbah(teks);
    // Field yang dikosongkan berarti asalnya ikut hilang; kalau tidak, laporan
    // yang seluruhnya diketik ulang akan tetap tercatat sebagai laporan suara
    // dan metrik pemakaian fiturnya jadi menggelembung.
    if (!teks.trim() && pernahDikte.current) {
      pernahDikte.current = false;
      onSumberBerubah?.("ketik");
    }
  };

  return (
    <View>
      <View style={[styles.kotak, multiline && { minHeight: tinggiMinimum }]}>
        <TextInput
          value={nilai}
          onChangeText={ubahManual}
          placeholder={placeholder}
          placeholderTextColor="#9AA5B1"
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline]}
          accessibilityLabel={label}
          editable={!suara.merekam}
        />
      </View>

      {suara.didukung && (
        <View style={styles.baris}>
          <Animated.View style={{ transform: [{ scale: denyut }] }}>
            <Pressable
              onPress={() => (suara.merekam ? suara.berhenti() : suara.mulai())}
              style={[styles.mic, suara.merekam && styles.micAktif]}
              accessibilityRole="button"
              accessibilityLabel={
                suara.merekam
                  ? "Berhenti merekam"
                  : `Diktekan ${label.toLowerCase()} dengan suara`
              }
              accessibilityHint={
                suara.merekam
                  ? undefined
                  : "Ucapan Anda diubah jadi teks dan bisa diperiksa sebelum dikirim"
              }
              accessibilityState={{ busy: suara.merekam }}
            >
              <Feather
                name={suara.merekam ? "square" : "mic"}
                size={18}
                color={suara.merekam ? colors.white : colors.brand}
              />
            </Pressable>
          </Animated.View>

          <Text style={styles.petunjuk} accessibilityLiveRegion="polite">
            {suara.merekam
              ? "Mendengarkan… ketuk untuk berhenti."
              : "Ketuk mikrofon untuk mendiktekan, atau ketik seperti biasa."}
          </Text>
        </View>
      )}

      {!!suara.galat && (
        <Text style={styles.galat} accessibilityLiveRegion="polite">
          {suara.galat}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kotak: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  input: { color: colors.text, fontSize: 15, paddingVertical: 12 },
  inputMultiline: { textAlignVertical: "top", flex: 1 },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  micAktif: { backgroundColor: colors.danger, borderColor: colors.danger },
  petunjuk: { flex: 1, fontSize: 12, color: colors.subtext, lineHeight: 17 },
  galat: { color: colors.danger, fontSize: 12, marginTop: 6 },
});

export default VoiceInput;
