/** Notifikasi dan perangkat. Rujukan: API-DOCS.md §3.19 dan §18. */

import type { IsoDateTime, ParamsHalaman } from "./api";
import type { ChannelNotifikasi, StatusNotifikasi } from "./enums";

export type Notifikasi = {
  id: number;
  /** Penanda jenis, mis. `laporan.diverifikasi`. */
  tipe: string;
  judul: string;
  pesan: string;
  /** Path dalam aplikasi, mis. `/laporan/842`. Petakan sendiri ke layar. */
  action_url: string | null;
  channel: ChannelNotifikasi;
  status: StatusNotifikasi;
  dibaca: boolean;
  dibaca_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
};

/** Respons `GET /notifikasi/belum-dibaca` (§18.2). */
export type JumlahBelumDibaca = {
  belum_dibaca: number;
};

export type ParamsNotifikasi = ParamsHalaman & {
  belum_dibaca?: boolean;
};
