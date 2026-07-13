import WebView from "@/components/PlatformWebView";
import { colors } from "@/constants/theme";
import { embedYouTubeInHtml } from "@/lib/youtube";
import IframeRenderer, { iframeModel } from "@native-html/iframe-plugin";
import { useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";

const renderers = { iframe: IframeRenderer };
const customHTMLElementModels = { iframe: iframeModel };

export default function RichContent({ html }: { html: string }) {
  const { width } = useWindowDimensions();
  return (
    <RenderHtml
      contentWidth={width - 40}
      source={{ html: embedYouTubeInHtml(html || "") }}
      renderers={renderers}
      WebView={WebView}
      customHTMLElementModels={customHTMLElementModels}
      defaultWebViewProps={{ allowsFullscreenVideo: true }}
      tagsStyles={{
        body: { color: colors.text, fontSize: 15, lineHeight: 24 },
        p: { marginBottom: 14, color: "#334155", fontSize: 15, lineHeight: 24 },
        h1: {
          fontSize: 20,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 10,
        },
        h2: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.text,
          marginTop: 10,
          marginBottom: 8,
        },
        h3: {
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
          marginTop: 8,
          marginBottom: 6,
        },
        ul: { marginBottom: 12 },
        ol: { marginBottom: 12 },
        li: { color: "#334155", fontSize: 15, lineHeight: 24, marginBottom: 6 },
        a: { color: colors.brand, textDecorationLine: "none" },
        strong: { fontWeight: "700", color: colors.text },
        img: { borderRadius: 12, marginVertical: 10 },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: colors.brand,
          paddingLeft: 12,
          marginVertical: 10,
          color: "#475569",
        },
        iframe: { borderRadius: 12, marginVertical: 12 },
      }}
    />
  );
}
