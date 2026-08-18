import type { ValidationErrors } from "@/types/api";

/**
 * Galat API yang sudah dinormalkan.
 *
 * Tanpa ini, setiap layar menulis `e?.response?.data?.errors` sendiri dan harus
 * menebak bentuknya, pola yang menyebar di seluruh basis kode lama dan menjadi
 * salah satu sumber `any` terbanyak. Interceptor mengubah semua kegagalan
 * menjadi kelas ini, sehingga layar cukup memeriksa `instanceof ApiError`.
 */
export class ApiError extends Error {
  /** `0` bila permintaan tidak pernah sampai ke peladen (jaringan mati, timeout). */
  readonly status: number;
  /** Galat validasi per field, hanya terisi pada 422. */
  readonly errors?: ValidationErrors;
  /** Detik yang diminta peladen lewat header `Retry-After` pada 429. */
  readonly retryAfter?: number;

  constructor(
    message: string,
    status: number,
    errors?: ValidationErrors,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }

  /** Permintaan tidak pernah sampai ke peladen. */
  get offline(): boolean {
    return this.status === 0;
  }

  /** Layanan AI (klasifikasi atau chatbot) sedang tidak dapat dihubungi. */
  get layananAiMati(): boolean {
    return this.status === 503;
  }

  /**
   * Pesan galat pertama untuk field tertentu.
   *
   * Dipakai form untuk menempelkan pesan di bawah input yang bersangkutan,
   * alih-alih membuang seluruh objek galat ke satu dialog.
   */
  pesanField(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }

  /**
   * Pesan yang layak ditampilkan ke pengguna.
   *
   * Pesan validasi pertama lebih menolong daripada "Data tidak valid" yang
   * generik, karena ia menyebut apa yang salah.
   */
  get pesanUntukPengguna(): string {
    if (this.errors) {
      const pertama = Object.values(this.errors)[0]?.[0];
      if (pertama) return pertama;
    }
    return this.message;
  }
}
