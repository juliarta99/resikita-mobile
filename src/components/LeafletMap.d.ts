// Deklarasi tipe untuk modul yang dipecah per platform.
//
// TypeScript tidak mengenal akhiran `.web.tsx` / `.native.tsx` — itu konvensi
// Metro, bukan konvensi tsc. Tanpa berkas ini, setiap `import LeafletMap from
// "@/components/LeafletMap"` dilaporkan TS2307 walaupun aplikasinya berjalan
// normal, sehingga `tsc --noEmit` tidak bisa dipakai sebagai gerbang mutu.
//
// Metro mengabaikan `.d.ts`, jadi berkas ini murni kontrak tipe. Kedua
// implementasi wajib mengikutinya.
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LeafletMapHandle, LeafletMapProps } from "@/types/peta";

export type { LeafletMapHandle, LeafletMapProps };

declare const LeafletMap: ForwardRefExoticComponent<
  LeafletMapProps & RefAttributes<LeafletMapHandle>
>;
export default LeafletMap;
