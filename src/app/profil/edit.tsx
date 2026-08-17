import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WilayahPicker } from "@/components/WilayahPicker";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWilayah } from "@/hooks/useWilayah";
import { ubahProfil, ubahProfilDenganAvatar } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/error";
import { notify } from "@/lib/dialog";
import type { IsoDate } from "@/types/api";
import { urlMedia } from "@/lib/media";

const initials = (name: string) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** `Date` → `YYYY-MM-DD`, tanpa melewati UTC yang bisa menggeser tanggalnya sehari. */
function keIsoDate(d: Date): IsoDate {
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tanggal = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${tanggal}`;
}

function dariIsoDate(nilai?: string | null): Date | null {
  if (!nilai) return null;
  const d = new Date(`${nilai}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function EditProfil() {
  const { user, refresh } = useAuth();
  const wilayah = useWilayah(user?.wilayah);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [tgl, setTgl] = useState<Date | null>(dariIsoDate(user?.tanggal_lahir));
  const [showDate, setShowDate] = useState(false);
  const [jk, setJk] = useState<"L" | "P" | "">(user?.jenis_kelamin ?? "");
  const [errorField, setErrorField] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  /**
   * Tidak ada endpoint `/profil/avatar` terpisah.
   *
   * Avatar adalah salah satu field profil, jadi ia dikirim lewat `PUT /profil`
   * yang sama, dalam bentuk multipart. Badan `{}` di sini disengaja: dokumen
   * menyatakan seluruh field profil opsional dan hanya yang dikirim yang
   * diperbarui, sehingga mengunggah foto tidak menyentuh nama, telepon, maupun
   * domisili — termasuk suntingan yang sedang terbuka di layar dan belum
   * disimpan.
   */
  const gantiAvatar = useMutation({
    mutationFn: (uri: string) => ubahProfilDenganAvatar({}, uri),
    onSuccess: async () => {
      await refresh();
      notify("Tersimpan", "Foto profil Anda sudah diperbarui.");
    },
    onError: (e: unknown) =>
      notify(
        "Gagal",
        e instanceof ApiError
          ? e.pesanUntukPengguna
          : "Foto tidak dapat diunggah.",
      ),
  });

  const pilihAvatar = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      notify("Izin ditolak", "Beri izin galeri untuk mengganti foto profil.");
      return;
    }
    const hasil = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ["images"],
      // Dipotong persegi karena avatar dirender bulat di seluruh aplikasi;
      // memotongnya di sini mencegah wajah pengguna terpangkas sembarangan.
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!hasil.canceled && hasil.assets[0]) {
      gantiAvatar.mutate(hasil.assets[0].uri);
    }
  };

  const simpan = useMutation({
    mutationFn: () =>
      ubahProfil({
        name: name.trim(),
        // String kosong bukan hal yang sama dengan "tidak diisi". Mengirim ""
        // membuat peladen memvalidasi nilai kosong itu dan menolaknya; `null`
        // yang berarti "kosongkan field ini".
        phone: phone.trim() || null,
        tanggal_lahir: tgl ? keIsoDate(tgl) : null,
        jenis_kelamin: jk || null,
        // Hanya dikirim setelah keempat tingkat terpilih. Mengirim id kecamatan
        // sebagai `wilayah_id` akan diterima peladen tapi menempatkan pengguna
        // di tingkat yang salah.
        ...(wilayah.wilayahId ? { wilayah_id: wilayah.wilayahId } : {}),
      }),
    onSuccess: async () => {
      await refresh();
      notify("Tersimpan", "Profil berhasil diperbarui.");
      router.back();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        setErrorField({
          name: e.pesanField("name") ?? "",
          phone: e.pesanField("phone") ?? "",
          tanggal_lahir: e.pesanField("tanggal_lahir") ?? "",
          wilayah_id: e.pesanField("wilayah_id") ?? "",
        });
        setError(e.errors ? "" : e.pesanUntukPengguna);
      } else {
        setError("Tidak dapat menyimpan perubahan.");
      }
    },
  });

  const kirim = () => {
    setError("");
    setErrorField({});
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    simpan.mutate();
  };

  /**
   * `user.wilayah` adalah **satu** objek Wilayah di tingkat desa, bukan struktur
   * bertingkat empat. Versi sebelumnya membaca `.desa.nama` — kunci yang tidak
   * pernah ada di sana — sehingga nilainya selalu `undefined` dan kartu domisili
   * menyatakan "Belum diisi" bahkan kepada pengguna yang domisilinya sudah
   * tersimpan.
   *
   * `nama_lengkap` sudah dirangkai peladen. Merangkainya sendiri dari `nama` dan
   * `tingkat_label` menghasilkan "Kabupaten Kabupaten Badung" untuk wilayah yang
   * namanya memang memuat sebutan tingkatnya.
   */
  const wilayahTersimpan = user?.wilayah?.nama_lengkap;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Edit Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={pilihAvatar}
            disabled={gantiAvatar.isPending}
            style={styles.avatar}
            accessibilityRole="button"
            accessibilityLabel={
              user?.avatar_url ? "Ganti foto profil" : "Tambahkan foto profil"
            }
            accessibilityState={{ busy: gantiAvatar.isPending }}
          >
            {gantiAvatar.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : user?.avatar_url ? (
              <Image
                source={{ uri: urlMedia(user.avatar_url) }}
                style={styles.avatarFoto}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.avatarText}>
                {initials(name || user?.name || "")}
              </Text>
            )}
            <View style={styles.avatarKamera}>
              <Feather name="camera" size={13} color={colors.white} />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            Ketuk untuk {user?.avatar_url ? "mengganti" : "menambahkan"} foto
            profil
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Pribadi</Text>

          <Baris label="Nama Lengkap" icon="user" error={errorField.name}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
              placeholderTextColor="#9AA5B1"
              accessibilityLabel="Nama lengkap"
            />
          </Baris>

          <Baris label="Nomor WhatsApp" icon="phone" error={errorField.phone}>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="08xxxxxxxxxx (opsional)"
              placeholderTextColor="#9AA5B1"
              keyboardType="phone-pad"
              accessibilityLabel="Nomor WhatsApp, opsional"
            />
          </Baris>

          <Baris
            label="Tanggal Lahir"
            icon="calendar"
            error={errorField.tanggal_lahir}
          >
            {/*
              Pemilih tanggal, bukan input teks bebas. Format YYYY-MM-DD yang
              diketik manual adalah sumber galat 422 yang tidak perlu, dan
              tidak ada cara pengguna menebak formatnya tanpa diberi tahu.
            */}
            {/*
              Kotaknya sekadar `View`; dua kendali di dalamnya bersaudara, bukan
              bersarang. Sebelumnya tombol hapus berada **di dalam** kotak yang
              juga sebuah tombol, dan react-native-web menerjemahkan keduanya
              menjadi elemen `<button>` sungguhan — `<button>` di dalam
              `<button>` adalah HTML tidak sah yang memicu galat hidrasi React.
              Menjadikannya bersaudara juga menghapus kebutuhan akan
              `stopPropagation`, karena tidak ada lagi induk yang bisa menangkap
              ketukan yang sama.
            */}
            <View style={styles.dateBox}>
              <Pressable
                style={styles.datePilih}
                onPress={() => setShowDate(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  tgl
                    ? `Tanggal lahir ${keIsoDate(tgl)}. Ketuk untuk mengubah`
                    : "Pilih tanggal lahir"
                }
              >
                <Text
                  style={{ color: tgl ? colors.text : "#9AA5B1", fontSize: 15 }}
                >
                  {tgl ? keIsoDate(tgl) : "Pilih tanggal"}
                </Text>
              </Pressable>
              {!!tgl && (
                <Pressable
                  onPress={() => setTgl(null)}
                  hitSlop={10}
                  style={styles.dateHapus}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus tanggal lahir"
                >
                  <Feather name="x" size={16} color={colors.subtext} />
                </Pressable>
              )}
            </View>
            {showDate && (
              <DateTimePicker
                value={tgl ?? new Date(2000, 0, 1)}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, d) => {
                  setShowDate(Platform.OS === "ios");
                  if (d) setTgl(d);
                }}
              />
            )}
          </Baris>

          <Text style={styles.label}>Jenis Kelamin</Text>
          <View style={styles.jkRow}>
            {(["L", "P"] as const).map((v) => {
              const aktif = jk === v;
              const teks = v === "L" ? "Laki-laki" : "Perempuan";
              return (
                <Pressable
                  key={v}
                  style={[styles.jkBtn, aktif && styles.jkActive]}
                  onPress={() => setJk(aktif ? "" : v)}
                  accessibilityRole="radio"
                  accessibilityLabel={teks}
                  accessibilityState={{ selected: aktif }}
                >
                  <Text style={[styles.jkText, aktif && { color: colors.white }]}>
                    {teks}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Domisili</Text>
          <Text style={styles.cardSub}>
            {wilayahTersimpan
              ? "Menentukan fasilitas mana yang ditampilkan dan menajamkan jawaban asisten."
              : "Belum diisi. Melengkapinya membuat fasilitas terdekat dan jawaban asisten lebih relevan."}
          </Text>
          {!!wilayahTersimpan && (
            <View style={styles.wilayahKini}>
              <Feather name="map-pin" size={14} color={colors.brand} />
              <Text style={styles.wilayahKiniTeks} numberOfLines={2}>
                {wilayahTersimpan}
              </Text>
            </View>
          )}
          <WilayahPicker wilayah={wilayah} />
          {!!errorField.wilayah_id && (
            <Text style={styles.errField}>{errorField.wilayah_id}</Text>
          )}
          {!wilayah.lengkap && !!wilayah.pilihan.provinsi && (
            <Text style={styles.hint}>
              Pilih sampai tingkat desa agar domisili tersimpan.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Akun</Text>
          <ReadOnly label="Email" value={user?.email || "-"} />
          <ReadOnly label="ID Nasabah" value={user?.kode_qr || "-"} last />
          <Text style={styles.note}>
            Email dipakai untuk masuk dan tidak dapat diubah sendiri. ID Nasabah
            adalah kode yang ditunjukkan ke petugas bank sampah saat menyetor.
          </Text>
        </View>

        {!!error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Pressable
          style={[styles.save, simpan.isPending && { opacity: 0.7 }]}
          onPress={kirim}
          disabled={simpan.isPending}
          accessibilityRole="button"
          accessibilityLabel="Simpan perubahan profil"
          accessibilityState={{ disabled: simpan.isPending, busy: simpan.isPending }}
        >
          {simpan.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Simpan Perubahan</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Baris({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.labelRow}>
        <Feather name={icon} size={14} color={colors.subtext} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
      {!!error && <Text style={styles.errField}>{error}</Text>}
    </View>
  );
}

function ReadOnly({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.roRow, !last && styles.roBorder]}>
      <Text style={styles.roLabel}>{label}</Text>
      <Text style={styles.roValue} numberOfLines={1}>
        {value}
      </Text>
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
  avatarWrap: { alignItems: "center", marginBottom: 18, gap: 8 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 30 },
  avatarFoto: { width: "100%", height: "100%" },
  avatarKamera: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandDark,
    borderWidth: 2,
    borderColor: "#EEF3F1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { color: colors.subtext, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 17,
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: { fontSize: 13, color: colors.subtext, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    backgroundColor: colors.white,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.white,
  },
  // Mengisi seluruh sisa kotak supaya area ketuk untuk membuka pemilih tanggal
  // tetap selebar dulu, bukan menyusut sebesar teksnya saja.
  wilayahKini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  wilayahKiniTeks: {
    flex: 1,
    fontSize: 13,
    color: colors.brand,
    fontWeight: "600",
    lineHeight: 18,
  },
  datePilih: { flex: 1, height: "100%", justifyContent: "center" },
  dateHapus: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  jkRow: { flexDirection: "row", gap: 12 },
  jkBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  jkActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  jkText: { color: colors.text, fontWeight: "600" },
  roRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  roBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  roLabel: { color: colors.subtext, fontSize: 14 },
  roValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
  },
  note: { color: "#94A3B8", fontSize: 12, marginTop: 10, lineHeight: 17 },
  hint: { color: colors.subtext, fontSize: 12, marginTop: 4 },
  errField: { color: colors.danger, fontSize: 12, marginTop: 4 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  save: {
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
