/** Chatbot literasi. Rujukan: API-DOCS.md §11. */

import type {
  HasilPesanChat,
  ParamsSesiChat,
  PayloadPesanChat,
  PesanChat,
  SesiChat,
} from "@/types/chatbot";
import { TIMEOUT_AI, del, get, pastikanHalaman, patch, post } from "./client";

export const sesiChat = (params?: ParamsSesiChat) =>
  get<unknown>("/chatbot/sesi", { params }).then((d) =>
    pastikanHalaman<SesiChat>(d, "GET /chatbot/sesi"),
  );

/** Opsional — layar chat baru boleh langsung mengirim pesan tanpa `sesi_id`. */
export const buatSesiChat = (judul?: string) =>
  post<SesiChat>("/chatbot/sesi", judul ? { judul } : {});

export const detailSesiChat = (id: number) =>
  get<SesiChat>(`/chatbot/sesi/${id}`);

export const hapusSesiChat = (id: number) => del<null>(`/chatbot/sesi/${id}`);

/**
 * Kirim satu pesan.
 *
 * `sesi_id` boleh dikosongkan — peladen membuat sesinya dan mengembalikan
 * id-nya, jadi layar percakapan baru tidak perlu dua pemanggilan untuk mulai.
 *
 * Gagal `503` berarti layanan AI tidak menjawab. Pertanyaannya **tidak** ikut
 * tersimpan, sehingga riwayat tidak menyisakan pertanyaan tanpa jawaban —
 * karena itu kalimat yang sudah diketik atau didiktekan pengguna harus tetap
 * dipertahankan di layar supaya bisa dikirim ulang.
 */
export const kirimPesanChat = (body: PayloadPesanChat) =>
  post<HasilPesanChat>("/chatbot/pesan", body, { timeout: TIMEOUT_AI });

/**
 * Panggil setelah pemutaran suara sebuah balasan selesai.
 *
 * Angkanya bukan hiasan: kolom ini yang memberi bukti terukur seberapa banyak
 * orang benar-benar memakai jalur suara.
 */
export const tandaiDibacakan = (id: number) =>
  patch<PesanChat>(`/chatbot/pesan/${id}/dibacakan`);

/** Pemantik pertanyaan; peladen menyesuaikannya dengan wilayah pengguna. */
export const saranPertanyaan = () =>
  get<{ saran?: string[] } | null>("/chatbot/saran-pertanyaan").then((d) =>
    Array.isArray(d?.saran) ? d.saran : [],
  );
