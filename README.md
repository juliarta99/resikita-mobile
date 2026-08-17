# Resikita Mobile

Aplikasi mobile **Resikita** untuk masyarakat dan petugas operasional pengelolaan sampah. Dibangun dengan Expo dan React Native, berjalan di **Android, iOS, dan web** dari satu basis kode.

Aplikasi ini mengonsumsi REST API dari repositori backend **`resikita`** (Laravel). Seluruh logika bisnis, harga, saldo, ongkir, routing laporan, aturan stok, milik backend; aplikasi ini menampilkan apa yang dikirim API tanpa menghitung ulang.

Disusun untuk **GEMASTIK 2026**, Divisi Pengembangan Perangkat Lunak.

| Kunci            | Nilai                                                |
| ---------------- | ---------------------------------------------------- |
| Expo SDK         | 57                                                   |
| React Native     | 0.86.2                                               |
| React            | 19.2.3                                               |
| TypeScript       | 6.0.3, mode `strict`                                 |
| Id paket Android | `com.juliarta99.resikita`                            |
| Skema deep link  | `resikita://`                                        |
| Lisensi          | [MIT](LICENSE)                                       |
| Daftar komponen  | [`KOMPONEN-DAN-LISENSI.md`](KOMPONEN-DAN-LISENSI.md) |
| Kontrak API      | [`API-DOCS.md`](API-DOCS.md)                         |

---

## Daftar Isi

1. [Mulai Cepat](#1-mulai-cepat)
2. [Prasyarat](#2-prasyarat)
3. [Klon dan Instalasi](#3-klon-dan-instalasi)
4. [Konfigurasi](#4-konfigurasi)
5. [Menjalankan Aplikasi](#5-menjalankan-aplikasi)
6. [Membangun Berkas Rilis](#6-membangun-berkas-rilis)
7. [Perintah Lain](#7-perintah-lain)
8. [Pemecahan Masalah](#8-pemecahan-masalah)
9. [Fitur Aplikasi](#9-fitur-aplikasi)
10. [Arsitektur](#10-arsitektur)
11. [Struktur Direktori](#11-struktur-direktori)
12. [Aturan Pengembangan](#12-aturan-pengembangan)
13. [Lisensi](#13-lisensi)

---

## 1. Mulai Cepat

Jalur tercepat dari repositori kosong sampai aplikasi terbuka, lewat **web**. Tidak butuh Android Studio, tidak butuh Xcode, tidak butuh perangkat.

```bash
git clone https://github.com/juliarta99/niti-resik-mobile.git resikita_mobile
cd resikita_mobile
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# buka .env, isi EXPO_PUBLIC_API_URL
npm run web
```

Peramban terbuka di `http://localhost:8081`. Bila layar masuk muncul, pemasangannya berhasil.

Bila seluruh layar justru menampilkan galat jaringan, `EXPO_PUBLIC_API_URL` belum benar atau backendnya belum berjalan, lihat [Bagian 4](#4-konfigurasi). Untuk menjalankan di Android atau iOS, lanjut ke [Bagian 5](#5-menjalankan-aplikasi), ada beberapa hal yang perlu dipahami lebih dulu di sana.

---

## 2. Prasyarat

### Wajib, untuk semua target

| Kebutuhan              | Versi                                                      | Keterangan                                                                                    |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Node.js**            | `^20.19.4` atau `^22.13.0` atau `^24.3.0` atau `>= 25.0.0` | Syarat React Native 0.86. Versi Node di luar rentang ini gagal saat bundling                  |
| **npm**                | 10 atau lebih baru                                         | Ikut terpasang bersama Node                                                                   |
| **Git**                | bebas                                                      |                                                                                               |
| **Backend `resikita`** | berjalan dan dapat dijangkau                               | Aplikasi ini tidak punya data lokal; tanpa API, seluruh layar hanya menampilkan keadaan galat |

Periksa versi sebelum melanjutkan:

```bash
node -v
npm -v
```

Bila versi Node Anda di luar rentang, pakai pengelola versi ([nvm](https://github.com/nvm-sh/nvm), [nvm-windows](https://github.com/coreybutler/nvm-windows), atau [fnm](https://github.com/Schniz/fnm)) alih-alih memasang ulang Node sistem:

```bash
nvm install 22
nvm use 22
```

### Tambahan, sesuai target

| Target                        | Yang perlu disiapkan                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**                       | Tidak ada. Cukup peramban                                                                                                                             |
| **Android lewat Expo Go**     | Aplikasi [Expo Go](https://expo.dev/go) di ponsel, satu jaringan Wi-Fi dengan komputer. Fitur suara dan notifikasi tidak berjalan, lihat Bagian 5     |
| **Android lewat build EAS**   | Akun [Expo](https://expo.dev) dan `eas-cli`. Build berjalan di peladen Expo, komputer Anda tidak perlu Android Studio                                 |
| **Android lewat build lokal** | JDK 17, Android Studio beserta Android SDK, dan satu emulator atau perangkat fisik dengan USB debugging. Ikuti [panduan resmi Expo][expo-env-android] |
| **iOS**                       | macOS beserta Xcode dan CocoaPods. **Tidak tersedia di Windows maupun Linux**                                                                         |

[expo-env-android]: https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build

Untuk membangun berkas rilis, pasang `eas-cli` sekali saja:

```bash
npm install -g eas-cli
```

---

## 3. Klon dan Instalasi

```bash
git clone https://github.com/juliarta99/niti-resik-mobile.git resikita_mobile
cd resikita_mobile
npm install
```

`npm install` memasang seluruh dependensi dan menjalankan langkah pasca-pemasangan milik Expo. Pemasangan pertama memakan beberapa menit dan mengunduh ratusan megabyte.

**`npm install` atau `npm ci`?** Pakai `npm install` untuk pengembangan sehari-hari. Pakai `npm ci` di CI atau ketika Anda ingin memasang persis isi `package-lock.json` tanpa satu pun perubahan, `npm ci` menghapus `node_modules` lebih dulu dan menolak berjalan bila lockfile tidak sinkron dengan `package.json`.

Setelah `npm install` selesai, pastikan pohon dependensinya cocok dengan yang diharapkan Expo SDK 57:

```bash
npx expo install --check
```

Perintah itu menyebut paket yang versinya di luar rentang yang didukung SDK ini. Tambahkan `--fix` untuk memperbaikinya sekaligus. Ketidakcocokan versi adalah penyebab paling sering dari galat native yang pesannya tidak menunjuk ke mana-mana.

### Direktori `android/` dan `ios/` tidak ada, dan itu memang disengaja

Proyek ini memakai **alur kerja terkelola** (managed workflow) Expo. Kedua direktori native itu masuk `.gitignore` dan dibangkitkan ulang oleh `npx expo prebuild` setiap kali dibutuhkan, dari `app.json`. Konsekuensinya:

- Konfigurasi native diubah lewat `app.json` dan plugin config, **bukan** dengan menyunting berkas Gradle atau Xcode. Suntingan langsung akan hilang pada prebuild berikutnya.
- Klon yang baru saja selesai tidak perlu langkah tambahan apa pun untuk web maupun Expo Go.

---

## 4. Konfigurasi

Salin templat yang sudah tersedia, lalu isi nilainya:

```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Templatnya hanya memuat variabel yang wajib. Dua variabel opsional di bawah ditambahkan sendiri bila memang dibutuhkan, `.env` yang lengkap kira-kira seperti ini:

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

> **Awalan `EXPO_PUBLIC_` berarti nilainya ikut masuk ke dalam bundel dan dapat dibaca siapa pun** yang membongkar APK atau membuka berkas JavaScript di web. Ini wajar untuk alamat API, tetapi **jangan pernah menaruh kunci rahasia, kunci server Midtrans, atau kredensial apa pun** di sana. Rahasia adalah urusan backend.

### Empat hal yang sering menjadi masalah

**Jangan memakai `localhost` bila menguji di perangkat fisik.** Bagi ponsel, `localhost` berarti ponsel itu sendiri, bukan komputer Anda. Pakai alamat IP lokal komputer pengembang, dan pastikan ponsel berada di jaringan Wi-Fi yang sama.

```bash
# Windows
ipconfig

# macOS / Linux
ifconfig | grep "inet "
```

Bila jaringan kantor atau kampus memblokir komunikasi antar-perangkat, sambungkan ponsel lewat USB lalu teruskan portnya:

```bash
adb reverse tcp:8000 tcp:8000     # port backend
adb reverse tcp:8081 tcp:8081     # port Metro
```

Setelah itu `http://localhost:8000/api/v1` justru menjadi alamat yang benar.

**Backend harus mendengarkan di semua antarmuka.** `php artisan serve` secara bawaan hanya mengikat `127.0.0.1` dan tidak terjangkau dari ponsel meski satu Wi-Fi. Jalankan `php artisan serve --host=0.0.0.0` di sisi backend.

**Token sandbox Midtrans tidak berlaku di domain produksi.** Bila backend berjalan dalam mode sandbox tetapi `EXPO_PUBLIC_MIDTRANS_SNAP_URL` menunjuk `app.midtrans.com`, halaman pembayaran menampilkan "transaksi tidak ditemukan", terbaca seperti pesanannya gagal dibuat, padahal pesanannya baik-baik saja.

**Variabel `EXPO_PUBLIC_*` ditanam saat bundling, bukan dibaca saat aplikasi berjalan.** Setelah mengubah `.env`, server pengembangan harus dijalankan ulang dengan tembolok dibersihkan:

```bash
npx expo start -c
```

Tanpa `-c`, nilai lama tetap terpakai dan perubahan Anda seolah-olah tidak berpengaruh.

---

## 5. Menjalankan Aplikasi

### Ringkasan: tiga cara, kemampuan berbeda

Ini bagian terpenting untuk dipahami sebelum memilih perintah. Aplikasi memakai modul native pihak ketiga yang **tidak ikut dipaketkan di dalam Expo Go**.

| Cara                               | Perintah                              | Fitur suara       | Notifikasi dorong | Butuh Android Studio |
| ---------------------------------- | ------------------------------------- | ----------------- | ----------------- | -------------------- |
| **Web**                            | `npm run web`                         | ✅ Web Speech API | ❌                | Tidak                |
| **Expo Go**                        | `npm start`, lalu pindai kode QR      | ❌                | ❌                | Tidak                |
| **Development build** (dianjurkan) | `eas build --profile development ...` | ✅                | ✅                | Tidak                |
| **Build lokal**                    | `npm run android`                     | ✅                | ✅                | **Ya**               |

### Web, jalur pengujian harian

```bash
npm run web
```

Paling cepat memuat ulang dan paling mudah membaca galat konsol. Inilah jalur yang dipakai proyek ini sehari-hari, dan syarat "berjalan di web tanpa galat konsol" ada di [Bagian 12](#12-aturan-pengembangan) justru karena itu.

### Expo Go, tanpa perkakas native

```bash
npm start
```

Metro menampilkan kode QR. Pindai dengan aplikasi Expo Go (Android) atau aplikasi Kamera (iOS). Karena `expo-dev-client` terpasang di proyek ini, Metro terbuka dalam mode development build, tekan **`s`** untuk beralih ke mode Expo Go, lalu pindai QR-nya.

Yang **tidak** berjalan di Expo Go:

- **Input suara** (`expo-speech-recognition`), tombol mikrofonnya sengaja disembunyikan, bukan menampilkan galat.
- **Notifikasi dorong.** Expo membuang push Android dari Expo Go sejak SDK 53. `src/lib/push.ts` mendeteksinya lewat `isRunningInExpoGo()` dan melewati seluruh modulnya, karena `expo-notifications` **melempar galat saat dimuat** di Expo Go pada Android, bukan sekadar memperingatkan.

Selebihnya, seluruh layar dapat ditelusuri normal.

### Development build, cara yang dianjurkan untuk pengujian menyeluruh

Development build adalah APK berisi seluruh modul native proyek ini, tetapi tetap memuat JavaScript dari server Metro Anda. Dibuat sekali, lalu dipakai berulang kali seperti Expo Go.

```bash
# Masuk sekali saja
eas login

# Bangun di peladen Expo, komputer Anda tidak perlu Android Studio
eas build --profile development --platform android
```

Unduh APK dari tautan yang diberikan EAS, pasang di perangkat, lalu:

```bash
npm start
```

Buka aplikasinya di perangkat, ia menyambung ke server Metro Anda sendiri.

Profil `development` di `eas.json` menyetel `EXPO_PUBLIC_API_URL` ke domain produksi. Bila ingin build itu menunjuk backend lokal, ubah nilainya di `eas.json` sebelum membangun, `.env` lokal **tidak** ikut terbawa ke build EAS.

### Build lokal, bila Anda punya Android Studio

```bash
npm run android      # sama dengan: expo run:android
```

Perintah ini **bukan** Expo Go. Ia menjalankan `expo prebuild`, membangkitkan direktori `android/`, lalu menyusun APK dengan Gradle di komputer Anda. Kompilasi pertama memakan waktu lama, dan syaratnya JDK 17 beserta Android SDK yang lengkap.

Untuk iOS, hanya di macOS dengan Xcode:

```bash
npm run ios
```

---

## 6. Membangun Berkas Rilis

Profil build sudah didefinisikan di `eas.json`.

```bash
# Masuk sekali saja
eas login

# APK untuk pengujian internal
eas build --profile preview --platform android

# Rilis
eas build --profile production --platform android
```

| Profil        | Distribusi | Isi                                                              |
| ------------- | ---------- | ---------------------------------------------------------------- |
| `development` | internal   | Berisi `expo-dev-client`, memuat JavaScript dari Metro Anda      |
| `preview`     | internal   | Bundel JavaScript ikut di dalamnya, dapat dibagikan lewat tautan |
| `production`  | store      | `autoIncrement` menaikkan `versionCode` otomatis di setiap build |

Ketiga profil menetapkan `EXPO_PUBLIC_API_URL` sendiri di `eas.json`, sehingga `.env` lokal Anda **tidak** ikut terbawa ke hasil build. Ini disengaja: build yang menunjuk `192.168.x.x` milik komputer pengembang tidak akan berfungsi di tangan siapa pun.

### Membangun berkas web statis

```bash
npx expo export -p web
```

Hasilnya berada di direktori `dist/` dan dapat dilayani sebagai situs statis biasa.

### Bila build EAS gagal karena lockfile

Pastikan `package-lock.json` sudah ter-commit, EAS mengunggah berkas yang dikenal Git saja. Bila terpaksa, `EAS_NO_VCS=1` dapat dipakai sebagai jalan terakhir.

---

## 7. Perintah Lain

```bash
# Analisis statis kualitas kode
npm run lint

# Pemeriksaan tipe menyeluruh tanpa menghasilkan berkas
npx tsc --noEmit

# Membersihkan tembolok bundler saat perilaku terasa aneh
npx expo start -c

# Memeriksa kecocokan versi dependensi dengan Expo SDK 57
npx expo install --check
```

Seluruh perintah yang tersedia:

| Perintah                | Fungsi                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm start`             | Server pengembangan dengan menu pemilihan target                                                                         |
| `npm run web`           | Menjalankan di peramban                                                                                                  |
| `npm run android`       | `expo run:android`, build native lokal, butuh Android Studio                                                             |
| `npm run ios`           | `expo run:ios`, build native lokal, hanya di macOS                                                                       |
| `npm run lint`          | ESLint                                                                                                                   |
| `npm run reset-project` | Peninggalan templat `create-expo-app`. **Jangan dijalankan**, perintah ini memindahkan kode aplikasi ke direktori contoh |

Sebelum mengirim perubahan, jalankan keduanya, `npm run lint` tidak memeriksa tipe dan `tsc` tidak memeriksa gaya:

```bash
npm run lint && npx tsc --noEmit
```

---

## 8. Pemecahan Masalah

| Gejala                                                              | Sebab dan penanganan                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seluruh layar menampilkan galat jaringan                            | `EXPO_PUBLIC_API_URL` salah, backend mati, atau perangkat di jaringan berbeda. Buka URL itu di peramban perangkat untuk memastikan terjangkau. Lihat [Bagian 4](#4-konfigurasi) |
| Perubahan `.env` tidak berpengaruh                                  | Variabel ditanam saat bundling. Jalankan ulang dengan `npx expo start -c`                                                                                                       |
| Galat versi Node saat bundling                                      | Periksa `node -v` terhadap rentang pada [Bagian 2](#2-prasyarat)                                                                                                                |
| Galat native yang pesannya tidak menunjuk ke mana-mana              | Versi dependensi di luar rentang SDK. Jalankan `npx expo install --check`                                                                                                       |
| `expo-notifications` melempar galat saat aplikasi dibuka di Android | Anda menjalankannya di Expo Go. Push Android dibuang dari Expo Go sejak SDK 53; pakai development build. Aplikasi sudah menonaktifkan push sendiri di lingkungan itu            |
| Tombol mikrofon tidak muncul                                        | Pengenalan suara tidak tersedia di lingkungan itu. Aplikasi sengaja menyembunyikan tombolnya alih-alih menampilkan galat. Pakai web atau development build                      |
| Port 8081 sudah dipakai                                             | Proses Metro lama masih hidup. Tutup, atau jalankan `npx expo start --port 8082`                                                                                                |
| Ponsel tidak menemukan server Metro                                 | Jaringan memblokir komunikasi antar-perangkat. Sambungkan lewat USB lalu `adb reverse tcp:8081 tcp:8081`                                                                        |
| Halaman pembayaran menyatakan transaksi tidak ditemukan             | Ketidakcocokan mode Midtrans. Lihat [Bagian 4](#4-konfigurasi)                                                                                                                  |
| Sesi keluar sendiri terus-menerus                                   | Token ditolak backend. Interceptor pada `src/lib/api/client.ts` membuang token dan mengalihkan ke layar masuk setiap kali menerima `401`                                        |
| Peta kosong atau abu-abu                                            | Peta memuat Leaflet dari CDN unpkg dan ubin dari OpenStreetMap. Keduanya butuh koneksi internet aktif                                                                           |
| Konten paling bawah tertutup tombol navigasi HP                     | Layar itu belum memakai `useBottomPad()` atau komponen `BottomBar`. Android menggambar sampai tepi layar (edge-to-edge), tidak ada ruang yang disisakan otomatis                |
| Build Gradle gagal dengan galat versi Java                          | JDK 17 diperlukan. Periksa `java -version` dan setel `JAVA_HOME`                                                                                                                |
| Build EAS gagal menyebut lockfile                                   | `package-lock.json` belum ter-commit. Lihat [Bagian 6](#6-membangun-berkas-rilis)                                                                                               |

---

## 9. Fitur Aplikasi

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

## 10. Arsitektur

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

Kontrak selengkapnya ada di [`API-DOCS.md`](API-DOCS.md). Bila dokumentasi dan perilaku nyata peladen berselisih, yang benar adalah perilaku peladen, perbaiki dokumennya, jangan menambal di klien.

### Mengapa Leaflet, bukan react-native-maps

`react-native-maps` tidak berjalan di Expo web tanpa penyesuaian tambahan, sedangkan aplikasi ini mensyaratkan kode yang sama berjalan di tiga platform. Memakai dua pustaka peta berarti dua perilaku, dua gaya penanda, dan dua tempat bug bersembunyi.

Leaflet di dalam WebView memberi satu implementasi untuk semuanya, dan lebih mudah disesuaikan karena tampilannya hanya HTML dan CSS di `src/lib/leafletHtml.ts`. Konsekuensi yang diterima: peta sedikit lebih berat daripada peta native dan tidak memakai gestur peta bawaan sistem.

### Penanganan uang

API mengembalikan seluruh nilai uang sebagai **integer rupiah**. `12500` berarti Rp 12.500.

```ts
formatRupiah(12500); // "Rp 12.500"      benar

(12500 / 100).toFixed(2); // salah, jangan pernah
parseFloat(saldo); // salah, jangan pernah
```

Penjumlahan apa pun di sisi klien hanya untuk tampilan sementara. Total yang mengikat selalu berasal dari respons `POST /pesanan`.

---

## 11. Struktur Direktori

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
    push.ts                   pendaftaran token notifikasi, impor dinamis
    storage.ts reorder.ts markdown.ts
  types/                      tipe respons API, satu berkas per domain
  constants/                  theme.ts, peta.ts
  context/                    AuthContext.tsx
```

Berkas berakhiran `.web.tsx` dan `.native.tsx` dipilih otomatis oleh bundler sesuai platform. Berkas `.d.ts` yang menyertainya menyatukan tipe keduanya agar pemanggil tidak perlu tahu mana yang sedang dipakai.

### Berkas penting di akar

| Berkas                    | Isi                                                                |
| ------------------------- | ------------------------------------------------------------------ |
| `app.json`                | Konfigurasi Expo: nama, ikon, plugin, izin, id paket               |
| `eas.json`                | Profil build EAS beserta variabel lingkungannya                    |
| `CLAUDE.md`               | Panduan kerja untuk asisten kode, memuat aturan dan jebakan proyek |
| `API-DOCS.md`             | Kontrak REST API selengkapnya                                      |
| `KOMPONEN-DAN-LISENSI.md` | Daftar seluruh komponen pihak ketiga beserta lisensinya            |

---

## 12. Aturan Pengembangan

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
- **Android menggambar sampai tepi layar.** Sejak edge-to-edge diwajibkan, tidak ada ruang yang disisakan otomatis untuk bilah navigasi. Layar dengan elemen tetap di dasar harus menambahkan `useSafeAreaInsets().bottom` sendiri, dan melepasnya saat papan ketik terbuka, kalau tidak muncul celah kosong.
- **`KeyboardAvoidingView` harus membungkus seluruh isi layar.** Ia menghitung tumpang tindih antara kotaknya sendiri dan papan ketik, dan kotak itu diukur relatif terhadap induk. Dipasang di bawah bilah judul, bantalannya selalu kurang setinggi bilah judul itu.
- **`expo-notifications` melempar galat saat dimuat di Expo Go pada Android**, bukan sekadar memperingatkan. `src/lib/push.ts` memuatnya secara dinamis dan melewatinya sepenuhnya lewat `isRunningInExpoGo()`.

### Sebelum menganggap pekerjaan selesai

- Berjalan di web tanpa galat konsol
- Ada keadaan memuat, galat, dan kosong
- Konten bawah tidak tertutup bottom bar maupun bilah navigasi HP
- Elemen interaktif punya `accessibilityLabel`
- Tidak ada `any` baru
- Nilai uang diperlakukan sebagai integer rupiah
- Fitur suara punya jalur alternatif mengetik
- `npm run lint` dan `npx tsc --noEmit` bersih
- Sudah dicoba di perangkat fisik, bukan hanya emulator

---

## 13. Lisensi

Kode sumber aplikasi ini dirilis di bawah **[Lisensi MIT](LICENSE)**, hak cipta © 2026 Tim Resikita.

Lisensi MIT dipilih karena paling selaras dengan komponen yang dipakai: seluruh dependensi berlisensi permisif, MIT, ISC, BSD, dan Apache-2.0, tanpa satu pun lisensi copyleft kuat yang mengikat. Rinciannya, 880 paket beserta lisensi masing-masing, ada di [`KOMPONEN-DAN-LISENSI.md`](KOMPONEN-DAN-LISENSI.md).

Kewajiban atribusi yang tetap harus dipenuhi saat mendistribusikan aplikasi:

- Menyertakan teks lisensi beserta pemberitahuan hak cipta untuk komponen MIT, BSD-2-Clause, dan Apache-2.0
- Menyertakan lisensi SIL Open Font License 1.1 untuk font Plus Jakarta Sans
- Mencantumkan atribusi "© OpenStreetMap contributors" pada setiap tampilan peta, sudah diterapkan di `src/lib/leafletHtml.ts`
- Mengirim `User-Agent` yang mengidentifikasi aplikasi pada setiap permintaan Nominatim, sudah diterapkan di `src/lib/geo.ts`
