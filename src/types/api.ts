/**
 * Bentuk amplop dan satuan dasar yang dipakai lintas seluruh endpoint.
 * Rujukan: API-DOCS.md §1.
 */

/**
 * Nilai uang. **Selalu integer rupiah** — `12500` berarti Rp 12.500.
 *
 * Alias ini tidak menambah keamanan tipe (TypeScript tidak membedakannya dari
 * `number`), tapi ia menjawab pertanyaan yang selalu muncul saat membaca sebuah
 * field angka: ini rupiah utuh, sen, atau pecahan? Setiap kemunculannya adalah
 * pengingat untuk tidak membaginya dengan 100 dan tidak mem-parsing-nya sebagai
 * float. Tampilkan lewat `formatRupiah()`.
 */
export type Rupiah = number;

/** Timestamp ISO 8601, mis. `"2026-03-14T07:21:09+00:00"`. */
export type IsoDateTime = string;

/** Tanggal tanpa jam, mis. `"1998-04-17"`. */
export type IsoDate = string;

/** Respons sukses dengan satu objek data. */
export type ApiEnvelope<T> = {
  success: true;
  message?: string;
  data: T;
};

/** Metadata paginasi. Peladen sengaja hanya mengirim empat kunci ini (§1.2). */
export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/** Respons sukses berhalaman. `data` selalu larik. */
export type ApiPaginated<T> = {
  success: true;
  data: T[];
  meta: PaginationMeta;
};

/** Galat validasi per field: `{ email: ["Email sudah terdaftar."] }`. */
export type ValidationErrors = Record<string, string[]>;

/** Respons gagal. `errors` hanya ada pada galat validasi 422 (§1.2). */
export type ApiErrorBody = {
  success: false;
  message: string;
  errors?: ValidationErrors;
};

/**
 * Hasil endpoint berhalaman setelah amplopnya dibuka interceptor.
 *
 * Interceptor membuang `success` tapi **tidak boleh** membuang `meta` — tanpa
 * `last_page`, `useInfiniteQuery` tidak punya cara tahu kapan berhenti memuat.
 */
export type Halaman<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Query string umum untuk endpoint berhalaman. Rujukan: API-DOCS.md §1.5.
 *
 * Hanya dua kunci, dan itu disengaja: peladen mengabaikan diam-diam query yang
 * tidak dikenalinya, jadi `sort`/`order`/`q` yang dulu ada di sini tidak pernah
 * menghasilkan galat — ia hanya tidak berpengaruh apa-apa, dan itu jauh lebih
 * sulit dilacak. Penyaring lain didefinisikan per endpoint.
 */
export type ParamsHalaman = {
  page?: number;
  per_page?: number;
};

/** Penyaring berbasis jarak yang berlaku sama untuk seluruh direktori (§8). */
export type ParamsLokasi = {
  /** Wajib berpasangan dengan `longitude`. */
  latitude?: number;
  /** Mengaktifkan urutan terdekat dan memunculkan kunci `jarak_km`. */
  longitude?: number;
  /** Hanya berlaku bila koordinat dikirim. */
  radius_km?: number;
};
