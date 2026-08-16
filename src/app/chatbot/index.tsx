import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SpeechButton from "@/components/SpeechButton";
import TypingDots from "@/components/TypingDots";
import { colors, radius, spacing } from "@/constants/theme";
import { useSpeech } from "@/hooks/useSpeech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  detailSesiChat,
  kirimPesanChat,
  saranPertanyaan,
  tandaiDibacakan,
} from "@/lib/api/chatbot";
import { ApiError } from "@/lib/api/error";
import type { PesanChat, SesiChat } from "@/types/chatbot";
import type { SumberInput } from "@/types/enums";

/**
 * Pesan yang sudah dikirim pengguna tapi belum dijawab peladen.
 *
 * `POST /chatbot/pesan` hanya mengembalikan balasan asisten — pesan pengguna
 * **sengaja tidak ikut** (§3.10), jadi satu-satunya yang tahu apa yang barusan
 * dikirim adalah layar ini. Tanpa menyimpannya, gelembung pengguna baru muncul
 * setelah model selesai berpikir belasan detik, dan selama itu layar tampak
 * seperti menelan pertanyaannya.
 */
type Antrean = { konten: string; sumber: SumberInput };

/**
 * Satu baris di daftar percakapan.
 *
 * Tiga bentuk yang berbeda asal-usulnya: pesan yang sudah tersimpan di
 * peladen, pesan yang masih dalam perjalanan, dan tempat balasan yang sedang
 * disusun. Menyatukannya sebagai data — bukan sebagai `ListFooterComponent` —
 * membuat ketiganya ikut aturan gulir yang sama.
 */
type Baris =
  | { jenis: "pesan"; kunci: string; pesan: PesanChat }
  | { jenis: "antrean"; kunci: string; antrean: Antrean }
  | { jenis: "menunggu"; kunci: string };

/**
 * Pemantik cadangan.
 *
 * `GET /chatbot/saran-pertanyaan` menyesuaikan wilayah pengguna dan lebih baik
 * dipakai bila ada. Tapi layar percakapan kosong tanpa satu pun tawaran adalah
 * kebuntuan yang nyata — pengguna baru sering tidak tahu boleh bertanya apa,
 * dan justru merekalah yang paling butuh asisten ini. Ketiga pertanyaan di
 * bawah dipilih karena mewakili tiga hal yang paling sering ditanyakan warga:
 * memilah, mengolah di rumah, dan menjual.
 */
const PEMANTIK_CADANGAN = [
  "Bagaimana cara memilah sampah rumah tangga?",
  "Bagaimana membuat kompos dari sisa dapur?",
  "Sampah apa saja yang laku dijual ke bank sampah?",
];

export default function Chatbot() {
  const params = useLocalSearchParams<{ sesi?: string }>();
  const qc = useQueryClient();
  const daftarRef = useRef<FlatList<Baris>>(null);

  const [sesiId, setSesiId] = useState<number | null>(
    params.sesi ? Number(params.sesi) : null,
  );
  const [teks, setTeks] = useState("");
  const [sumber, setSumber] = useState<SumberInput>("ketik");
  const [galat, setGalat] = useState("");
  const [antrean, setAntrean] = useState<Antrean | null>(null);

  /**
   * Id sementara untuk pesan pengguna yang ditulis ke cache.
   *
   * Selalu negatif supaya tidak mungkin bertabrakan dengan id dari peladen,
   * dan menurun supaya dua pesan beruntun tidak berbagi kunci React yang sama.
   * Umurnya pendek: pengambilan ulang sesi menggantinya dengan id sebenarnya.
   */
  const idSementara = useRef(-1);

  /**
   * Satu instance `useSpeech()` untuk seluruh layar.
   *
   * `expo-speech` hanya punya satu antrean ucapan untuk seluruh aplikasi:
   * kalau tiap tombol punya instance sendiri, tombol kedua yang berbicara akan
   * menghentikan yang pertama tanpa yang pertama tahu — ikonnya tertinggal
   * pada keadaan "sedang membaca" selamanya.
   */
  const speech = useSpeech();
  const suara = useVoiceInput();

  const sesiQ = useQuery({
    queryKey: ["chatbot", "sesi", sesiId],
    queryFn: () => detailSesiChat(sesiId!),
    enabled: !!sesiId,
  });

  const saranQ = useQuery({
    queryKey: ["chatbot", "saran"],
    queryFn: saranPertanyaan,
    enabled: !sesiId,
    staleTime: 10 * 60_000,
  });

  const pesan: PesanChat[] = sesiQ.data?.pesan ?? [];

  const dibacakan = useMutation({
    mutationFn: (id: number) => tandaiDibacakan(id),
  });

  const kirim = useMutation({
    mutationFn: (a: Antrean) =>
      kirimPesanChat({
        pesan: a.konten,
        sesi_id: sesiId ?? undefined,
        sumber_input: a.sumber,
      }),
    onSuccess: (hasil, a) => {
      /**
       * Cache ditulis langsung, tidak sekadar di-invalidate.
       *
       * Pada pesan pertama, `setSesiId` membuat `sesiQ` hidup untuk kunci yang
       * belum pernah terisi — dan sebuah query tanpa data awal berstatus
       * `isLoading`, yang berarti gelembung pengguna dan balasan yang baru saja
       * tiba tergantikan spinner kosong tepat di detik jawabannya sampai.
       * Menanam hasilnya lebih dulu membuat peralihan itu tidak terlihat sama
       * sekali; pengambilan ulang di bawah tetap berjalan untuk menukar id
       * sementara dengan id sebenarnya.
       */
      const pengguna: PesanChat = {
        id: idSementara.current--,
        role: "user",
        konten: a.konten,
        sumber_input: a.sumber,
        dibacakan: false,
        created_at: null,
      };

      qc.setQueryData<SesiChat>(["chatbot", "sesi", hasil.sesi_id], (lama) => {
        const dasar: SesiChat = lama ?? {
          id: hasil.sesi_id,
          judul: hasil.judul_sesi,
          terakhir_at: null,
          created_at: null,
        };
        return {
          ...dasar,
          id: hasil.sesi_id,
          judul: hasil.judul_sesi,
          pesan: [...(dasar.pesan ?? []), pengguna, hasil.pesan],
        };
      });

      setAntrean(null);
      // Sesi dibuat peladen pada pesan pertama; id-nya baru diketahui sekarang.
      if (!sesiId) setSesiId(hasil.sesi_id);
      void qc.invalidateQueries({
        queryKey: ["chatbot", "sesi", hasil.sesi_id],
      });
      void qc.invalidateQueries({ queryKey: ["chatbot", "daftar-sesi"] });
    },
    onError: (e: unknown, a) => {
      /**
       * Kalimat pengguna dikembalikan ke kolom, tidak dibuang.
       *
       * Gagal 503 berarti layanan AI tidak menjawab dan pertanyaannya tidak
       * ikut tersimpan. Menghapus kalimat pengguna di titik itu berarti ia
       * harus mendiktekan ulang seluruhnya — dan bagi pengguna yang memakai
       * suara justru karena kesulitan mengetik, itu kerugian yang nyata.
       *
       * Pengembaliannya bersyarat: kalau pengguna sudah mulai mengetik hal
       * lain selama menunggu, ketikannya yang menang.
       */
      setAntrean(null);
      setTeks((sekarang) => (sekarang.trim() ? sekarang : a.konten));
      setSumber(a.sumber);
      setGalat(
        e instanceof ApiError
          ? e.layananAiMati
            ? "Asisten sedang tidak dapat dihubungi. Pesan Anda dikembalikan ke kolom — coba kirim lagi sebentar lagi."
            : e.pesanUntukPengguna
          : "Pesan gagal dikirim.",
      );
    },
  });

  const kirimPesan = (isi?: string) => {
    const konten = (isi ?? teks).trim();
    if (!konten || kirim.isPending) return;
    setGalat("");

    // Kolom dikosongkan seketika, sebelum peladen menjawab: itulah yang membuat
    // pesan terasa benar-benar terkirim. Isinya tidak hilang — `onError`
    // mengembalikannya utuh bila pengiriman gagal.
    const a: Antrean = { konten, sumber: isi ? "ketik" : sumber };
    setAntrean(a);
    setTeks("");
    setSumber("ketik");
    suara.bersihkan();
    kirim.mutate(a);
  };

  // Transkrip suara masuk ke kolom teks, bukan langsung terkirim — pengguna
  // memeriksa dan menyunting lebih dulu. Ini inti arsitektur cascaded §9.
  useEffect(() => {
    if (suara.merekam && suara.teks) {
      setTeks(suara.teks);
      setSumber("suara");
    }
  }, [suara.merekam, suara.teks]);

  const baris: Baris[] = [
    ...pesan.map((p) => ({
      jenis: "pesan" as const,
      kunci: `pesan-${p.id}`,
      pesan: p,
    })),
    ...(antrean
      ? [{ jenis: "antrean" as const, kunci: "antrean", antrean }]
      : []),
    ...(kirim.isPending
      ? [{ jenis: "menunggu" as const, kunci: "menunggu" }]
      : []),
  ];

  // Sambutan menyingkir begitu ada yang dikirim, bukan menunggu jawaban tiba.
  const kosong = !sesiId && pesan.length === 0 && !antrean;

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
        <View style={{ flex: 1 }}>
          <Text style={styles.appbarTitle}>Asisten Resikita</Text>
          <Text style={styles.appbarSub}>
            {kirim.isPending ? "Sedang mengetik…" : "Tanya soal sampah"}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/chatbot/riwayat" as Href)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Riwayat percakapan"
        >
          <Feather name="clock" size={22} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        {kosong ? (
          <View style={styles.sambutan}>
            <View style={styles.sambutanIkon}>
              <Feather name="message-circle" size={30} color={colors.white} />
            </View>
            <Text style={styles.sambutanJudul}>Ada yang ingin ditanyakan?</Text>
            <Text style={styles.sambutanTeks}>
              Tanyakan apa saja soal memilah sampah, kompos, bank sampah, atau
              daur ulang. Anda bisa mengetik atau berbicara.
            </Text>

            {/*
              Pemantik dari peladen bila ada; kalau tidak, yang lokal.
              Tidak pernah kosong — itu intinya.
            */}
            {(() => {
              const pemantik = (saranQ.data ?? []).length
                ? (saranQ.data ?? [])
                : PEMANTIK_CADANGAN;
              return (
              <View style={styles.saranWrap}>
                {pemantik.slice(0, 3).map((s) => (
                  <Pressable
                    key={s}
                    style={styles.saran}
                    onPress={() => kirimPesan(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`Tanyakan: ${s}`}
                  >
                    <Feather
                      name="message-square"
                      size={15}
                      color={colors.brand}
                    />
                    <Text style={styles.saranTeks}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              );
            })()}
          </View>
        ) : sesiQ.isLoading && !antrean ? (
          <View style={styles.tengah}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : (
          <FlatList
            ref={daftarRef}
            data={baris}
            keyExtractor={(b) => b.kunci}
            contentContainerStyle={{ padding: spacing.md, gap: 12 }}
            renderItem={({ item }) => {
              if (item.jenis === "antrean") {
                return <GelembungAntrean antrean={item.antrean} />;
              }
              if (item.jenis === "menunggu") {
                return (
                  <View
                    style={styles.mengetik}
                    accessibilityLiveRegion="polite"
                    accessibilityLabel="Asisten sedang menyusun jawaban"
                  >
                    <TypingDots />
                  </View>
                );
              }
              const p = item.pesan;
              return (
                <Gelembung
                  p={p}
                  speech={speech}
                  onSelesaiDibacakan={() => {
                    if (!p.dibacakan) dibacakan.mutate(p.id);
                  }}
                />
              );
            }}
            onContentSizeChange={() =>
              daftarRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {!!galat && (
          <Text style={styles.galat} accessibilityLiveRegion="polite">
            {galat}
          </Text>
        )}

        <View style={styles.komposer}>
          <TextInput
            style={styles.input}
            value={teks}
            onChangeText={(v) => {
              setTeks(v);
              if (!v.trim() && sumber === "suara") setSumber("ketik");
            }}
            placeholder={
              suara.merekam ? "Mendengarkan…" : "Tulis pertanyaan Anda…"
            }
            placeholderTextColor="#9AA5B1"
            multiline
            editable={!suara.merekam}
            accessibilityLabel="Pertanyaan untuk asisten"
          />

          {suara.didukung && (
            <Pressable
              style={[styles.mic, suara.merekam && styles.micAktif]}
              onPress={() => (suara.merekam ? suara.berhenti() : suara.mulai())}
              accessibilityRole="button"
              accessibilityLabel={
                suara.merekam
                  ? "Berhenti merekam"
                  : "Diktekan pertanyaan dengan suara"
              }
              accessibilityHint={
                suara.merekam
                  ? undefined
                  : "Ucapan Anda muncul di kolom teks dan bisa disunting sebelum dikirim"
              }
              accessibilityState={{ busy: suara.merekam }}
            >
              <Feather
                name={suara.merekam ? "square" : "mic"}
                size={18}
                color={suara.merekam ? colors.white : colors.brand}
              />
            </Pressable>
          )}

          <Pressable
            style={[
              styles.kirim,
              (!teks.trim() || kirim.isPending) && styles.kirimMati,
            ]}
            onPress={() => kirimPesan()}
            disabled={!teks.trim() || kirim.isPending}
            accessibilityRole="button"
            accessibilityLabel="Kirim pertanyaan"
            accessibilityState={{
              disabled: !teks.trim() || kirim.isPending,
              busy: kirim.isPending,
            }}
          >
            <Feather name="send" size={18} color={colors.white} />
          </Pressable>
        </View>

        {!!suara.galat && (
          <Text style={styles.galatSuara} accessibilityLiveRegion="polite">
            {suara.galat}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Gelembung pesan pengguna yang belum sampai ke peladen.
 *
 * Rupanya sengaja sama persis dengan gelembung yang sudah terkirim, hanya
 * sedikit lebih pudar dan berpenanda jam. Yang perlu diyakinkan pengguna
 * adalah kalimatnya sudah berangkat — bukan bahwa sistemnya sedang sibuk;
 * itu tugas titik-titik di bawahnya.
 */
function GelembungAntrean({ antrean }: { antrean: Antrean }) {
  const didiktekan = antrean.sumber === "suara";
  return (
    <View
      style={[styles.gelembungWrap, styles.kanan]}
      accessible
      accessibilityLabel={`Pesan Anda: ${antrean.konten}. Sedang dikirim.`}
    >
      <View
        style={[
          styles.gelembung,
          styles.gelembungUser,
          styles.gelembungAntrean,
        ]}
      >
        <Text style={[styles.pesanTeks, { color: colors.white }]}>
          {antrean.konten}
        </Text>
        <View style={styles.tandaSuara}>
          <Feather
            name={didiktekan ? "mic" : "clock"}
            size={11}
            color={colors.white70}
          />
          <Text style={styles.tandaSuaraTeks}>
            {didiktekan ? "didiktekan · mengirim" : "mengirim"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Gelembung({
  p,
  speech,
  onSelesaiDibacakan,
}: {
  p: PesanChat;
  speech: ReturnType<typeof useSpeech>;
  onSelesaiDibacakan: () => void;
}) {
  const dariPengguna = p.role === "user";

  return (
    <View
      style={[
        styles.gelembungWrap,
        dariPengguna ? styles.kanan : styles.kiri,
      ]}
    >
      <View
        style={[
          styles.gelembung,
          dariPengguna ? styles.gelembungUser : styles.gelembungModel,
        ]}
      >
        <Text
          style={[
            styles.pesanTeks,
            dariPengguna && { color: colors.white },
          ]}
        >
          {p.konten}
        </Text>

        {dariPengguna && p.sumber_input === "suara" && (
          <View style={styles.tandaSuara}>
            <Feather name="mic" size={11} color={colors.white70} />
            <Text style={styles.tandaSuaraTeks}>didiktekan</Text>
          </View>
        )}
      </View>

      {/*
        Tombol dengar hanya pada balasan asisten. Jawabannya sudah disiapkan
        peladen tanpa judul markdown, tabel, atau blok kode, jadi bisa langsung
        dilempar ke TTS tanpa pembersihan tambahan.
      */}
      {!dariPengguna && (
        <SpeechButton
          teks={p.konten}
          speech={speech}
          ukuran="kecil"
          onSelesaiDibacakan={onSelesaiDibacakan}
        />
      )}
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
    paddingVertical: 12,
  },
  appbarTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  appbarSub: { fontSize: 12, color: colors.subtext, marginTop: 1 },
  tengah: { flex: 1, alignItems: "center", justifyContent: "center" },
  sambutan: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: 10,
  },
  sambutanIkon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sambutanJudul: { fontSize: 17, fontWeight: "700", color: colors.text },
  sambutanTeks: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 20,
  },
  saranWrap: { gap: 8, marginTop: 16, alignSelf: "stretch" },
  saran: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  saranTeks: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  gelembungWrap: { maxWidth: "88%", gap: 6 },
  kiri: { alignSelf: "flex-start", alignItems: "flex-start" },
  kanan: { alignSelf: "flex-end", alignItems: "flex-end" },
  gelembung: { borderRadius: radius.lg, padding: 14 },
  gelembungUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  gelembungModel: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  // Cukup pudar untuk terbaca sebagai "belum tuntas", masih jauh di atas
  // ambang kontras WCAG untuk teks putih di atas warna merek.
  gelembungAntrean: { opacity: 0.85 },
  pesanTeks: { fontSize: 14, color: colors.text, lineHeight: 21 },
  tandaSuara: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  tandaSuaraTeks: { fontSize: 10, color: colors.white70 },
  mengetik: { alignSelf: "flex-start", marginTop: 4 },
  galat: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
    lineHeight: 17,
  },
  galatSuara: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  komposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
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
  kirim: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  kirimMati: { backgroundColor: colors.muted },
});
