import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomBar from "@/components/BottomBar";
import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { Bidang, PesanGalat } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useBottomPad } from "@/hooks/useBottomPad";
import { useDebounce } from "@/hooks/useDebounce";
import { useGalatForm } from "@/hooks/useGalatForm";
import { useKeranjang } from "@/hooks/useKeranjang";
import { saldoDompet } from "@/lib/api/dompet";
import { ApiError } from "@/lib/api/error";
import { checkout, pratinjauPesanan } from "@/lib/api/pesanan";
import { cariTujuanOngkir } from "@/lib/api/produk";
import { notify } from "@/lib/dialog";
import { formatRupiah } from "@/lib/rupiah";
import type { MetodeBayar } from "@/types/enums";
import type {
  KelompokKeranjang,
  OpsiOngkir,
  TujuanOngkir,
} from "@/types/produk";

/** Peladen menolak kata kunci pencarian alamat di bawah tiga huruf. */
const MINIMAL_CARI = 3;

/** Kunci pilihan kurir, dipetakan per `umkm_id`. */
type PilihanKurir = Record<number, OpsiOngkir | undefined>;

/**
 * Checkout untuk **seluruh** isi keranjang sekaligus.
 *
 * Belanja lintas toko dipecah peladen menjadi beberapa pesanan, masing-masing
 * dengan ongkirnya sendiri — tapi pemecahan itu terjadi dalam **satu**
 * permintaan yang wajib memuat pilihan pengiriman untuk setiap toko. Versi
 * sebelumnya melakukan checkout per toko dan karena itu selalu ditolak begitu
 * keranjang berisi lebih dari satu penjual.
 */
export default function Checkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const pad = useBottomPad();
  const k = useKeranjang();
  const galat = useGalatForm();

  const [nama, setNama] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [alamat, setAlamat] = useState("");
  const [cariTujuan, setCariTujuan] = useState("");
  const cariTertunda = useDebounce(cariTujuan);
  const [tujuan, setTujuan] = useState<TujuanOngkir | null>(null);
  const [kurir, setKurir] = useState<PilihanKurir>({});
  const [metode, setMetode] = useState<MetodeBayar>("midtrans");

  /**
   * Toko yang ikut dipesan.
   *
   * `null` berarti "belum disentuh" dan diperlakukan sebagai seluruh isi
   * keranjang, jadi tidak ada efek samping yang perlu menyalin daftar toko ke
   * state begitu keranjang selesai dimuat. Nilai yang sudah dipilih pun disaring
   * ulang terhadap isi keranjang terkini — kalau sebuah toko lenyap karena
   * produknya dibersihkan peladen, id-nya ikut hilang alih-alih tertinggal dan
   * membuat `POST /pesanan` ditolak dengan "toko tidak ada di keranjang".
   */
  const [pilihan, setPilihan] = useState<number[] | null>(null);

  const idToko = useMemo(
    () =>
      k.toko
        .map((t) => t.umkm?.id)
        .filter((id): id is number => typeof id === "number"),
    [k.toko],
  );

  const terpilih = useMemo(
    () => (pilihan === null ? idToko : idToko.filter((id) => pilihan.includes(id))),
    [pilihan, idToko],
  );

  const tokoTerpilih = useMemo(
    () => k.toko.filter((t) => t.umkm?.id != null && terpilih.includes(t.umkm.id)),
    [k.toko, terpilih],
  );

  /** Kunci query pratinjau ikut memuat pilihan toko — urutannya distabilkan. */
  const kunciTerpilih = useMemo(
    () => [...terpilih].sort((a, b) => a - b).join(","),
    [terpilih],
  );

  const saldoQ = useQuery({ queryKey: ["dompet", "saldo"], queryFn: saldoDompet });

  /**
   * Pencarian alamat tujuan.
   *
   * Query-nya bernama `cari` di peladen. Ketika klien mengirim `q`, peladen
   * mengabaikannya diam-diam, mencari tanpa kata kunci, dan mengembalikan
   * daftar kosong — itulah "lokasi tidak ditemukan" yang muncul untuk nama
   * kecamatan yang sebenarnya benar.
   */
  const tujuanQ = useQuery({
    queryKey: ["ongkir", "tujuan", cariTertunda],
    queryFn: () => cariTujuanOngkir(cariTertunda.trim()),
    enabled: cariTertunda.trim().length >= MINIMAL_CARI && !tujuan,
    retry: false,
  });

  /**
   * Rincian per toko beserta pilihan ongkirnya.
   *
   * Berat dan ongkos dihitung peladen; klien tidak menjumlahkan apa pun sendiri.
   */
  const pratinjauQ = useQuery({
    queryKey: ["pesanan", "pratinjau", tujuan?.id, kunciTerpilih],
    queryFn: () =>
      pratinjauPesanan({ destination_id: tujuan!.id, umkm_ids: terpilih }),
    enabled: !!tujuan && terpilih.length > 0,
    retry: false,
  });

  const pratinjau = useMemo(() => pratinjauQ.data ?? [], [pratinjauQ.data]);

  /**
   * Subtotal sebelum alamat tujuan dipilih.
   *
   * Pratinjau baru ada setelah ada `destination_id`, tapi subtotal tiap toko
   * sudah dikirim peladen bersama isi keranjang. Yang dijumlah di sini hanyalah
   * angka-angka itu; tidak ada harga, diskon, atau ongkos yang dihitung ulang.
   * Versi sebelumnya menampilkan Rp 0 sampai pengguna selesai mencari alamat.
   */
  const subtotal =
    pratinjau.length > 0
      ? pratinjau.reduce((n, t) => n + t.subtotal, 0)
      : tokoTerpilih.reduce((n, t) => n + t.subtotal, 0);
  const jumlahBarang = tokoTerpilih.reduce(
    (n, t) => n + (t.item ?? []).reduce((m, it) => m + it.qty, 0),
    0,
  );
  const totalOngkir = pratinjau.reduce(
    (n, t) => n + (kurir[t.umkm_id]?.biaya ?? 0),
    0,
  );
  const perkiraanTotal = subtotal + totalOngkir;
  const semuaKurirDipilih =
    pratinjau.length > 0 && pratinjau.every((t) => kurir[t.umkm_id]);

  const penerimaLengkap =
    !!nama.trim() && !!phone.trim() && alamat.trim().length >= 10 && !!tujuan;

  const saldo = saldoQ.data?.saldo ?? 0;
  const saldoKurang = metode === "saldo" && saldo < perkiraanTotal;

  /**
   * Centang/hapus centang satu toko.
   *
   * Pilihan kurir toko itu ikut dibuang: kalau tokonya dicentang lagi nanti,
   * tarifnya diambil ulang dari pratinjau yang baru. Menyimpan pilihan lama
   * berisiko mengirim layanan yang sudah tidak ada di daftar dan ditolak peladen
   * dengan "layanan pengiriman yang dipilih sudah tidak tersedia".
   */
  const alihToko = (id: number) => {
    setPilihan((s) => {
      const sekarang = s === null ? idToko : s;
      return sekarang.includes(id)
        ? sekarang.filter((n) => n !== id)
        : [...sekarang, id];
    });
    setKurir((s) => {
      const { [id]: _dibuang, ...sisa } = s;
      return sisa;
    });
  };

  const buat = useMutation({
    mutationFn: () =>
      checkout({
        nama_penerima: nama.trim(),
        phone_penerima: phone.trim(),
        alamat_kirim: alamat.trim(),
        destination_id: tujuan!.id,
        metode_bayar: metode,
        // Objek yang dikunci `umkm_id`, bukan array — dan **kuncinya itulah
        // yang menentukan toko mana yang dipesan**. Dirakit dari pratinjau,
        // bukan dari daftar toko yang kebetulan sedang tampil, supaya toko yang
        // dikirim persis sama dengan toko yang ongkirnya sudah dihitung.
        pengiriman: Object.fromEntries(
          pratinjau.map((t) => [
            String(t.umkm_id),
            {
              kurir: kurir[t.umkm_id]!.kurir,
              layanan: kurir[t.umkm_id]!.layanan,
            },
          ]),
        ),
      }),
    onSuccess: async (pesanan) => {
      // Keranjang dikosongkan **sebagian** — toko yang tidak dipesan tetap
      // tinggal di sana, jadi isinya harus dimuat ulang, bukan diasumsikan nol.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["keranjang"] }),
        qc.invalidateQueries({ queryKey: ["pesanan"] }),
        qc.invalidateQueries({ queryKey: ["dompet"] }),
      ]);

      // Pembayaran saldo sudah selesai di peladen: statusnya `dibayar` dan tidak
      // ada snap token sama sekali.
      if (metode === "saldo") {
        const total = pesanan.reduce((n, p) => n + p.total, 0);
        notify(
          pesanan.length > 1
            ? `${pesanan.length} pesanan dibuat`
            : `Pesanan dibuat · ${pesanan[0]?.kode ?? ""}`,
          `Total ${formatRupiah(total)} sudah dibayar dari saldo Anda.`,
        );
        router.replace(
          pesanan.length === 1 && pesanan[0]
            ? (`/pesanan/${pesanan[0].kode}` as Href)
            : ("/pesanan" as Href),
        );
        return;
      }

      // Midtrans: satu pesanan satu tagihan, jadi belanja lintas toko berarti
      // beberapa pembayaran terpisah. Yang dibuka sekarang adalah yang pertama;
      // sisanya dilunasi dari detail pesanan masing-masing, yang menerbitkan
      // snap token baru sendiri bila yang lama sudah kedaluwarsa.
      const perluBayar = pesanan.filter((p) => p.status === "menunggu_bayar");
      const pertama = perluBayar.find((p) => p.snap_token) ?? perluBayar[0];

      if (perluBayar.length > 1) {
        notify(
          `${perluBayar.length} pesanan dibuat`,
          "Setiap toko ditagih terpisah. Pembayaran pesanan pertama dibuka sekarang; sisanya bisa dilunasi dari daftar pesanan.",
        );
      }

      if (pertama?.snap_token) {
        router.replace({
          pathname: "/bayar",
          params: {
            snap_token: pertama.snap_token,
            kode: pertama.kode,
            title: "Pembayaran",
          },
        });
        return;
      }

      // Peladen memilih tidak menerbitkan token di respons ini. Detail pesanan
      // punya tombol bayar yang memintanya lewat `bayar-ulang`.
      router.replace(
        pertama ? (`/pesanan/${pertama.kode}` as Href) : ("/pesanan" as Href),
      );
    },
    onError: (e: unknown) => {
      galat.tangani(e, "Pesanan tidak dapat dibuat. Coba lagi.", {
        // Peladen melaporkan alamat tujuan pada `destination_id`, yang di layar
        // ini adalah kotak pencarian alamat.
        destination_id: "tujuan",
      });
      // "Toko tidak ada di keranjang" dan "produk sudah dikeluarkan" keduanya
      // berarti keranjang di peladen sudah bergerak. Memuat ulang di sini
      // membuat layar menyusul keadaan sebenarnya, bukan menahan pengguna pada
      // rincian yang sudah basi.
      if (e instanceof ApiError && e.status === 422) {
        void qc.invalidateQueries({ queryKey: ["keranjang"] });
        void pratinjauQ.refetch();
      }
    },
  });

  const submit = () => {
    galat.bersihkan();
    if (terpilih.length === 0)
      return galat.tandai(
        "toko",
        "Pilih setidaknya satu toko untuk dipesan.",
      );
    if (!nama.trim())
      return galat.tandai("nama_penerima", "Nama penerima wajib diisi.");
    if (!phone.trim())
      return galat.tandai("phone_penerima", "Nomor telepon penerima wajib diisi.");
    if (alamat.trim().length < 10)
      return galat.tandai(
        "alamat_kirim",
        "Tulis alamat lengkap, minimal 10 karakter.",
      );
    if (!tujuan)
      return galat.tandai("tujuan", "Pilih alamat tujuan pengiriman.");
    if (pratinjau.length === 0)
      return galat.tandai(
        "pengiriman",
        "Rincian pengiriman belum termuat. Coba pilih ulang alamat tujuan.",
      );
    if (!semuaKurirDipilih)
      return galat.tandai(
        "pengiriman",
        "Pilih layanan pengiriman untuk setiap toko.",
      );
    // Peladen memeriksa ini juga dan pesannya lebih tepat karena menyebut angka
    // sebenarnya. Penjagaan di sini hanya mencegah satu perjalanan bolak-balik
    // untuk kekurangan yang sudah kelihatan di layar.
    if (saldoKurang)
      return galat.tandai(
        "metode_bayar",
        `Saldo Anda ${formatRupiah(saldo)}, sedangkan perkiraan total ${formatRupiah(perkiraanTotal)}. Pilih transfer atau isi saldo lebih dulu.`,
      );
    buat.mutate();
  };

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
      <Text style={styles.appbarTitle}>Checkout</Text>
    </View>
  );

  if (k.query.isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <LoadingState pesan="Memuat keranjang…" />
      </SafeAreaView>
    );
  }

  // Keranjang gagal dimuat bukan berarti keranjang kosong. Tanpa cabang ini,
  // gangguan jaringan tampil sebagai "Keranjang kosong" dan pengguna mengira
  // belanjaannya hilang.
  if (k.query.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <ErrorState error={k.query.error} onCobaLagi={() => k.query.refetch()} />
      </SafeAreaView>
    );
  }

  if (k.toko.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        {appbar}
        <EmptyState
          icon="shopping-cart"
          judul="Keranjang kosong"
          pesan="Tambahkan produk lebih dulu sebelum melanjutkan ke pembayaran."
          aksiLabel="Lihat Produk"
          onAksi={() => router.replace("/pasar" as Href)}
        />
      </SafeAreaView>
    );
  }

  const galatTujuan = tujuanQ.error;
  const tujuanTidakTersedia =
    galatTujuan instanceof ApiError && galatTujuan.status === 503;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {appbar}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: pad }}
          keyboardShouldPersistTaps="handled"
        >
          <PesanGalat pesan={galat.umum} />

          <Langkah
            items={[
              { label: "Rincian", selesai: terpilih.length > 0 },
              { label: "Alamat", selesai: penerimaLengkap },
              { label: "Pengiriman", selesai: semuaKurirDipilih },
              { label: "Bayar", selesai: false },
            ]}
          />

          {/*
            Rincian belanja tampil paling atas dan **tanpa syarat**. Ia tidak
            bergantung pada alamat tujuan; yang bergantung hanyalah ongkirnya.
          */}
          <View style={styles.kartu}>
            <View style={styles.kartuKepala}>
              <Text style={[styles.kartuJudul, { marginBottom: 0 }]}>
                Rincian Pesanan
              </Text>
              <Pressable
                onPress={() => router.push("/keranjang" as Href)}
                hitSlop={8}
                style={styles.tautanBtn}
                accessibilityRole="button"
                accessibilityLabel="Ubah isi keranjang"
              >
                <Text style={styles.tautan}>Ubah</Text>
              </Pressable>
            </View>

            {!!galat.field.toko && (
              <Text
                style={styles.galatKecil}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {galat.field.toko}
              </Text>
            )}

            {k.toko.map((t) => {
              const id = t.umkm?.id;
              const dipilih = id != null && terpilih.includes(id);
              return (
                <RingkasToko
                  key={id ?? t.subtotal}
                  t={t}
                  dipilih={dipilih}
                  // Dengan satu toko tidak ada yang bisa dipilih; centang yang
                  // tidak bisa dilepas hanya menambah kebisingan di layar.
                  onAlih={
                    k.toko.length > 1 && id != null
                      ? () => alihToko(id)
                      : undefined
                  }
                />
              );
            })}

            <View style={styles.pemisah} />
            <BarisNilai
              label={`Subtotal ${jumlahBarang} barang`}
              nilai={formatRupiah(subtotal)}
            />

            {k.toko.length > 1 && (
              <Text style={styles.bantu}>
                {terpilih.length === 0
                  ? "Belum ada toko yang dipilih. Centang minimal satu toko untuk melanjutkan."
                  : terpilih.length < k.toko.length
                    ? `${terpilih.length} dari ${k.toko.length} toko dipesan sekarang. Toko yang tidak dicentang tetap tersimpan di keranjang.`
                    : `Belanja dari ${k.toko.length} toko akan dipecah menjadi ${k.toko.length} pesanan, masing-masing dengan ongkos kirim dan pembayarannya sendiri.`}
              </Text>
            )}
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Penerima</Text>
            <Bidang label="Nama Penerima" required error={galat.field.nama_penerima}>
              <TextInput
                style={[
                  styles.input,
                  !!galat.field.nama_penerima && styles.inputGalat,
                ]}
                value={nama}
                onChangeText={setNama}
                placeholder="Nama lengkap penerima"
                placeholderTextColor="#9AA5B1"
                accessibilityLabel="Nama penerima"
              />
            </Bidang>
            <Bidang
              label="Nomor Telepon"
              required
              error={galat.field.phone_penerima}
              hint="Diawali 0, contoh 081234567890."
            >
              <TextInput
                style={[
                  styles.input,
                  !!galat.field.phone_penerima && styles.inputGalat,
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor="#9AA5B1"
                keyboardType="phone-pad"
                accessibilityLabel="Nomor telepon penerima"
              />
            </Bidang>
            <Bidang
              label="Alamat Lengkap"
              required
              error={galat.field.alamat_kirim}
            >
              <TextInput
                style={[
                  styles.input,
                  styles.inputPanjang,
                  !!galat.field.alamat_kirim && styles.inputGalat,
                ]}
                value={alamat}
                onChangeText={setAlamat}
                placeholder="Jalan, nomor, RT/RW, patokan"
                placeholderTextColor="#9AA5B1"
                multiline
                accessibilityLabel="Alamat lengkap pengiriman"
              />
            </Bidang>
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Tujuan Pengiriman</Text>
            {tujuan ? (
              <View style={styles.tujuanTerpilih}>
                <Feather name="map-pin" size={16} color={colors.brand} />
                <Text style={styles.tujuanTeks}>{tujuan.label}</Text>
                <Pressable
                  onPress={() => {
                    setTujuan(null);
                    setKurir({});
                    setCariTujuan("");
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Ganti alamat tujuan"
                >
                  <Feather name="x" size={16} color={colors.subtext} />
                </Pressable>
              </View>
            ) : (
              <Bidang
                error={galat.field.tujuan}
                hint="Ketik nama kecamatan atau kelurahan tujuan, lalu pilih dari daftar."
              >
                <TextInput
                  style={[
                    styles.input,
                    !!galat.field.tujuan && styles.inputGalat,
                  ]}
                  value={cariTujuan}
                  onChangeText={setCariTujuan}
                  placeholder="Cari kecamatan atau kelurahan…"
                  placeholderTextColor="#9AA5B1"
                  accessibilityLabel="Cari alamat tujuan pengiriman"
                />

                {cariTertunda.trim().length > 0 &&
                  cariTertunda.trim().length < MINIMAL_CARI && (
                    <Text style={styles.bantu}>
                      Ketik minimal {MINIMAL_CARI} huruf.
                    </Text>
                  )}

                {tujuanQ.isFetching && (
                  <ActivityIndicator
                    color={colors.brand}
                    style={{ marginTop: 10 }}
                  />
                )}

                {tujuanQ.isError && (
                  <Pressable
                    onPress={() => tujuanQ.refetch()}
                    style={styles.opsiBaris}
                    accessibilityRole="button"
                    accessibilityLabel="Coba cari lagi"
                  >
                    <Feather
                      name="alert-circle"
                      size={15}
                      color={colors.danger}
                    />
                    <Text style={[styles.opsiTeks, { color: colors.danger }]}>
                      {tujuanTidakTersedia
                        ? "Layanan pencarian alamat sedang tidak tersedia. Ketuk untuk coba lagi."
                        : "Pencarian gagal. Ketuk untuk coba lagi."}
                    </Text>
                  </Pressable>
                )}

                {tujuanQ.isSuccess &&
                  !tujuanQ.isFetching &&
                  (tujuanQ.data ?? []).length === 0 && (
                    <Text style={styles.bantu}>
                      Tidak ada alamat yang cocok. Coba nama kecamatan atau
                      kabupaten alih-alih nama jalan.
                    </Text>
                  )}

                {(tujuanQ.data ?? []).map((t) => (
                  <Pressable
                    key={t.id}
                    style={styles.opsiBaris}
                    onPress={() => {
                      setTujuan(t);
                      setKurir({});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t.label}
                  >
                    <Feather name="map-pin" size={15} color={colors.subtext} />
                    <Text style={styles.opsiTeks}>{t.label}</Text>
                  </Pressable>
                ))}
              </Bidang>
            )}
          </View>

          {/*
            Kartunya selalu ada supaya pengguna tahu langkah ini menunggunya —
            yang berubah hanyalah isinya, dari ajakan mengisi alamat menjadi
            daftar kurir.
          */}
          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>
              Pengiriman
              {tujuan && pratinjau.length > 1
                ? ` (${pratinjau.length} toko)`
                : ""}
            </Text>

            {terpilih.length === 0 ? (
              <Text style={styles.bantu}>
                Centang minimal satu toko pada rincian pesanan untuk melihat
                pilihan pengirimannya.
              </Text>
            ) : !tujuan ? (
              <Text style={styles.bantu}>
                Pilih alamat tujuan lebih dulu. Pilihan kurir dan ongkos kirim
                untuk {terpilih.length > 1 ? "setiap toko" : "toko ini"} muncul
                setelah alamat dipilih.
              </Text>
            ) : pratinjauQ.isLoading ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginVertical: 12 }}
              />
            ) : pratinjauQ.isError ? (
              <Pressable
                onPress={() => pratinjauQ.refetch()}
                style={styles.opsiBaris}
                accessibilityRole="button"
                accessibilityLabel="Gagal memuat pilihan pengiriman. Ketuk untuk coba lagi"
              >
                <Feather name="alert-circle" size={15} color={colors.danger} />
                <Text style={[styles.opsiTeks, { color: colors.danger }]}>
                  {pratinjauQ.error instanceof ApiError
                    ? pratinjauQ.error.pesanUntukPengguna
                    : "Gagal memuat pilihan pengiriman."}{" "}
                  Ketuk untuk coba lagi.
                </Text>
              </Pressable>
            ) : (
              <>
                {!!galat.field.pengiriman && (
                  <Text
                    style={styles.galatKecil}
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                  >
                    {galat.field.pengiriman}
                  </Text>
                )}

                {pratinjau.length === 0 && (
                  <Text style={styles.bantu}>
                    Toko yang dipilih sudah tidak ada di keranjang. Muat ulang
                    keranjang lalu pilih ulang.
                  </Text>
                )}

                {pratinjau.map((t) => (
                  <View key={t.umkm_id} style={styles.blokToko}>
                    <View style={styles.tokoKepala}>
                      <Feather
                        name="shopping-bag"
                        size={14}
                        color={colors.brand}
                      />
                      <Text style={styles.tokoNama} numberOfLines={1}>
                        {t.umkm_nama}
                      </Text>
                      <Text style={styles.tokoSubtotal}>
                        {formatRupiah(t.subtotal)}
                      </Text>
                    </View>
                    {/*
                      Ongkir dihitung dari asal toko itu sendiri, bukan dari satu
                      titik milik platform. Tanpa baris ini, dua toko dengan berat
                      sama tapi tarif berbeda terbaca seperti salah hitung.
                    */}
                    <Text style={styles.tokoBerat}>
                      {t.berat_gram} gram
                      {t.asal?.alamat ? ` · Dikirim dari ${t.asal.alamat}` : ""}
                    </Text>

                    {t.pilihan_ongkir.length === 0 ? (
                      <Text style={styles.bantu}>
                        Tidak ada kurir yang melayani tujuan ini untuk toko
                        tersebut. Coba pilih alamat tujuan yang lain.
                      </Text>
                    ) : (
                      t.pilihan_ongkir.map((o) => {
                        const dipilih =
                          kurir[t.umkm_id]?.kurir === o.kurir &&
                          kurir[t.umkm_id]?.layanan === o.layanan;
                        return (
                          <Pressable
                            key={`${o.kurir}-${o.layanan}`}
                            style={[styles.kurir, dipilih && styles.kurirAktif]}
                            onPress={() =>
                              setKurir((s) => ({ ...s, [t.umkm_id]: o }))
                            }
                            accessibilityRole="radio"
                            accessibilityLabel={`${o.kurir.toUpperCase()} ${o.layanan}, ${formatRupiah(o.biaya)}, estimasi ${o.estimasi} hari`}
                            accessibilityState={{ selected: dipilih }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.kurirNama}>
                                {o.kurir.toUpperCase()} · {o.layanan}
                              </Text>
                              <Text style={styles.kurirSub}>
                                {o.deskripsi}
                                {o.estimasi && o.estimasi !== "-"
                                  ? ` · ${o.estimasi} hari`
                                  : ""}
                              </Text>
                            </View>
                            <Text style={styles.kurirBiaya}>
                              {formatRupiah(o.biaya)}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Metode Pembayaran</Text>
            {(["midtrans", "saldo"] as MetodeBayar[]).map((m) => {
              const aktif = metode === m;
              const label =
                m === "saldo"
                  ? `Saldo Resikita (${formatRupiah(saldo)})`
                  : "Transfer / e-wallet";
              return (
                <Pressable
                  key={m}
                  style={[styles.metode, aktif && styles.metodeAktif]}
                  onPress={() => setMetode(m)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: aktif }}
                >
                  <Feather
                    name={m === "saldo" ? "credit-card" : "globe"}
                    size={17}
                    color={aktif ? colors.brand : colors.subtext}
                  />
                  <Text
                    style={[styles.metodeTeks, aktif && styles.metodeTeksAktif]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            {!!galat.field.metode_bayar ? (
              <Text
                style={styles.galatKecil}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {galat.field.metode_bayar}
              </Text>
            ) : saldoKurang ? (
              <Text style={styles.galatKecil}>
                Saldo Anda {formatRupiah(saldo)} — belum mencukupi untuk
                perkiraan total ini.
              </Text>
            ) : null}

            {metode === "saldo" && !saldoKurang && (
              <Text style={styles.bantu}>
                Saldo dipotong seketika saat pesanan dibuat, tanpa langkah
                pembayaran lain.
              </Text>
            )}
            {metode === "midtrans" && (
              <Text style={styles.bantu}>
                Halaman pembayaran Midtrans terbuka setelah pesanan dibuat.
                Status pesanan berubah sendiri begitu pembayaran terkonfirmasi.
              </Text>
            )}
          </View>

          <View style={styles.kartu}>
            <Text style={styles.kartuJudul}>Perkiraan Biaya</Text>
            <BarisNilai label="Subtotal" nilai={formatRupiah(subtotal)} />
            <BarisNilai
              label={
                tujuan && pratinjau.length > 1
                  ? `Ongkos kirim (${pratinjau.length} toko)`
                  : "Ongkos kirim"
              }
              nilai={
                semuaKurirDipilih
                  ? formatRupiah(totalOngkir)
                  : tujuan
                    ? "Belum lengkap"
                    : "Menunggu alamat"
              }
            />
            <View style={styles.pemisah} />
            <BarisNilai
              label="Perkiraan total"
              nilai={formatRupiah(perkiraanTotal)}
              tebal
            />
            {/*
              Kata "perkiraan" di sini bukan basa-basi. Angka yang mengikat
              datang dari respons `POST /pesanan`; kalau keduanya berselisih,
              yang benar adalah yang dari peladen.
            */}
            <Text style={styles.bantu}>
              Total akhir ditetapkan saat pesanan dibuat dan bisa berbeda dari
              perkiraan ini.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar
        padV={12}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>
            Perkiraan total
            {terpilih.length > 1 ? ` · ${terpilih.length} pesanan` : ""}
          </Text>
          <Text style={styles.barNilai}>{formatRupiah(perkiraanTotal)}</Text>
        </View>
        <Pressable
          style={[styles.buat, buat.isPending && { opacity: 0.7 }]}
          onPress={submit}
          disabled={buat.isPending}
          accessibilityRole="button"
          accessibilityLabel={
            metode === "saldo"
              ? `Buat pesanan dan bayar ${formatRupiah(perkiraanTotal)} dari saldo`
              : "Buat pesanan dan lanjut ke pembayaran"
          }
          accessibilityState={{ busy: buat.isPending }}
        >
          {buat.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buatTeks}>
              {metode === "saldo" ? "Bayar dengan Saldo" : "Buat Pesanan"}
            </Text>
          )}
        </Pressable>
      </BottomBar>
    </SafeAreaView>
  );
}

/**
 * Penanda langkah checkout.
 *
 * Murni penanda posisi, bukan navigasi — urutannya ditentukan kelengkapan isian,
 * dan melompati satu langkah tidak mungkin karena langkah berikutnya memang
 * bergantung pada data langkah sebelumnya.
 */
function Langkah({ items }: { items: { label: string; selesai: boolean }[] }) {
  const sedang = items.findIndex((i) => !i.selesai);
  const aktif = sedang === -1 ? items.length - 1 : sedang;

  return (
    <View
      style={styles.langkah}
      accessible
      accessibilityLabel={`Langkah ${aktif + 1} dari ${items.length}: ${items[aktif]?.label ?? ""}`}
    >
      {items.map((it, i) => (
        <View key={it.label} style={styles.langkahItem}>
          {/*
            Garis penghubung digambar setengah-setengah di dalam tiap langkah —
            persen negatif untuk `left` tidak diperlakukan sama di web dan
            native, jadi tidak ada satu garis panjang yang melintasi keduanya.
          */}
          {i > 0 && (
            <View
              style={[
                styles.langkahGaris,
                styles.langkahGarisKiri,
                i <= aktif && styles.langkahGarisAktif,
              ]}
            />
          )}
          {i < items.length - 1 && (
            <View
              style={[
                styles.langkahGaris,
                styles.langkahGarisKanan,
                i < aktif && styles.langkahGarisAktif,
              ]}
            />
          )}
          <View
            style={[
              styles.langkahBulat,
              it.selesai && styles.langkahBulatSelesai,
              i === aktif && styles.langkahBulatAktif,
            ]}
          >
            {it.selesai ? (
              <Feather name="check" size={12} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.langkahNomor,
                  i === aktif && { color: colors.white },
                ]}
              >
                {i + 1}
              </Text>
            )}
          </View>
          <Text
            style={[styles.langkahLabel, i === aktif && styles.langkahLabelAktif]}
            numberOfLines={1}
          >
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Isi keranjang satu toko, tampil apa adanya dari peladen.
 *
 * `onAlih` kosong berarti tokonya tidak bisa dilepas — dipakai ketika keranjang
 * hanya berisi satu toko.
 */
function RingkasToko({
  t,
  dipilih,
  onAlih,
}: {
  t: KelompokKeranjang;
  dipilih: boolean;
  onAlih?: () => void;
}) {
  const item = t.item ?? [];
  const nama = t.umkm?.nama ?? "Toko";

  const kepala = (
    <View style={styles.tokoKepala}>
      {onAlih ? (
        <View style={[styles.centang, dipilih && styles.centangAktif]}>
          {dipilih && <Feather name="check" size={12} color={colors.white} />}
        </View>
      ) : (
        <Feather name="shopping-bag" size={14} color={colors.brand} />
      )}
      <Text style={styles.tokoNama} numberOfLines={1}>
        {nama}
      </Text>
      <Text style={styles.tokoSubtotal}>{formatRupiah(t.subtotal)}</Text>
    </View>
  );

  return (
    <View style={[styles.blokRingkas, !dipilih && styles.blokRedup]}>
      {onAlih ? (
        <Pressable
          onPress={onAlih}
          style={styles.tokoKepalaBtn}
          accessibilityRole="checkbox"
          accessibilityLabel={`Pesan dari ${nama}, subtotal ${formatRupiah(t.subtotal)}`}
          accessibilityState={{ checked: dipilih }}
        >
          {kepala}
        </Pressable>
      ) : (
        kepala
      )}

      {item.map((it) => (
        <View key={it.id} style={styles.itemBaris}>
          <View style={styles.itemGambar}>
            {it.produk?.foto_utama_url ? (
              <Image
                source={{ uri: it.produk.foto_utama_url }}
                style={styles.itemGambarIsi}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Feather name="image" size={18} color="#CBD5E1" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemNama} numberOfLines={2}>
              {it.produk?.nama ?? "Produk"}
            </Text>
            <Text style={styles.itemMeta}>
              {it.qty} × {formatRupiah(it.produk?.harga ?? 0)}
            </Text>
          </View>
          <Text style={styles.itemSubtotal}>{formatRupiah(it.subtotal)}</Text>
        </View>
      ))}
    </View>
  );
}

function BarisNilai({
  label,
  nilai,
  tebal,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
}) {
  return (
    <View style={styles.barisNilai}>
      <Text
        style={[
          styles.barisLabel,
          tebal && { color: colors.text, fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
      <Text style={[styles.barisAngka, tebal && styles.barisTebal]}>
        {nilai}
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
  kartu: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 14,
  },
  kartuJudul: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  kartuKepala: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tautanBtn: { minHeight: 44, justifyContent: "center", paddingLeft: 12 },
  tautan: { fontSize: 13, fontWeight: "700", color: colors.brand },
  langkah: { flexDirection: "row", marginBottom: 14 },
  langkahItem: { flex: 1, alignItems: "center" },
  langkahGaris: {
    position: "absolute",
    top: 11,
    height: 2,
    backgroundColor: "#DCE5E1",
  },
  langkahGarisKiri: { left: 0, right: "50%" },
  langkahGarisKanan: { left: "50%", right: 0 },
  langkahGarisAktif: { backgroundColor: colors.brand },
  langkahBulat: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DCE5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  langkahBulatAktif: { backgroundColor: colors.brand },
  langkahBulatSelesai: { backgroundColor: colors.brand },
  langkahNomor: { fontSize: 11, fontWeight: "700", color: colors.subtext },
  langkahLabel: { fontSize: 11, color: colors.subtext, marginTop: 6 },
  langkahLabelAktif: { color: colors.brand, fontWeight: "700" },
  blokRingkas: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 4,
  },
  /** Toko yang tidak dicentang tetap terbaca, hanya jelas tidak ikut dipesan. */
  blokRedup: { opacity: 0.45 },
  tokoKepalaBtn: { minHeight: 44, justifyContent: "center" },
  centang: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  centangAktif: { backgroundColor: colors.brand, borderColor: colors.brand },
  itemBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  itemGambar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemGambarIsi: { width: "100%", height: "100%" },
  itemNama: { fontSize: 13, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  itemSubtotal: { fontSize: 13, fontWeight: "700", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputGalat: { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
  inputPanjang: { minHeight: 84, textAlignVertical: "top" },
  bantu: { fontSize: 12, color: colors.subtext, marginTop: 8, lineHeight: 17 },
  galatKecil: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 10,
    lineHeight: 17,
  },
  tujuanTerpilih: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EAF7F1",
    borderRadius: radius.md,
    padding: 12,
    minHeight: 44,
  },
  tujuanTeks: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "600" },
  opsiBaris: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  opsiTeks: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  blokToko: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 4,
  },
  tokoKepala: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokoNama: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  tokoSubtotal: { fontSize: 13, fontWeight: "700", color: colors.text },
  tokoBerat: { fontSize: 11, color: colors.subtext, marginTop: 2, marginBottom: 10 },
  kurir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    minHeight: 44,
  },
  kurirAktif: { borderColor: colors.brand, backgroundColor: "#F3FBF7" },
  kurirNama: { fontSize: 13, fontWeight: "700", color: colors.text },
  kurirSub: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  kurirBiaya: { fontSize: 14, fontWeight: "700", color: colors.brand },
  metode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  metodeAktif: { borderColor: colors.brand, backgroundColor: "#F3FBF7" },
  metodeTeks: { flex: 1, fontSize: 13, color: colors.text },
  metodeTeksAktif: { fontWeight: "700", color: colors.brand },
  barisNilai: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  barisLabel: { fontSize: 14, color: colors.subtext },
  barisAngka: { fontSize: 14, color: colors.text, fontWeight: "600" },
  barisTebal: { fontSize: 17, fontWeight: "800", color: colors.brand },
  pemisah: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  barLabel: { fontSize: 12, color: colors.subtext },
  barNilai: { fontSize: 18, fontWeight: "800", color: colors.brand },
  buat: {
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  buatTeks: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
