import type { StyleProp, ViewStyle } from "react-native";
import type { LeafletMarker } from "@/lib/leafletHtml";

export type { LeafletMarker };

export type LeafletMapHandle = {
  setView: (lat: number, lng: number, zoom?: number) => void;
};

export type LeafletMapProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: LeafletMarker[];
  pick?: boolean;
  onMarkerPress?: (id: string | number) => void;
  onMapPress?: (lat: number, lng: number) => void;
  style?: StyleProp<ViewStyle>;
};
