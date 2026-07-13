import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
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

const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMapWeb(props, ref) {
  const iframeRef = useRef<any>(null);
  const ready = useRef(false);
  const html = useRef(buildLeafletHtml({ center: props.center, zoom: props.zoom, pick: props.pick, markers: props.markers })).current;

  const post = (obj: any) => iframeRef.current?.contentWindow?.postMessage(JSON.stringify(obj), "*");

  useImperativeHandle(ref, () => ({ setView: (lat, lng, zoom) => post({ cmd: "setView", lat, lng, zoom }) }));

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "ready") { ready.current = true; post({ cmd: "markers", list: props.markers ?? [] }); }
        else if (d.type === "marker") props.onMarkerPress?.(d.id);
        else if (d.type === "press") props.onMapPress?.(d.lat, d.lng);
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
