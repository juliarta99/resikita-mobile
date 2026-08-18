import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { detailLaporan } from "@/lib/api/laporan";
import { rupaStatus } from "@/lib/warnaStatus";
import type { StatusLaporan, StatusProgres } from "@/types/enums";
import { urlMedia } from "@/lib/media";

/** Ikon tiap status laporan. Label dan warnanya datang dari peladen. */
const IKON_STATUS: Record<StatusLaporan, keyof typeof Feather.glyphMap> = {
  baru: "clock",
  diverifikasi: "check-circle",
  ditugaskan: "user-check",
  dikerjakan: "tool",
  selesai: "check",
  ditolak: "x-circle",
  digabung: "git-merge",
};

const IKON_PROGRES: Record<StatusProgres, keyof typeof Feather.glyphMap> = {
  dikerjakan: "tool",
  selesai: "check",
};

const waktuLengkap = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function DetailLaporan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);

  const q = useQuery({
    queryKey: ["laporan", "detail", nomor],
    queryFn: () => detailLaporan(nomor),
    enabled: Number.isFinite(nomor),
  });

  const appbar = (
    <View style={styles.appbar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.appbarTitle}>Detail Laporan</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat laporan…" />
      </SafeAreaView>
    );
  }

  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const r = q.data;
  const rupa = rupaStatus(r.status_warna);
  const ikon = IKON_STATUS[r.status] ?? "circle";
  const pj = r.penanggung_jawab;
  const foto = r.foto ?? [];
  const progres = r.progres ?? [];
  const dibuat = r.created_at ? waktuLengkap(r.created_at) : "";
  const wilayahTeks = [
    r.wilayah?.desa?.nama,
    r.wilayah?.kecamatan?.nama,
    r.wilayah?.kabupaten?.nama,
    r.wilayah?.provinsi?.nama,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
      >
        <View style={styles.kepala}>
          <Text style={styles.judul}>{r.judul}</Text>
          <View style={[styles.status, { backgroundColor: rupa.bg }]}>
            <Feather name={ikon} size={13} color={rupa.fg} />
            <Text style={[styles.statusTeks, { color: rupa.fg }]}>
              {r.status_label}
            </Text>
          </View>
        </View>
        <Text style={styles.tiket}>
          {[r.tiket, dibuat && `dikirim ${dibuat}`].filter(Boolean).join(" · ")}
        </Text>

        {/* Laporan yang digabungkan tidak ditangani sendiri, pelapor perlu
            tahu ke mana penanganannya berpindah, bukan sekadar melihat status
            "Digabung" tanpa penjelasan. */}
        {r.is_duplikat && !!r.duplikat_of_id && (
          <Pressable
            style={styles.gabungTaut}
            onPress={() => router.push(`/lapor/${r.duplikat_of_id}` as never)}
            accessibilityRole="button"
            accessibilityLabel="Buka laporan induk tempat laporan ini digabungkan"
          >
            <Feather name="git-merge" size={16} color={colors.brand} />
            <Text style={styles.gabungTeks}>
              Laporan ini digabungkan ke laporan lain. Ketuk untuk membukanya.
            </Text>
            <Feather name="chevron-right" size={16} color={colors.brand} />
          </Pressable>
        )}

        {/*
          Blok kewenangan ditaruh sebelum isi laporan. Pertanyaan pertama
          pelapor bukan "apa yang saya tulis tadi", ia sudah tahu, melainkan
          "ini sekarang tanggung jawab siapa".
        */}
        {(!!pj?.tipe_label || !!pj?.alasan_label) && (
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Penanganan</Text>
            {!!pj.tipe_label && (
              <View style={styles.instansi}>
                <Feather name="briefcase" size={16} color={colors.brand} />
                <Text style={styles.instansiTeks}>{pj.tipe_label}</Text>
              </View>
            )}
            {/* `alasan_label` adalah jejak audit routing dari peladen,
                ditampilkan apa adanya, bukan diterjemahkan ulang di klien. */}
            {!!pj.alasan_label && (
              <Text style={styles.routing}>{pj.alasan_label}</Text>
            )}
            {pj.butuh_pendampingan && (
              <View style={styles.catatanKotak}>
                <Feather name="info" size={15} color="#8A6D1B" />
                <Text style={styles.catatanTeks}>
                  Pemerintah wilayah ini belum bergabung di Resikita. Laporan
                  Anda ditangani Fasilitator Wilayah dan diteruskan ke dinas
                  setempat.
                </Text>
              </View>
            )}
            {!!r.jumlah_gabungan && (
              <Text style={styles.routing}>
                {r.jumlah_gabungan} laporan warga lain digabungkan ke laporan
                ini.
              </Text>
            )}
            {r.waktu_respons_jam != null && (
              <Text style={styles.routing}>
                Selesai dalam {r.waktu_respons_jam.toFixed(1)} jam sejak
                dilaporkan.
              </Text>
            )}
          </View>
        )}

        {foto.length > 0 && (
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Foto Bukti</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {foto.map((f, i) => (
                <Image
                  key={f.id}
                  source={{ uri: urlMedia(f.url) }}
                  style={styles.bukti}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={`Foto bukti ke-${i + 1} dari ${foto.length}`}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {!!r.deskripsi && (
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Deskripsi</Text>
            <Text style={styles.isi}>{r.deskripsi}</Text>
          </View>
        )}

        {(!!r.alamat || !!wilayahTeks) && (
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Lokasi</Text>
            <View style={styles.lokasi}>
              <Feather name="map-pin" size={16} color={colors.brand} />
              <View style={{ flex: 1 }}>
                {!!r.alamat && <Text style={styles.isi}>{r.alamat}</Text>}
                {!!wilayahTeks && (
                  <Text style={styles.wilayah}>{wilayahTeks}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.kartu}>
          <Text style={styles.kartuJudul}>Riwayat Penanganan</Text>

          <Langkah
            judul="Laporan diterima"
            catatan="Laporan Anda masuk ke sistem."
            waktu={dibuat}
            ikon="inbox"
            terakhir={progres.length === 0}
          />

          {progres.map((p, i) => (
            <Langkah
              key={p.id}
              judul={p.status_label}
              catatan={[
                p.catatan,
                p.petugas?.name ? `Petugas: ${p.petugas.name}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              waktu={p.created_at ? waktuLengkap(p.created_at) : ""}
              ikon={IKON_PROGRES[p.status_progres] ?? "circle"}
              foto={p.foto_bukti_url ?? undefined}
              terakhir={i === progres.length - 1}
            />
          ))}

          {progres.length === 0 && (
            <Text style={styles.menunggu}>
              Belum ada pembaruan dari petugas. Anda akan diberi tahu begitu ada
              perkembangan.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Langkah({
  judul,
  catatan,
  waktu,
  ikon,
  foto,
  terakhir,
}: {
  judul: string;
  catatan: string;
  waktu: string;
  ikon: keyof typeof Feather.glyphMap;
  foto?: string;
  terakhir?: boolean;
}) {
  return (
    <View style={styles.langkah}>
      <View style={styles.garisWrap}>
        <View style={styles.titik}>
          <Feather name={ikon} size={9} color={colors.white} />
        </View>
        {!terakhir && <View style={styles.garis} />}
      </View>
      <View style={{ flex: 1, paddingBottom: terakhir ? 0 : 18 }}>
        <Text style={styles.langkahJudul}>{judul}</Text>
        {!!catatan && <Text style={styles.langkahCatatan}>{catatan}</Text>}
        {!!waktu && <Text style={styles.langkahWaktu}>{waktu}</Text>}
        {!!foto && (
          <Image
            source={{ uri: urlMedia(foto) }}
            style={styles.langkahFoto}
            accessibilityIgnoresInvertColors
            accessibilityLabel={`Foto bukti penanganan: ${judul}`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  kepala: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  judul: { flex: 1, fontSize: 19, fontWeight: "800", color: colors.text },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusTeks: { fontSize: 11, fontWeight: "700" },
  tiket: { fontSize: 12, color: colors.subtext, marginTop: 6 },
  gabungTaut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    padding: 14,
    marginTop: 14,
    minHeight: 44,
  },
  gabungTeks: { flex: 1, fontSize: 13, color: colors.brand, lineHeight: 18 },
  wilayah: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 17,
  },
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 16,
  },
  kartuJudul: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  instansi: { flexDirection: "row", alignItems: "center", gap: 8 },
  instansiTeks: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  routing: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 8,
  },
  catatanKotak: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FEF9E7",
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 12,
  },
  catatanTeks: { flex: 1, fontSize: 12, color: "#8A6D1B", lineHeight: 18 },
  bukti: { width: 120, height: 120, borderRadius: radius.sm },
  isi: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  lokasi: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  langkah: { flexDirection: "row", gap: 12 },
  garisWrap: { alignItems: "center", width: 16 },
  titik: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  garis: { flex: 1, width: 2, backgroundColor: "#DCF3EA", marginTop: 4 },
  langkahJudul: { fontSize: 14, fontWeight: "700", color: colors.text },
  langkahCatatan: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 4,
  },
  langkahWaktu: { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  langkahFoto: {
    width: 140,
    height: 140,
    borderRadius: radius.sm,
    marginTop: 10,
  },
  menunggu: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 8,
  },
});
