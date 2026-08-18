// Lihat penjelasan lengkap soal `.d.ts` untuk modul per-platform di
// `LeafletMap.d.ts`.
//
// Tipenya sengaja mengikuti `react-native-webview` karena itulah permukaan yang
// dipakai pemanggil, termasuk `react-native-render-html` yang menerima
// komponen ini lewat prop `WebView` dan mengetiknya persis seperti itu.
// Implementasi web hanyalah <iframe> dan pada praktiknya hanya menghormati
// `source.uri` dan `style`; prop lain diterima tanpa efek.
import { WebView } from "react-native-webview";

export { WebView };
export default WebView;
