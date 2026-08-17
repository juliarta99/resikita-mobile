import axios, {
    AxiosError,
    type AxiosRequestConfig,
    type AxiosResponse,
} from "axios";
import { router } from "expo-router";
import { Platform } from "react-native";

import { bersihkanSesi } from "@/lib/queryClient";
import type { ApiErrorBody, PaginationMeta } from "@/types/api";
import { ApiError } from "./error";
import { tokenStore } from "./token";

/** Cukup untuk endpoint biasa; yang sinkron ke model AI memakai TIMEOUT_AI. */
const TIMEOUT_STANDAR = 15_000;

/**
 * Klasifikasi dan chatbot bersifat sinkron, permintaan memegang satu proses
 * peladen selama beberapa detik sementara model bekerja. Dokumen meminta
 * minimal 30 detik; angka di sini lebih longgar karena klasifikasi masih harus
 * mengunggah foto lebih dulu, dan unggahan di jaringan seluler yang lemah
 * memakan waktunya sendiri sebelum peladen mulai berpikir.
 */
export const TIMEOUT_AI = 45_000;

/**
 * Endpoint yang 401-nya berarti "kredensial salah", bukan "sesi habis".
 *
 * Tanpa daftar ini, gagal masuk karena salah kata sandi akan memicu
 * pembersihan token dan pengalihan ke layar masuk, dari layar masuk. Pengguna
 * melihat layarnya berkedip dan tidak pernah membaca pesan galatnya.
 */
const JALUR_TANPA_SESI = [
  "/auth/login",
  "/auth/daftar",
  "/auth/lupa-password",
  "/auth/reset-password",
];

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { Accept: "application/json" },
  timeout: TIMEOUT_STANDAR,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Buka amplop respons, **sekali, di sini saja**.
 *
 * Seluruh endpoint membungkus muatannya dalam `{ success, message, data }`.
 * Kalau setiap pemanggil membukanya sendiri dengan `.data.data`, satu kesalahan
 * ketik menghasilkan `undefined` yang baru meledak jauh di dalam komponen.
 *
 * Respons berhalaman dipertahankan sebagai `{ data, meta }`, bukan diciutkan
 * jadi larik telanjang: tanpa `meta.last_page`, `useInfiniteQuery` tidak punya
 * cara tahu kapan berhenti memuat.
 */
api.interceptors.response.use((response: AxiosResponse) => {
  const body: unknown = response.data;
  if (body && typeof body === "object" && "success" in body) {
    const amplop = body as { data?: unknown; meta?: unknown };
    response.data =
      amplop.meta !== undefined
        ? { data: amplop.data, meta: amplop.meta }
        : amplop.data;
  }
  return response;
});

/** Ubah kegagalan apa pun menjadi `ApiError`, dan tangani sesi yang habis. */
api.interceptors.response.use(undefined, async (galat: unknown) => {
  if (!(galat instanceof AxiosError)) {
    throw new ApiError(
      galat instanceof Error ? galat.message : "Terjadi kesalahan.",
      0,
    );
  }

  const status = galat.response?.status ?? 0;
  const body = galat.response?.data as Partial<ApiErrorBody> | undefined;
  const jalur = galat.config?.url ?? "";

  if (status === 401 && !JALUR_TANPA_SESI.some((p) => jalur.startsWith(p))) {
    // Urutannya penting: buang token lebih dulu supaya permintaan yang masih
    // mengantre tidak ikut mengirim token mati, baru kosongkan cache supaya
    // data pengguna sebelumnya tidak sempat terpampang di layar masuk.
    //
    // Pembersihannya lewat `bersihkanSesi()`, bukan `queryClient.clear()`.
    // `clear()` memutus observer `useQuery` dari objek Query yang diamatinya,
    // sehingga profil pengguna lama justru **bertahan** di layar alih-alih
    // hilang. Lihat catatan lengkapnya di `context/AuthContext.tsx`.
    await tokenStore.clear();
    bersihkanSesi();
    router.replace("/(auth)/login");
  }

  const retryAfter = Number(galat.response?.headers?.["retry-after"]);

  throw new ApiError(
    body?.message ?? pesanBawaan(status),
    status,
    body?.errors,
    Number.isFinite(retryAfter) ? retryAfter : undefined,
  );
});

function pesanBawaan(status: number): string {
  if (status === 0) return "Tidak dapat terhubung. Periksa koneksi Anda.";
  if (status === 403) return "Anda tidak berwenang melakukan ini.";
  if (status === 404) return "Data tidak ditemukan.";
  if (status === 429) return "Terlalu banyak permintaan. Coba lagi sebentar.";
  if (status === 503) return "Layanan sedang tidak dapat dihubungi.";
  if (status >= 500) return "Terjadi gangguan di peladen.";
  return "Terjadi kesalahan.";
}

// ---- Pembungkus bertipe ----
// Amplopnya sudah dibuka interceptor, jadi `response.data` di sini sudah berisi
// muatan yang sebenarnya. Pembungkus ini menghemat `.then((r) => r.data)` di
// setiap pemanggilan dan membuat tipe kembaliannya eksplisit.

export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<T>(url, config).then((r) => r.data);

export const post = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) => api.post<T>(url, body, config).then((r) => r.data);

export const put = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) => api.put<T>(url, body, config).then((r) => r.data);

export const patch = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
) => api.patch<T>(url, body, config).then((r) => r.data);

export const del = <T>(url: string, config?: AxiosRequestConfig) =>
  api.delete<T>(url, config).then((r) => r.data);

/**
 * Kirim `FormData`.
 *
 * Di web, `Content-Type` **harus** dibiarkan kosong supaya browser menyusun
 * sendiri boundary multipart-nya. Memaksanya ke `multipart/form-data`
 * menghasilkan badan permintaan tanpa boundary, dan peladen membacanya sebagai
 * unggahan kosong, galat yang tampak seperti "foto tidak terkirim" padahal
 * fotonya baik-baik saja.
 */
export const postMultipart = <T>(
  url: string,
  form: FormData,
  config?: AxiosRequestConfig,
) =>
  post<T>(url, form, {
    ...config,
    headers: {
      ...config?.headers,
      "Content-Type": Platform.OS === "web" ? undefined : "multipart/form-data",
    },
  });

/**
 * Pastikan sebuah muatan benar-benar larik.
 *
 * Beberapa endpoint yang dokumennya menjanjikan larik ternyata membungkusnya,
 * entah sebagai amplop berhalaman (`{ data, meta }`) atau di bawah kunci lain.
 * Tanpa penjaga ini, `.map()` atau `.reduce()` di layar meledak dengan
 * "items.reduce is not a function", dan jejaknya menunjuk komponen, bukan
 * endpoint yang sebenarnya bermasalah.
 *
 * Ini **tambalan sementara**, bukan perilaku yang diinginkan. Peringatan
 * `__DEV__` di bawah mencetak bentuk aslinya supaya ketidaksesuaian bisa
 * dilaporkan dan diperbaiki di dokumen atau backend, bukan dibiarkan menetap
 * di klien.
 */
export function pastikanLarik<T>(muatan: unknown, asal: string): T[] {
  if (Array.isArray(muatan)) return muatan as T[];

  if (muatan && typeof muatan === "object") {
    const objek = muatan as Record<string, unknown>;

    // Kunci yang paling lazim didahulukan; setelah itu kunci larik apa pun.
    // Peladen ini ternyata memakai nama domain, `toko` untuk keranjang,
    // `titik` untuk peta, jadi daftar tetap saja tidak cukup.
    const kunci =
      ["data", "items", "item"].find((k) => Array.isArray(objek[k])) ??
      Object.keys(objek).find((k) => Array.isArray(objek[k]));

    if (kunci) {
      if (__DEV__) {
        console.warn(
          `[api] ${asal} mengembalikan objek, bukan larik. Larik ditemukan di "${kunci}". Laporkan ketidaksesuaian ini ke backend.`,
        );
      }
      return objek[kunci] as T[];
    }
  }

  if (__DEV__) {
    console.warn(
      `[api] ${asal} tidak menghasilkan larik. Yang diterima:`,
      muatan === undefined ? "(kosong / field tidak ada)" : muatan,
    );
  }
  return [];
}

/**
 * Pastikan sebuah muatan benar-benar berbentuk halaman berpaginasi.
 *
 * Saudara kembar dari `pastikanLarik`, untuk masalah yang sama dari sisi
 * sebaliknya: endpoint yang dokumennya menjanjikan `{ data, meta }` ternyata
 * mengembalikan larik telanjang. Tanpa penjaga ini, `getNextPageParam` membaca
 * `h.meta.current_page` pada `meta` yang tidak ada dan **setiap daftar tak
 * berhingga di aplikasi ini ikut mati**.
 *
 * Ketika `meta` tidak ada, halaman yang dikembalikan ditandai sebagai satu-
 * satunya halaman, daftarnya tetap tampil, hanya tidak bisa memuat lanjutan.
 * Kehilangan paginasi jauh lebih ringan daripada layar yang mogok.
 */
export function pastikanHalaman<T>(
  muatan: unknown,
  asal: string,
): { data: T[]; meta: PaginationMeta } {
  const objek =
    muatan && typeof muatan === "object" && !Array.isArray(muatan)
      ? (muatan as Record<string, unknown>)
      : null;

  const data = pastikanLarik<T>(objek?.data ?? muatan, asal);
  const meta = objek?.meta as PaginationMeta | undefined;

  if (meta && typeof meta.current_page === "number") {
    return { data, meta };
  }

  if (__DEV__) {
    console.warn(
      `[api] ${asal} tidak menyertakan "meta" paginasi. Daftar ditampilkan tanpa halaman lanjutan. Laporkan ketidaksesuaian ini ke backend.`,
    );
  }
  return {
    data,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: data.length,
      total: data.length,
    },
  };
}

/** Bentuk berkas yang diterima `FormData` di React Native. */
type BerkasNative = { uri: string; name: string; type: string };

/**
 * Lampirkan foto dari URI lokal ke `FormData`, lintas platform.
 *
 * Di web, `FormData` menolak objek `{ uri }` dan hanya menerima `Blob` asli,
 * jadi URI-nya harus diambil ulang lebih dulu. Di native justru sebaliknya.
 * Perbedaan inilah yang dulu membuat unggahan berhasil di ponsel tapi diam-diam
 * gagal di browser.
 */
export async function appendFoto(
  form: FormData,
  field: string,
  uri: string,
  name = "foto.jpg",
  type = "image/jpeg",
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, name);
    return;
  }
  const berkas: BerkasNative = { uri, name, type };
  // React Native menerima bentuk ini, tapi tipe DOM untuk FormData hanya
  // mengenal string dan Blob. Konversinya disempitkan di satu tempat ini saja.
  form.append(field, berkas as unknown as Blob);
}
