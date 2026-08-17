import { Feather } from "@expo/vector-icons";
import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import type { WilayahTerpilih, useWilayah } from "@/hooks/useWilayah";
import { deteksiPosisi, pesanGalatLokasi } from "@/lib/lokasi";
import type { TingkatWilayah } from "@/types/enums";
import type { Wilayah } from "@/types/wilayah";

/** Muncul saat daftarnya cukup panjang untuk membuat menggulir jadi menyiksa. */
const AMBANG_PENCARIAN = 12;

const TINGKAT: {
  kunci: TingkatWilayah;
  label: string;
  placeholder: string;
}[] = [
  { kunci: "provinsi", label: "Provinsi", placeholder: "Pilih provinsi" },
  {
    kunci: "kabupaten",
    label: "Kabupaten/Kota",
    placeholder: "Pilih kabupaten atau kota",
  },
  { kunci: "kecamatan", label: "Kecamatan", placeholder: "Pilih kecamatan" },
  { kunci: "desa", label: "Desa/Kelurahan", placeholder: "Pilih desa" },
];

type Props = {
  /** Keadaan dari `useWilayah()`. Dititipkan dari luar supaya layar bisa membaca `wilayahId`. */
  wilayah: ReturnType<typeof useWilayah>;
  wajib?: boolean;
  /** Galat dari peladen untuk `wilayah_id`, ditempel di tingkat terdalam. */
  error?: string;
};

/**
 * Pemilih wilayah bertingkat empat.
 *
 * Tingkat yang induknya belum dipilih ditampilkan nonaktif, bukan disembunyikan.
 * Menyembunyikannya membuat form seolah berubah panjang setiap kali pengguna
 * memilih sesuatu, dan pengguna kehilangan gambaran berapa langkah lagi tersisa.
 */
export function WilayahPicker({ wilayah, wajib, error }: Props) {
  const [terbuka, setTerbuka] = useState<TingkatWilayah | null>(null);
  const [mendeteksi, setMendeteksi] = useState(false);
  const [pesanDeteksi, setPesanDeteksi] = useState("");

  /**
   * Isi keempat tingkat dari GPS.
   *
   * Empat pilihan bertingkat adalah pekerjaan yang melelahkan di layar kecil,
   * dan sebagian besar pengguna mengisinya untuk tempat mereka sedang berdiri.
   * Satu ketukan menggantikan empat daftar gulir, dan hasilnya tetap bisa
   * disunting, karena GPS di dalam ruangan kadang meleset ke desa sebelah.
   */
  const deteksiLokasi = async () => {
    setPesanDeteksi("");
    setMendeteksi(true);
    try {
      const posisi = await deteksiPosisi();
      const ketemu = await wilayah.isiDariKoordinat(posisi.lat, posisi.lng);
      setPesanDeteksi(
        ketemu
          ? "Wilayah terisi dari lokasi Anda. Periksa dan betulkan bila meleset."
          : "Lokasi Anda belum masuk wilayah yang terdaftar. Silakan pilih manual.",
      );
    } catch (e) {
      // Pesannya menyebut sebab yang sebenarnya, izin, GPS mati, atau halaman
      // http, bukan "lokasi tidak terdeteksi" yang tidak menolong siapa pun.
      setPesanDeteksi(pesanGalatLokasi(e));
    } finally {
      setMendeteksi(false);
    }
  };

  const indukTerpilih = (kunci: TingkatWilayah): boolean => {
    if (kunci === "provinsi") return true;
    if (kunci === "kabupaten") return !!wilayah.pilihan.provinsi;
    if (kunci === "kecamatan") return !!wilayah.pilihan.kabupaten;
    return !!wilayah.pilihan.kecamatan;
  };

  return (
    <View>
      <Pressable
        style={styles.deteksi}
        onPress={deteksiLokasi}
        disabled={mendeteksi}
        accessibilityRole="button"
        accessibilityLabel="Isi wilayah otomatis dari lokasi saya"
        accessibilityState={{ busy: mendeteksi }}
      >
        {mendeteksi ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <Feather name="crosshair" size={16} color={colors.brand} />
        )}
        <Text style={styles.deteksiTeks}>
          {mendeteksi ? "Mendeteksi lokasi…" : "Isi dari Lokasi Saya"}
        </Text>
      </Pressable>
      {!!pesanDeteksi && (
        <Text style={styles.pesanDeteksi} accessibilityLiveRegion="polite">
          {pesanDeteksi}
        </Text>
      )}

      {TINGKAT.map(({ kunci, label, placeholder }) => (
        <BarisTingkat
          key={kunci}
          label={label}
          placeholder={placeholder}
          wajib={wajib}
          aktif={indukTerpilih(kunci)}
          terpilih={wilayah.pilihan[kunci]}
          terbuka={terbuka === kunci}
          query={wilayah.opsi[kunci]}
          // Galat `wilayah_id` menunjuk satu nilai yang dirakit dari empat
          // pilihan; ia ditempelkan di tingkat terdalam karena di situlah nilai
          // yang dikirim akhirnya ditentukan.
          error={kunci === "desa" ? error : undefined}
          onToggle={() => setTerbuka((t) => (t === kunci ? null : kunci))}
          onPilih={(w) => {
            wilayah.pilih(kunci, w);
            setTerbuka(null);
          }}
        />
      ))}
    </View>
  );
}

type BarisProps = {
  label: string;
  placeholder: string;
  wajib?: boolean;
  aktif: boolean;
  terpilih: WilayahTerpilih | null;
  terbuka: boolean;
  query: UseQueryResult<Wilayah[], Error>;
  error?: string;
  onToggle: () => void;
  onPilih: (w: WilayahTerpilih) => void;
};

function BarisTingkat({
  label,
  placeholder,
  wajib,
  aktif,
  terpilih,
  terbuka,
  query,
  error,
  onToggle,
  onPilih,
}: BarisProps) {
  const [cari, setCari] = useState("");
  const daftar = query.data ?? [];
  const kunci = cari.trim().toLowerCase();
  const tersaring = kunci
    ? daftar.filter((w) => w.nama.toLowerCase().includes(kunci))
    : daftar;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, !!error && { color: colors.danger }]}>
        {label} {wajib && <Text style={{ color: colors.danger }}>*</Text>}
      </Text>

      <Pressable
        onPress={aktif ? onToggle : undefined}
        disabled={!aktif}
        style={[
          styles.select,
          !aktif && styles.selectMati,
          !!error && styles.selectGalat,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          terpilih ? `${label}: ${terpilih.nama}` : `Pilih ${label}`
        }
        accessibilityHint={
          aktif ? undefined : "Pilih tingkat di atasnya terlebih dahulu"
        }
        accessibilityState={{ disabled: !aktif, expanded: terbuka }}
      >
        <Text
          style={{
            color: terpilih ? colors.text : "#9AA5B1",
            fontSize: 15,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {terpilih?.nama ?? placeholder}
        </Text>
        <Feather
          name={terbuka ? "chevron-up" : "chevron-down"}
          size={18}
          color={aktif ? colors.subtext : "#CBD5E1"}
        />
      </Pressable>

      {terbuka && (
        <View style={styles.panel}>
          {query.isLoading && (
            <View style={styles.pesanBaris}>
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={styles.pesanTeks}>Memuat daftar…</Text>
            </View>
          )}

          {query.isError && (
            <Pressable
              style={styles.pesanBaris}
              onPress={() => query.refetch()}
              accessibilityRole="button"
              accessibilityLabel="Gagal memuat daftar wilayah. Ketuk untuk coba lagi"
            >
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.pesanTeks, { color: colors.danger }]}>
                Gagal memuat. Ketuk untuk coba lagi.
              </Text>
            </Pressable>
          )}

          {query.isSuccess && daftar.length > AMBANG_PENCARIAN && (
            <View style={styles.cariWrap}>
              <Feather name="search" size={15} color={colors.subtext} />
              <TextInput
                value={cari}
                onChangeText={setCari}
                placeholder={`Cari ${label.toLowerCase()}…`}
                placeholderTextColor="#9AA5B1"
                style={styles.cariInput}
                accessibilityLabel={`Cari ${label}`}
              />
            </View>
          )}

          {query.isSuccess && tersaring.length === 0 && (
            <View style={styles.pesanBaris}>
              <Text style={styles.pesanTeks}>
                {daftar.length === 0
                  ? "Belum ada data untuk wilayah ini."
                  : "Tidak ada yang cocok dengan pencarian Anda."}
              </Text>
            </View>
          )}

          {/*
            Daftar dirender langsung, bukan di dalam ScrollView bersarang.
            Pemilih ini hidup di dalam form yang sudah bisa digulir, dan dua
            area gulir bertumpuk membuat sentuhan pengguna direbut wadah yang
            salah di Android. Kotak pencarian di atas yang menjaga daftar tetap
            pendek.
          */}
          {tersaring.map((w) => {
            const dipilih = terpilih?.id === w.id;
            return (
              <Pressable
                key={w.id}
                style={styles.opsi}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setCari("");
                  onPilih({ id: w.id, nama: w.nama });
                }}
                accessibilityRole="button"
                accessibilityLabel={w.nama}
                accessibilityState={{ selected: dipilih }}
              >
                <Text style={styles.opsiTeks}>{w.nama}</Text>
                {dipilih && (
                  <Feather name="check" size={16} color={colors.brand} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {!!error && (
        <Text
          style={styles.galat}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deteksi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  deteksiTeks: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  pesanDeteksi: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // 52 sudah di atas target sentuh minimum 44 WCAG 2.2.
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 14,
  },
  selectMati: { backgroundColor: "#F8FAFC", borderColor: "#EEF2F6" },
  selectGalat: { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
  galat: { color: colors.danger, fontSize: 12, marginTop: 6, lineHeight: 17 },
  panel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  cariWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cariInput: { flex: 1, fontSize: 14, color: colors.text },
  opsi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    minHeight: 46,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  opsiTeks: { color: colors.text, fontSize: 14, flex: 1 },
  pesanBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pesanTeks: { color: colors.subtext, fontSize: 13, flex: 1 },
});

export default WilayahPicker;
