import React from "react";
import { Platform, StyleSheet, Text } from "react-native";

// Map fontWeight -> varian Plus Jakarta Sans (dipakai di NATIVE).
const FAMILY: Record<string, string> = {
  "100": "PlusJakartaSans_400Regular",
  "200": "PlusJakartaSans_400Regular",
  "300": "PlusJakartaSans_400Regular",
  "400": "PlusJakartaSans_400Regular",
  "500": "PlusJakartaSans_500Medium",
  "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold",
  "800": "PlusJakartaSans_800ExtraBold",
  "900": "PlusJakartaSans_800ExtraBold",
  normal: "PlusJakartaSans_400Regular",
  bold: "PlusJakartaSans_700Bold",
};

let done = false;

/** Panggil sekali di root (_layout) sebelum render. */
export function setupFonts() {
  if (done) return;
  done = true;

  // --- WEB: react-native-web tidak bisa dipatch via Text.render.
  // Suntik Google Fonts + CSS global (kecualikan ikon vektor).
  if (Platform.OS === "web") {
    injectWebFonts();
    return;
  }

  // --- NATIVE (Android/iOS): override render <Text> global.
  const TextAny = Text as any;
  const originalRender = TextAny.render;
  if (typeof originalRender !== "function") return;

  TextAny.render = function render(...args: any[]) {
    const el = originalRender.apply(this, args);
    const flat = StyleSheet.flatten(el.props.style) || {};
    const weight = String(flat.fontWeight ?? "400");
    const fontFamily = FAMILY[weight] ?? FAMILY["400"];
    return React.cloneElement(el, {
      style: [el.props.style, { fontFamily, fontWeight: "normal" }],
    });
  };
}

function injectWebFonts() {
  if (typeof document === "undefined") return;

  // 1) Muat Plus Jakarta Sans (satu family, banyak bobot -> font-weight otomatis memilih varian)
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(link);

  // 2) Terapkan ke semua teks RNW (elemen <div dir> / input), KECUALIKAN ikon
  //    (@expo/vector-icons punya class r-fontFamily-* untuk font ikon).
  const style = document.createElement("style");
  // Tanpa !important: specificity tinggi mengalahkan reset RNW,
  // tapi tetap kalah dari font ikon (inline / class), jadi ikon aman.
  style.innerHTML = `
    html body div[dir]:not([class*="r-fontFamily"]),
    html body input, html body textarea, html body select, html body button {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont,
        'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);
}
