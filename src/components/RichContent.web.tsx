import { embedYouTubeInHtml } from "@/lib/youtube";
import React from "react";
import { View } from "react-native";

export default function RichContent({ html }: { html: string }) {
  return (
    <View>
      {React.createElement("div", {
        style: { fontSize: 15, lineHeight: "24px", color: "#334155" },
        dangerouslySetInnerHTML: { __html: embedYouTubeInHtml(html || "") },
      })}
    </View>
  );
}
