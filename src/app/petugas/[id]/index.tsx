import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Image,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import LeafletMap from "@/components/LeafletMap";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { ZOOM_TITIK } from "@/constants/peta";
import { colors, radius, spacing } from "@/constants/theme";
import { useBottomPad } from "@/hooks/useBottomPad";
import { ApiError } from "@/lib/api/error";
import { detailPenugasan, kirimProgresPenugasan } from "@/lib/api/petugas";
import { confirmDialog, notify } from "@/lib/dialog";
import { metaStatus } from "@/lib/statusLaporan";

const waktuLengkap = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "waktu yang tidak tercatat";

/**
 * Buka rute ke lokasi laporan di aplikasi peta perangkat.
 *
 * Memakai `google.navigation:` di Android supaya langsung masuk mode
 * berkendara, petugas yang sedang di jalan tidak perlu menekan tombol
 * "mulai" sekali lagi. Cadangannya URL Google Maps biasa.
 */
async function bukaRute(lat: number, lng: number) {
  const navigasi = `google.navigation:q=${lat},${lng}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  try {
    if (await Linking.canOpenURL(navigasi)) {
      await Linking.openURL(navigasi);
      return;
    }
  } catch {
    // Perangkat tidak mengenali skema navigasi, pakai cadangan.
  }
  await Linking.openURL(web);
}

export default function DetailPenugasan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nomor = Number(id);
  const qc = useQueryClient();
  const pad = useBottomPad();

  const q = useQuery({
    queryKey: ["petugas", "penugasan", "detail", nomor],
    queryFn: () => detailPenugasan(nomor),
    enabled: Number.isFinite(nomor),
  });

  /**
   * Tidak ada endpoint `/mulai` terpisah.
   *
   * Satu endpoint progres melayani dua peristiwa, dibedakan `status_progres`:
   * `"dikerjakan"` mencatat kemajuan, `"selesai"` menutup laporan induknya.
   * Memulai penugasan berarti mencatat progres pertama, bukan memanggil aksi
   * lain. Foto bukti hanya wajib saat menyelesaikan, jadi langkah ini boleh
   * tanpa foto.
   */
  const mulai = useMutation({
    mutationFn: () =>
      kirimProgresPenugasan(nomor, { status_progres: "dikerjakan" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["petugas"] });
      notify(
        "Penugasan dimulai",
        "Status laporan berubah menjadi sedang dikerjakan. Pelapor akan melihat perubahannya.",
      );
    },
    onError: (e: unknown) =>
      notify(
        "Gagal",
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Penugasan tidak dapat dimulai.",
      ),
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
      <Text style={styles.appbarTitle}>Detail Penugasan</Text>
    </View>
  );

  if (q.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat penugasan…" />
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

  /*
    `GET /petugas/penugasan/{laporan_id}` mengembalikan objek **Laporan**, bukan
    pembungkus penugasan yang memuatnya. Versi sebelumnya membaca `q.data.laporan`
    — kunci yang tidak ada di sana — sehingga seluruh isi layar ini bernilai
    `undefined`. Nama `l` dipertahankan agar sisa berkas tidak perlu diubah.
  */
  const l = q.data;
  const s = metaStatus(l.status);
  const adaKoordinat =
    Number.isFinite(l.latitude) && Number.isFinite(l.longitude);
  const belumMulai = l.status === "ditugaskan";
  const selesai = l.status === "selesai";
  // `foto` adalah array objek `{ id, url, urutan }`, bukan array URL.
  const foto = (l.foto ?? []).map((f) => f.url);
  const progres = l.progres ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <ScrollView contentContainerStyle={{ paddingBottom: pad }}>
        {adaKoordinat && (
          <LeafletMap
            style={styles.map}
            center={{ lat: l.latitude, lng: l.longitude }}
            zoom={ZOOM_TITIK}
            markers={[
              { id: l.id, lat: l.latitude, lng: l.longitude, color: "red" },
            ]}
          />
        )}

        <View style={styles.isi}>
          <View style={styles.kepala}>
            <Text style={styles.judul}>{l.judul}</Text>
            <View style={[styles.status, { backgroundColor: s.bg }]}>
              <Feather name={s.icon} size={13} color={s.fg} />
              <Text style={[styles.statusTeks, { color: s.fg }]}>
                {s.label}
              </Text>
            </View>
          </View>
          <Text style={styles.tiket}>
            {l.tiket} · dilaporkan {waktuLengkap(l.created_at)}
          </Text>

          {!!l.alamat && (
            <View style={styles.kartu}>
              <Text style={styles.kartuJudul}>Lokasi</Text>
              <View style={styles.baris}>
                <Feather name="map-pin" size={16} color={colors.brand} />
                <Text style={styles.barisTeks}>{l.alamat}</Text>
              </View>
              <Text style={styles.koordinat}>
                {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
              </Text>
            </View>
          )}

          {!!l.deskripsi && (
            <View style={styles.kartu}>
              <Text style={styles.kartuJudul}>Keterangan Pelapor</Text>
              <Text style={styles.barisTeks}>{l.deskripsi}</Text>
            </View>
          )}

          {foto.length > 0 && (
            <View style={styles.kartu}>
              <Text style={styles.kartuJudul}>Foto dari Pelapor</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {foto.map((uri, i) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={styles.bukti}
                    accessibilityIgnoresInvertColors
                    accessibilityLabel={`Foto pelapor ke-${i + 1}`}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {progres.length > 0 && (
            <View style={styles.kartu}>
              <Text style={styles.kartuJudul}>Progres yang Sudah Dicatat</Text>
              {progres.map((pr) => (
                <View key={pr.id} style={styles.progres}>
                  <View style={styles.titik} />
                  <View style={{ flex: 1 }}>
                    {/*
                      Label datang dari peladen sebagai `status_label`. Kunci
                      statusnya sendiri bernama `status_progres`, bukan `status`,
                      dan nilainya hanya dua — `dikerjakan` atau `selesai` —
                      sehingga tidak bisa dilewatkan ke `metaStatus` yang
                      mengharapkan status laporan.
                    */}
                    <Text style={styles.progresStatus}>{pr.status_label}</Text>
                    {!!pr.catatan && (
                      <Text style={styles.progresCatatan}>{pr.catatan}</Text>
                    )}
                    <Text style={styles.progresWaktu}>
                      {waktuLengkap(pr.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        {adaKoordinat && (
          <Pressable
            style={styles.tombolKedua}
            onPress={() => bukaRute(l.latitude, l.longitude)}
            accessibilityRole="button"
            accessibilityLabel="Buka rute ke lokasi laporan"
          >
            <Feather name="navigation" size={17} color={colors.brand} />
            <Text style={styles.tombolKeduaTeks}>Rute</Text>
          </Pressable>
        )}

        {selesai ? (
          <View style={styles.selesai}>
            <Feather name="check-circle" size={17} color={colors.brand} />
            <Text style={styles.selesaiTeks}>Penugasan Selesai</Text>
          </View>
        ) : belumMulai ? (
          <Pressable
            style={styles.tombolUtama}
            onPress={async () => {
              const yakin = await confirmDialog(
                "Mulai kerjakan?",
                "Status laporan akan berubah jadi sedang dikerjakan dan pelapor melihat perubahannya.",
                "Mulai",
              );
              if (yakin) mulai.mutate();
            }}
            disabled={mulai.isPending}
            accessibilityRole="button"
            accessibilityLabel="Mulai kerjakan penugasan ini"
            accessibilityState={{ busy: mulai.isPending }}
          >
            {mulai.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="play" size={17} color={colors.white} />
                <Text style={styles.tombolUtamaTeks}>Mulai Kerjakan</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={styles.tombolUtama}
            onPress={() => router.push(`/petugas/${l.id}/progres` as Href)}
            accessibilityRole="button"
            accessibilityLabel="Catat progres penanganan"
          >
            <Feather name="edit-3" size={17} color={colors.white} />
            <Text style={styles.tombolUtamaTeks}>Catat Progres</Text>
          </Pressable>
        )}
      </BottomBar>
    </SafeAreaView>
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
  map: { height: 200, width: "100%" },
  isi: { padding: spacing.lg },
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
    marginBottom: 10,
  },
  baris: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  barisTeks: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  koordinat: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  bukti: { width: 130, height: 130, borderRadius: radius.sm },
  progres: { flexDirection: "row", gap: 12, marginBottom: 14 },
  titik: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    marginTop: 5,
  },
  progresStatus: { fontSize: 14, fontWeight: "700", color: colors.text },
  progresCatatan: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
    marginTop: 3,
  },
  progresWaktu: { fontSize: 11, color: "#94A3B8", marginTop: 3 },
  tombolUtama: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  tombolUtamaTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
  tombolKedua: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  tombolKeduaTeks: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  selesai: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "#DCF3EA",
  },
  selesaiTeks: { color: colors.brand, fontWeight: "700", fontSize: 15 },
});
