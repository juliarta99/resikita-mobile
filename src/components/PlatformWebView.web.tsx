import React from "react";
import { View } from "react-native";

// Fallback web: react-native-webview -> <iframe> asli (justru berjalan di browser).
type Props = { source?: { uri?: string }; style?: any };

function WebView({ source, style }: Props) {
  return (
    <View style={style}>
      {React.createElement("iframe", {
        src: source?.uri,
        style: { border: "0", width: "100%", height: "100%" },
        allow: "fullscreen; autoplay; encrypted-media",
        allowFullScreen: true,
      })}
    </View>
  );
}
export { WebView };
export default WebView;
