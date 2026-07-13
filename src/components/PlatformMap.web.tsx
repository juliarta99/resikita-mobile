import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Fallback web: react-native-maps tidak berjalan di web.
export const PROVIDER_GOOGLE = undefined as any;
export function Marker(_props: any) {
  return null;
}

const MapView = React.forwardRef<any, any>(function MapViewWeb({ style, children }, ref) {
  React.useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    fitToCoordinates: () => {},
  }));
  return (
    <View style={[styles.map, style]}>
      <Text style={styles.txt}>Peta interaktif hanya tersedia di aplikasi Android/iOS.</Text>
      {children}
    </View>
  );
});
export default MapView;

const styles = StyleSheet.create({
  map: { minHeight: 180, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  txt: { color: "#64748B", fontSize: 13, textAlign: "center", padding: 20 },
});
