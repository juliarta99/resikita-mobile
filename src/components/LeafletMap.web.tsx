import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { View } from "react-native";
import { buildLeafletHtml } from "@/lib/leafletHtml";
import type {
  LeafletMapHandle,
  LeafletMapProps,
  LeafletMarker,
} from "@/types/peta";

/** Perintah yang dikirim ke halaman peta di dalam iframe. */
type PerintahPeta =
  | { cmd: "setView"; lat: number; lng: number; zoom?: number }
  | { cmd: "markers"; list: LeafletMarker[] };

export type { LeafletMapHandle, LeafletMapProps };

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(
  function LeafletMapWeb(
    { center, zoom, markers, pick, style, onMarkerPress, onMapPress },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const ready = useRef(false);

    const html = useRef(
      buildLeafletHtml({ center, zoom, pick, markers }),
    ).current;

    const post = useCallback((obj: PerintahPeta) => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(obj), "*");
    }, []);

    useImperativeHandle(ref, () => ({
      setView: (lat, lng, zoomBaru) =>
        post({ cmd: "setView", lat, lng, zoom: zoomBaru }),
    }));

    /*
      Penanda dan penangan ditahan di ref, bukan didaftarkan sebagai dependensi
      pendengar pesan.

      Efek ini memasang pendengar pada `window`. Kalau isinya ikut berubah
      setiap kali `markers` atau salah satu penangan berganti identitas — dan
      penangan yang ditulis inline di layar pemanggil berganti pada **setiap**
      render — pendengarnya dicabut lalu dipasang ulang terus-menerus. Dengan
      ref, pendengarnya dipasang sekali dan tetap membaca nilai terbaru.
    */
    const markersRef = useRef(markers);
    const onMarkerPressRef = useRef(onMarkerPress);
    const onMapPressRef = useRef(onMapPress);

    useEffect(() => {
      markersRef.current = markers;
      onMarkerPressRef.current = onMarkerPress;
      onMapPressRef.current = onMapPress;
    }, [markers, onMarkerPress, onMapPress]);

    useEffect(() => {
      const onMsg = (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === "ready") {
            ready.current = true;
            post({ cmd: "markers", list: markersRef.current ?? [] });
          } else if (d.type === "marker") onMarkerPressRef.current?.(d.id);
          else if (d.type === "press")
            onMapPressRef.current?.(d.lat, d.lng);
          // Tautan atribusi OpenStreetMap. Dibuka di tab baru, bukan di dalam
          // iframe peta yang tidak punya kendali navigasi.
          else if (d.type === "link" && typeof d.url === "string") {
            window.open(d.url, "_blank", "noopener");
          }
        } catch {
          // Pesan yang bukan JSON milik kita, mis. dari ekstensi peramban.
        }
      };
      window.addEventListener("message", onMsg);
      return () => window.removeEventListener("message", onMsg);
    }, [post]);

    useEffect(() => {
      if (ready.current) post({ cmd: "markers", list: markers ?? [] });
    }, [markers, post]);

    // `zoom` ikut sebagai dependensi; lihat catatan sama di LeafletMap.native.
    useEffect(() => {
      if (ready.current) {
        post({ cmd: "setView", lat: center.lat, lng: center.lng, zoom });
      }
    }, [center.lat, center.lng, zoom, post]);

    return (
      <View style={style}>
        {React.createElement("iframe", {
          ref: iframeRef,
          srcDoc: html,
          style: { border: "0", width: "100%", height: "100%" },
        })}
      </View>
    );
  },
);
export default LeafletMap;
