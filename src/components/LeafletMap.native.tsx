import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { WebView } from "react-native-webview";
import { buildLeafletHtml, LeafletMarker } from "@/lib/leafletHtml";

export type LeafletMapHandle = { setView: (lat: number, lng: number, zoom?: number) => void };
export type LeafletMapProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: LeafletMarker[];
  pick?: boolean;
  onMarkerPress?: (id: string | number) => void;
  onMapPress?: (lat: number, lng: number) => void;
  style?: any;
};

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMapNative(props, ref) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const html = useRef(buildLeafletHtml({ center: props.center, zoom: props.zoom, pick: props.pick, markers: props.markers })).current;

  const post = (obj: any) => {
    const js = `window.__handle(${JSON.stringify(JSON.stringify(obj))}); true;`;
    webRef.current?.injectJavaScript(js);
  };

  useImperativeHandle(ref, () => ({ setView: (lat, lng, zoom) => post({ cmd: "setView", lat, lng, zoom }) }));

  useEffect(() => { if (ready.current) post({ cmd: "markers", list: props.markers ?? [] }); }, [props.markers]);
  useEffect(() => { if (ready.current) post({ cmd: "setView", lat: props.center.lat, lng: props.center.lng, zoom: props.zoom }); }, [props.center?.lat, props.center?.lng]);

  const onMessage = (e: any) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === "ready") {
        ready.current = true;
        post({ cmd: "markers", list: props.markers ?? [] });
      } else if (d.type === "marker") props.onMarkerPress?.(d.id);
      else if (d.type === "press") props.onMapPress?.(d.lat, d.lng);
    } catch {}
  };

  return (
    <WebView
      ref={webRef}
      source={{ html }}
      style={props.style}
      originWhitelist={["*"]}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
    />
  );
});
export default LeafletMap;
