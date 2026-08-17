/** Klasifikasi sampah. Rujukan: API-DOCS.md §5. */

import type {
    HasilKlasifikasi,
    ParamsRiwayatKlasifikasi,
    RingkasanKlasifikasi,
} from "@/types/klasifikasi";
import {
    TIMEOUT_AI,
    appendFoto,
    del,
    get,
    pastikanHalaman,
    postMultipart,
} from "./client";

/**
 * Kirim satu foto untuk dikenali.
 *
 * Sinkron, biasanya 3–8 detik. Gagal `503` berarti layanan AI tidak dapat
 * dihubungi, foto tidak tersimpan dan tidak ada riwayat yang terbentuk,
 * sehingga aman dicoba ulang atas perintah pengguna.
 */
export async function klasifikasi(uri: string) {
  const form = new FormData();
  await appendFoto(form, "foto", uri);
  return postMultipart<HasilKlasifikasi>("/klasifikasi", form, {
    timeout: TIMEOUT_AI,
  });
}

export const riwayatKlasifikasi = (params?: ParamsRiwayatKlasifikasi) =>
  get<unknown>("/klasifikasi/riwayat", { params }).then((d) =>
    pastikanHalaman<HasilKlasifikasi>(d, "GET /klasifikasi/riwayat"),
  );

export const ringkasanKlasifikasi = () =>
  get<RingkasanKlasifikasi>("/klasifikasi/ringkasan");

/** Hanya milik sendiri; selain itu peladen menjawab `403`. */
export const detailKlasifikasi = (id: number) =>
  get<HasilKlasifikasi>(`/klasifikasi/${id}`);

/** Menghapus riwayat beserta fotonya. */
export const hapusKlasifikasi = (id: number) => del<null>(`/klasifikasi/${id}`);
