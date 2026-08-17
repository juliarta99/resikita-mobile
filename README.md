# Resikita Mobile

Aplikasi mobile **Resikita** untuk masyarakat dan petugas operasional pengelolaan sampah. Dibangun dengan Expo dan React Native, berjalan di **Android, iOS, dan web** dari satu basis kode.

Aplikasi ini mengonsumsi REST API dari repositori backend **`resikita`** (Laravel). Seluruh logika bisnis, harga, saldo, ongkir, routing laporan, aturan stok, milik backend; aplikasi ini menampilkan apa yang dikirim API tanpa menghitung ulang.

Disusun untuk **GEMASTIK 2026**, Divisi Pengembangan Perangkat Lunak.

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Instalasi](#2-instalasi)
3. [Konfigurasi](#3-konfigurasi)
4. [Menjalankan Aplikasi](#4-menjalankan-aplikasi)
5. [Membangun Berkas Rilis](#5-membangun-berkas-rilis)
6. [Perintah Lain](#6-perintah-lain)
7. [Pemecahan Masalah](#7-pemecahan-masalah)
8. [Fitur Aplikasi](#8-fitur-aplikasi)
9. [Arsitektur](#9-arsitektur)
10. [Struktur Direktori](#10-struktur-direktori)
11. [Aturan Pengembangan](#11-aturan-pengembangan)
12. [Lisensi](#12-lisensi)

---

## 1. Prasyarat

| Kebutuhan              | Versi                                                      | Keterangan                                                                                    |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Node.js**            | `^20.19.4` atau `^22.13.0` atau `^24.3.0` atau `>= 25.0.0` | Syarat React Native 0.86. Versi Node di luar rentang ini akan gagal saat bundling             |
| **npm**                | 10 atau lebih baru                                         | Ikut terpasang bersama Node                                                                   |
| **Git**                | bebas                                                      |                                                                                               |
| **Backend `resikita`** | berjalan dan dapat dijangkau                               | Aplikasi ini tidak punya data lokal; tanpa API, seluruh layar hanya menampilkan keadaan galat |

Opsional, sesuai target yang ingin dicoba:

| Target          | Yang perlu disiapkan                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| **Web**         | Tidak ada. Cukup peramban, cara tercepat menguji perubahan                         |
| **Android**     | Android Studio beserta emulator, atau perangkat fisik dengan mode pengembang aktif |
| **iOS**         | macOS beserta Xcode. Tidak tersedia di Windows maupun Linux                        |
| **Build rilis** | Akun [Expo](https://expo.dev) dan `eas-cli` (`npm install -g eas-cli`)             |

Verifikasi versi Node sebelum melanjutkan:

```bash
node -v
npm -v
```

---

## 2. Instalasi

```bash
git clone <url-repositori> niti-resik-masyarakat
cd niti-resik-masyarakat
npm install
```

`npm install` memasang seluruh dependensi dan menjalankan langkah pasca-pemasangan milik Expo. Proses ini memakan beberapa menit pada pemasangan pertama.

Gunakan **`npm install`**, bukan `npm ci`, kecuali Anda memang ingin memasang persis isi `package-lock.json` tanpa perubahan apa pun.

---

## 3. Konfigurasi

Salin templat yang sudah tersedia, lalu isi nilainya:

```bash
cp .env.example .env
```

Isi `.env` kira-kira seperti ini:

```dotenv
# Wajib. Alamat basis REST API, harus berakhiran /api/v1
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api/v1

# Opsional. Basis halaman pembayaran Snap Midtrans.
# Hapus baris ini untuk mode produksi. Aktifkan bila backend memakai sandbox.
EXPO_PUBLIC_MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/v2/vtweb/

# Opsional. Kontak yang dikirim sebagai User-Agent ke Nominatim OpenStreetMap.
# Bila kosong, aplikasi memakai id paket Android sebagai cadangan.
EXPO_PUBLIC_KONTAK_APLIKASI=kontak@contoh.id
```

### Rincian variabel

| Variabel                        | Wajib  | Fungsi                                                                                      |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`           | **Ya** | Basis seluruh pemanggilan REST API. Dibaca sekali di `src/lib/api/client.ts`                |
| `EXPO_PUBLIC_MIDTRANS_SNAP_URL` | Tidak  | Basis Snap Midtrans. Bawaan: `https://app.midtrans.com/snap/v2/vtweb/` (produksi)           |
| `EXPO_PUBLIC_KONTAK_APLIKASI`   | Tidak  | Pengenal aplikasi pada `User-Agent` permintaan Nominatim, sesuai kebijakan pemakaian mereka |

### Tiga hal yang sering menjadi masalah

**Jangan memakai `localhost` bila menguji di perangkat fisik.** Bagi ponsel, `localhost` berarti ponsel itu sendiri, bukan komputer Anda. Pakai alamat IP lokal komputer pengembang, dan pastikan ponsel berada di jaringan Wi-Fi yang sama.

```bash
# Windows
ipconfig

# macOS / Linux
ifconfig | grep "inet "
```

**Token sandbox Midtrans tidak berlaku di domain produksi.** Bila backend berjalan dalam mode sandbox tetapi `EXPO_PUBLIC_MIDTRANS_SNAP_URL` menunjuk `app.midtrans.com`, halaman pembayaran akan menampilkan "transaksi tidak ditemukan", terbaca seperti pesanannya gagal dibuat, padahal pesanannya baik-baik saja.

**Variabel `EXPO_PUBLIC_*` ditanam saat bundling, bukan dibaca saat aplikasi berjalan.** Setelah mengubah `.env`, server pengembangan harus dijalankan ulang dengan tembolok dibersihkan:

```bash
npx expo start -c
```

Tanpa `-c`, nilai lama tetap terpakai dan perubahan Anda seolah-olah tidak berpengaruh.

---

## 4. Menjalankan Aplikasi

### Cara tercepat: web

```bash
npm run web
```

Aplikasi terbuka di peramban. Ini jalur pengujian harian yang dipakai proyek ini, paling cepat memuat ulang dan paling mudah membaca galat konsol.

### Android

```bash
npm run android
```

Menjalankan emulator yang aktif, atau perangkat fisik yang terhubung lewat USB dengan USB debugging menyala.

### iOS

```bash
npm run ios
```

Hanya berjalan di macOS dengan Xcode terpasang.

### Server pengembangan tanpa target tertentu

```bash
npm start
```

Menampilkan menu untuk memilih target, beserta kode QR bagi perangkat fisik.

### Catatan penting soal Expo Go

Aplikasi ini memakai modul native pihak ketiga yang **tidak ikut dipaketkan di dalam Expo Go**, terutama `expo-speech-recognition` untuk input suara. Konsekuensinya:

| Cara menjalankan      | Yang berjalan                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**               | Seluruh fitur, termasuk suara, memakai Web Speech API bawaan peramban                                                                  |
| **Development build** | Seluruh fitur di perangkat. Inilah cara yang disarankan untuk pengujian menyeluruh                                                     |
| **Expo Go**           | Sebagian besar layar berjalan, tetapi **input suara tidak tersedia** dan notifikasi dorong jarak jauh tidak lagi didukung sejak SDK 53 |

Membuat development build:

```bash
npx eas build --profile development --platform android
```

Pasang berkas hasilnya di perangkat, lalu jalankan `npm start` seperti biasa, aplikasi akan menyambung ke server pengembangan Anda.

---

## 5. Membangun Berkas Rilis

Profil build sudah didefinisikan di `eas.json`.

```bash
# Masuk sekali saja
npx eas login

# APK untuk pengujian internal
npx eas build --profile preview --platform android

# APK rilis
npx eas build --profile production --platform android
```

Kedua profil `preview` dan `production` sudah menetapkan `EXPO_PUBLIC_API_URL` sendiri di `eas.json`, sehingga `.env` lokal Anda **tidak** ikut terbawa ke hasil build.

### Membangun berkas web statis

```bash
npx expo export -p web
```

Hasilnya berada di direktori `dist/` dan dapat dilayani sebagai situs statis biasa.

### Bila build EAS gagal karena lockfile

Pastikan `package-lock.json` sudah ter-commit. Bila terpaksa, `EAS_NO_VCS=1` dapat dipakai sebagai jalan terakhir.

---

## 6. Perintah Lain

```bash
# Analisis statis kualitas kode
npm run lint

# Pemeriksaan tipe menyeluruh tanpa menghasilkan berkas
npx tsc --noEmit

# Membersihkan tembolok bundler saat perilaku terasa aneh
npx expo start -c
```

Seluruh perintah yang tersedia:

| Perintah                | Fungsi                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm start`             | Server pengembangan dengan menu pemilihan target                                                                         |
| `npm run web`           | Menjalankan di peramban                                                                                                  |
| `npm run android`       | Menjalankan di emulator atau perangkat Android                                                                           |
| `npm run ios`           | Menjalankan di simulator atau perangkat iOS                                                                              |
| `npm run lint`          | ESLint                                                                                                                   |
| `npm run reset-project` | Peninggalan templat `create-expo-app`. **Jangan dijalankan**, perintah ini memindahkan kode aplikasi ke direktori contoh |

---

## 7. Pemecahan Masalah

| Gejala                                                  | Sebab dan penanganan                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seluruh layar menampilkan galat jaringan                | `EXPO_PUBLIC_API_URL` salah, backend mati, atau perangkat berada di jaringan berbeda. Buka URL itu di peramban perangkat untuk memastikan terjangkau       |
| Perubahan `.env` tidak berpengaruh                      | Variabel ditanam saat bundling. Jalankan ulang dengan `npx expo start -c`                                                                                  |
| Halaman pembayaran menyatakan transaksi tidak ditemukan | Ketidakcocokan mode Midtrans. Lihat [Bagian 3](#3-konfigurasi)                                                                                             |
| Tombol mikrofon tidak muncul                            | Pengenalan suara tidak tersedia di lingkungan itu. Aplikasi sengaja menyembunyikan tombolnya alih-alih menampilkan galat. Pakai web atau development build |
| Sesi keluar sendiri terus-menerus                       | Token ditolak backend. Interceptor pada `src/lib/api/client.ts` membuang token dan mengalihkan ke layar masuk setiap kali menerima `401`                   |
| Peta kosong atau abu-abu                                | Peta memuat Leaflet dari CDN unpkg dan ubin dari OpenStreetMap. Keduanya butuh koneksi internet aktif                                                      |
| Galat versi Node saat bundling                          | Periksa `node -v` terhadap rentang pada [Bagian 1](#1-prasyarat)                                                                                           |

---

## 8. Fitur Aplikasi

### Masyarakat

| Fitur                         | Rute                     | Catatan                                                                                     |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| Klasifikasi sampah            | `klasifikasi/`           | Foto dianalisis backend, dikembalikan sebagai lima kategori enum beserta langkah pengolahan |
| Riwayat klasifikasi           | `klasifikasi/riwayat`    |                                                                                             |
| Lapor sampah                  | `lapor/`                 | Foto, titik GPS, deskripsi diketik **atau didiktekan**                                      |
| Konfirmasi laporan ganda      | `lapor/duplikat`         | Menampilkan kandidat serupa, menawarkan penggabungan                                        |
| Riwayat dan status laporan    | `lapor/riwayat`          | Menampilkan penanggung jawab dan alasan routing dari backend                                |
| Dompet dan mutasi saldo       | `dompet/`                | Seluruh nilai uang berupa integer rupiah                                                    |
| QR nasabah                    | `dompet/qr`              | Dibangkitkan dari `kode_qr` berisi ULID                                                     |
| Penarikan saldo               | `dompet/tarik`           |                                                                                             |
| Riwayat setoran               | `setoran/`               |                                                                                             |
| Peta TPS dan bank sampah      | `(tabs)/peta`            | Leaflet di dalam WebView                                                                    |
| Keanggotaan dan iuran TPS     | `tps/`                   |                                                                                             |
| Marketplace produk daur ulang | `produk/`, `pasar`       |                                                                                             |
| Keranjang dan checkout        | `keranjang/`, `checkout` | Dapat memilih sebagian toko; satu pesanan berisi satu UMKM                                  |
| Pembayaran                    | `bayar`                  | Saldo aplikasi atau Snap Midtrans                                                           |
| Pesanan dan ulasan            | `pesanan/`, `ulasan/`    |                                                                                             |
| Artikel edukasi               | `edukasi/`               | Dilengkapi **pemutar suara** dengan pengatur kecepatan                                      |
| Chatbot literasi lingkungan   | `chatbot/`               | Pertanyaan diketik atau diucapkan; jawaban dapat dibacakan                                  |
| Profil dan wilayah            | `profil/`                | Pemilih wilayah bertingkat empat                                                            |

### Petugas Operasional

| Fitur                               | Rute                                   |
| ----------------------------------- | -------------------------------------- |
| Daftar penugasan                    | `petugas/`                             |
| Detail laporan                      | `petugas/[id]`                         |
| Pembaruan progres dengan foto bukti | `petugas/[id]/progres`                 |
| Navigasi ke lokasi                  | Membuka aplikasi peta bawaan perangkat |

### Fitur suara dan aksesibilitas

Pilar inklusif aplikasi ini, dan bukan tempelan. Arsitekturnya sengaja bertingkat:

```
Suara pengguna -> STT -> TEKS (ditampilkan dan dapat disunting) -> API -> TEKS jawaban -> TTS
```

Teks perantara **selalu ditampilkan sebelum dikirim**. Ini keputusan desain, bukan keterbatasan: pengguna dapat mengoreksi salah dengar, dan percakapannya dapat diaudit.

- **Text-to-Speech**, pemutar artikel edukasi dengan putar, jeda, henti, kecepatan 0,75x / 1x / 1,25x, dan penanda paragraf berjalan. Tombol dengar pada setiap balasan chatbot.
- **Speech-to-Text**, input suara pada chatbot dan **formulir laporan**. Yang kedua itu yang membuat klaim inklusif bermakna: bila suara hanya ada di chatbot, ia sekadar hiasan.
- **Selalu ada jalur alternatif mengetik.** Suara tidak pernah menjadi satu-satunya cara.
- Target sentuh minimal 44x44, `accessibilityLabel` pada seluruh elemen interaktif, kontras memenuhi WCAG 2.2 AA, dan ukuran font sistem dihormati.

---

## 9. Arsitektur

### Tumpukan teknologi

| Lapis             | Pilihan                                           |
| ----------------- | ------------------------------------------------- |
| Kerangka kerja    | Expo SDK 57, React Native 0.86, React 19.2        |
| Bahasa            | TypeScript mode `strict`, tanpa `any`             |
| Navigasi          | expo-router, berbasis berkas                      |
| State server      | TanStack Query v5, **seluruhnya**, tanpa kecuali  |
| HTTP              | axios, terpusat di `src/lib/api/client.ts`        |
| Penyimpanan token | expo-secure-store, terenkripsi                    |
| Peta              | Leaflet di dalam WebView, sama di ketiga platform |
| Suara             | expo-speech (TTS), expo-speech-recognition (STT)  |
| Pembayaran        | Snap Midtrans di dalam WebView                    |

### Kontrak API

Backend membungkus seluruh respons dalam amplop yang sama:

```json
{ "success": true, "message": "...", "data": {} }
```

```json
{
  "success": true,
  "data": [],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 68 }
}
```

```json
{ "success": false, "message": "...", "errors": { "field": ["..."] } }
```

Interceptor di `src/lib/api/client.ts` membuka amplop ini **sekali, di satu tempat**. Komponen tidak perlu tahu strukturnya. Autentikasi memakai token Sanctum murni lewat header `Authorization: Bearer <token>`, bukan sesi, bukan cookie.

Bila dokumentasi kontrak dan perilaku nyata peladen berselisih, yang benar adalah perilaku peladen, perbaiki dokumennya, jangan menambal di klien.

### Mengapa Leaflet, bukan react-native-maps

`react-native-maps` tidak berjalan di Expo web tanpa penyesuaian tambahan, sedangkan aplikasi ini mensyaratkan kode yang sama berjalan di tiga platform. Memakai dua pustaka peta berarti dua perilaku, dua gaya penanda, dan dua tempat bug bersembunyi.

Leaflet di dalam WebView memberi satu implementasi untuk semuanya, dan lebih mudah disesuaikan karena tampilannya hanya HTML dan CSS di `src/lib/leafletHtml.ts`. Konsekuensi yang diterima: peta sedikit lebih berat daripada peta native dan tidak memakai gestur peta bawaan sistem.

### Penanganan uang

API mengembalikan seluruh nilai uang sebagai **integer rupiah**. `12500` berarti Rp 12.500.

```ts
formatRupiah(12500)(
  // "Rp 12.500"   benar

  12500 / 100,
).toFixed(2); // salah, jangan pernah
parseFloat(saldo); // salah, jangan pernah
```

Penjumlahan apa pun di sisi klien hanya untuk tampilan sementara. Total yang mengikat selalu berasal dari respons `POST /pesanan`.

---

## 10. Struktur Direktori

Seluruh kode sumber berada di bawah `src/`. Alias `@/*` menunjuk ke `src/*`, sehingga `@/lib/api` berarti `src/lib/api`. Satu-satunya kekecualian adalah `@/assets/*` yang menunjuk ke `assets/` di akar, karena berkas gambar bukan kode sumber.

```
src/
  app/                        expo-router, satu folder satu fitur (60 berkas rute)
    (auth)/                   masuk, daftar, lupa kata sandi, verifikasi OTP
    (tabs)/                   beranda, peta, aksi, pasar, profil
    klasifikasi/              kamera, hasil, riwayat, detail
    lapor/                    formulir, pilih lokasi, duplikat, riwayat, detail
    dompet/                   saldo, mutasi, penarikan, QR
    setoran/                  riwayat setoran bank sampah
    tps/ bank-sampah/         fasilitas, keanggotaan, iuran
    produk/ toko/ umkm/       katalog marketplace
    keranjang.tsx checkout.tsx bayar.tsx
    pesanan/ ulasan/          pesanan dan ulasan produk
    edukasi/                  daftar artikel, detail dengan pemutar suara
    chatbot/                  percakapan dan riwayat
    profil/ pengaturan/       data diri, wilayah, keamanan
    petugas/                  penugasan, detail, pembaruan progres
    notifikasi/ pencapaian.tsx
  components/
    LeafletMap.{web,native}.tsx     peta, satu untuk semua platform
    PlatformWebView.{web,native}.tsx
    RichContent.{web,native}.tsx    perender konten artikel
    VoiceInput.tsx                  tombol mikrofon dan tampilan teks hasil
    SpeechButton.tsx                tombol dengar
    WilayahPicker.tsx               pemilih wilayah bertingkat empat
    KategoriBadge.tsx               lencana lima kategori sampah
    BottomBar.tsx PemutarArtikel.tsx ui.tsx
    states/                         LoadingState, ErrorState, EmptyState
  hooks/
    useKeranjang.ts useWilayah.ts useSpeech.ts
    useVoiceInput.{web,native}.ts useBottomPad.ts
    useGalatForm.ts useDebounce.ts useNotifikasi.ts
  lib/
    api/                      satu berkas per domain, semuanya lewat client.ts
    dialog.ts                 confirmDialog(), notify()
    rupiah.ts                 formatRupiah() untuk nilai integer
    geo.ts                    reverse geocode dengan cadangan Nominatim
    leafletHtml.ts            HTML peta yang disuntikkan ke WebView
    fotoSementara.ts          penyimpan URI foto antar-layar
    storage.ts push.ts reorder.ts markdown.ts
  types/                      tipe respons API, satu berkas per domain
  constants/                  theme.ts, peta.ts
  context/                    AuthContext.tsx
```

Berkas berakhiran `.web.tsx` dan `.native.tsx` dipilih otomatis oleh bundler sesuai platform. Berkas `.d.ts` yang menyertainya menyatukan tipe keduanya agar pemanggil tidak perlu tahu mana yang sedang dipakai.

---

## 11. Aturan Pengembangan

Sembilan aturan berikut mengikat seluruh kode di repositori ini:

1. **Seluruh state server lewat TanStack Query.** Tidak ada `useEffect` + `useState` untuk mengambil data.
2. **Seluruh panggilan API lewat `src/lib/api/`.** Tidak ada `fetch` atau `axios` telanjang di komponen.
3. **Kode harus berjalan di iOS, Android, dan web.**
4. **TypeScript `strict`, tanpa `any`.** Tipe respons API berada di `src/types/`.
5. **Setiap layar wajib punya keadaan memuat, galat, dan kosong.**
6. **Setiap elemen interaktif wajib punya `accessibilityLabel`.**
7. **Jangan menghitung ulang logika bisnis backend.** Tampilkan apa yang dikirim API.
8. **Jangan meminta atau menyimpan NIK** dalam bentuk apa pun.
9. **Jangan menanam nama daerah tertentu** di teks antarmuka, contoh, maupun placeholder. Aplikasi ini berlingkup nasional.

### Jebakan yang sudah pernah menggigit

Hasil debugging nyata di proyek ini. Baca sebelum menulis kode di area terkait.

- **`Alert.alert` dengan tombol tidak berfungsi di web.** Pakai `src/lib/dialog.ts`.
- **URI foto rusak bila dikirim lewat params expo-router.** Karakter `%40` dan `%2F` terkorupsi. Simpan di `src/lib/fotoSementara.ts`.
- **Unggah `FormData` di web membutuhkan Blob**, dan `Content-Type` harus dibiarkan `undefined` agar peramban menyusun boundary-nya sendiri.
- **`Location.reverseGeocodeAsync` mengembalikan larik kosong di web** tanpa Google API key. Cadangan Nominatim di `src/lib/geo.ts` menanganinya.
- **`Pressable` bersarang menggelembung ke kartu induk di web.** Panggil `e?.stopPropagation?.()`.
- **Konten tertutup bottom bar.** Selalu pakai `useBottomPad()` beserta komponen `BottomBar`.

### Sebelum menganggap pekerjaan selesai

- Berjalan di web tanpa galat konsol
- Ada keadaan memuat, galat, dan kosong
- Konten bawah tidak tertutup bottom bar
- Elemen interaktif punya `accessibilityLabel`
- Tidak ada `any` baru
- Nilai uang diperlakukan sebagai integer rupiah
- Fitur suara punya jalur alternatif mengetik
- Sudah dicoba di perangkat fisik, bukan hanya emulator

---

## 12. Lisensi

Kode sumber aplikasi ini adalah karya tim pengembang Resikita dan **belum menetapkan lisensi eksplisit**, `package.json` menyetel `"private": true` tanpa medan `license`.

Berkas `LICENSE` di akar repositori masih merupakan peninggalan templat `create-expo-app` dan memuat hak cipta 650 Industries, bukan hak cipta proyek ini. Berkas itu perlu diganti sebelum publikasi. MIT atau Apache-2.0 adalah pilihan yang paling selaras dengan komponen yang dipakai.

Seluruh komponen pihak ketiga yang dipakai berlisensi permisif, MIT, ISC, BSD, dan Apache-2.0, tanpa satu pun lisensi copyleft kuat yang mengikat. Kewajiban atribusi yang tetap harus dipenuhi saat distribusi:

- Menyertakan teks lisensi beserta pemberitahuan hak cipta untuk komponen MIT, BSD-2-Clause, dan Apache-2.0
- Menyertakan lisensi SIL Open Font License 1.1 untuk font Plus Jakarta Sans
- Mencantumkan atribusi OpenStreetMap pada setiap tampilan peta, sudah diterapkan di `src/lib/leafletHtml.ts`
