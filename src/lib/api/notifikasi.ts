/** Notifikasi. Rujukan: API-DOCS.md §18.1–§18.4. */

import type {
  JumlahBelumDibaca,
  Notifikasi,
  ParamsNotifikasi,
} from "@/types/notifikasi";
import { get, pastikanHalaman, patch, post } from "./client";

export const daftarNotifikasi = (params?: ParamsNotifikasi) =>
  get<unknown>("/notifikasi", {
    params: params?.belum_dibaca
      ? { ...params, belum_dibaca: 1 }
      : { ...params, belum_dibaca: undefined },
  }).then((d) => pastikanHalaman<Notifikasi>(d, "GET /notifikasi"));

/** Ringan, aman dipanggil berkala untuk lencana angka. */
export const jumlahBelumDibaca = () =>
  get<JumlahBelumDibaca>("/notifikasi/belum-dibaca");

/** Metodenya `PATCH`, dan pathnya berakhir `/dibaca` — bukan `PUT .../baca`. */
export const bacaNotifikasi = (id: number) =>
  patch<Notifikasi>(`/notifikasi/${id}/dibaca`);

export const bacaSemuaNotifikasi = () => post<null>("/notifikasi/baca-semua");
