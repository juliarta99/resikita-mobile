import { colors } from "@/constants/theme";

export function katColor(kategori: string): { bg: string; fg: string } {
  switch (kategori) {
    case "organik":
      return { bg: "#16A34A", fg: "#FFFFFF" };
    case "anorganik":
      return { bg: colors.brand, fg: "#FFFFFF" };
    case "b3":
      return { bg: "#EF4444", fg: "#FFFFFF" };
    case "residu":
      return { bg: "#64748B", fg: "#FFFFFF" };
    default:
      return { bg: "#94A3B8", fg: "#FFFFFF" };
  }
}
