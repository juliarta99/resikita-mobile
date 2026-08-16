import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
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

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMapWeb(props, ref) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const html = useRef(buildLeafletHtml({ center: props.center, zoom: props.zoom, pick: props.pick, markers: props.markers })).current;

  const post = (obj: PerintahPeta) => iframeRef.current?.contentWindow?.postMessage(JSON.stringify(obj), "*");

  useImperativeHandle(ref, () => ({ setView: (lat, lng, zoom) => post({ cmd: "setView", lat, lng, zoom }) }));

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "ready") { ready.current = true; post({ cmd: "markers", list: props.markers ?? [] }); }
        else if (d.type === "marker") props.onMarkerPress?.(d.id);
        else if (d.type === "press") props.onMapPress?.(d.lat, d.lng);
        // Tautan atribusi OpenStreetMap. Dibuka di tab baru, bukan di dalam
        // iframe peta yang tidak punya kendali navigasi.
        else if (d.type === "link" && typeof d.url === "string") {
          window.open(d.url, "_blank", "noopener");
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [props.onMarkerPress, props.onMapPress, props.markers]);

  useEffect(() => { if (ready.current) post({ cmd: "markers", list: props.markers ?? [] }); }, [props.markers]);
  useEffect(() => { if (ready.current) post({ cmd: "setView", lat: props.center.lat, lng: props.center.lng, zoom: props.zoom }); }, [props.center?.lat, props.center?.lng]);

  return (
    <View style={props.style}>
      {React.createElement("iframe", {
        ref: iframeRef,
        srcDoc: html,
        style: { border: "0", width: "100%", height: "100%" },
      })}
    </View>
  );
});
export default LeafletMap;
