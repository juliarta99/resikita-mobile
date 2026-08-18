import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Linking } from "react-native";
import { WebView } from "react-native-webview";
import { buildLeafletHtml } from "@/lib/leafletHtml";
import type {
  LeafletMapHandle,
  LeafletMapProps,
  LeafletMarker,
} from "@/types/peta";

/** Perintah yang dikirim ke halaman peta di dalam WebView. */
type PerintahPeta =
  | { cmd: "setView"; lat: number; lng: number; zoom?: number }
  | { cmd: "markers"; list: LeafletMarker[] };

export type { LeafletMapHandle, LeafletMapProps };

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(
  function LeafletMapNative(
    { center, zoom, markers, pick, style, onMarkerPress, onMapPress },
    ref,
  ) {
    const webRef = useRef<WebView>(null);
    const ready = useRef(false);

    // HTML dibangun sekali dari nilai pembukaan dan tidak pernah disusun ulang.
    // Perubahan sesudahnya dikirim sebagai perintah ke halaman yang sudah hidup,
    // karena memuat ulang WebView akan mengembalikan peta ke posisi awal setiap
    // kali satu penanda berubah.
    const html = useRef(
      buildLeafletHtml({ center, zoom, pick, markers }),
    ).current;

    const post = useCallback((obj: PerintahPeta) => {
      const js = `window.__handle(${JSON.stringify(JSON.stringify(obj))}); true;`;
      webRef.current?.injectJavaScript(js);
    }, []);

    useImperativeHandle(ref, () => ({
      setView: (lat, lng, zoomBaru) =>
        post({ cmd: "setView", lat, lng, zoom: zoomBaru }),
    }));

    useEffect(() => {
      if (ready.current) post({ cmd: "markers", list: markers ?? [] });
    }, [markers, post]);

    /*
      `zoom` ikut sebagai dependensi, bukan sekadar dibaca.

      Sebelumnya ia dipakai di dalam efek tapi tidak didaftarkan, sehingga
      mengubah level zoom dari induk tidak berpengaruh apa pun sampai kebetulan
      titik pusatnya ikut berubah — dan ketika akhirnya berubah, nilai zoom yang
      terkirim adalah yang terbaru, bukan yang berlaku saat titik itu disetel.
    */
    useEffect(() => {
      if (ready.current) {
        post({ cmd: "setView", lat: center.lat, lng: center.lng, zoom });
      }
    }, [center.lat, center.lng, zoom, post]);

    const onMessage = (e: { nativeEvent: { data: string } }) => {
      try {
        const d = JSON.parse(e.nativeEvent.data);
        if (d.type === "ready") {
          ready.current = true;
          post({ cmd: "markers", list: markers ?? [] });
        } else if (d.type === "marker") onMarkerPress?.(d.id);
        else if (d.type === "press") onMapPress?.(d.lat, d.lng);
        // Tautan atribusi OpenStreetMap. Dibuka di peramban sistem, bukan di
        // dalam WebView, supaya petanya tidak tertimpa halaman hak cipta.
        else if (d.type === "link" && typeof d.url === "string") {
          void Linking.openURL(d.url);
        }
      } catch {
        // Pesan yang bukan JSON milik kita. Diabaikan.
      }
    };

    return (
      <WebView
        ref={webRef}
        source={{ html }}
        style={style}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
      />
    );
  },
);
export default LeafletMap;
