import { colors } from "@/constants/theme";

export type Tipe = "artikel" | "panduan" | "tutorial" | "jurnal";
export function tipeMeta(tipe: string): {
  label: string;
  bg: string;
  fg: string;
  icon: any;
} {
  switch (tipe) {
    case "panduan":
      return {
        label: "Panduan",
        bg: colors.brand,
        fg: "#fff",
        icon: "book-open",
      };
    case "tutorial":
      return { label: "Tutorial", bg: "#8B5CF6", fg: "#fff", icon: "video" };
    case "jurnal":
      return { label: "Jurnal", bg: "#6366F1", fg: "#fff", icon: "file-text" };
    default:
      return { label: "Artikel", bg: "#3B82F6", fg: "#fff", icon: "file" };
  }
}
