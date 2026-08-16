import type { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { StatusPesanan } from "@/types/enums";

export type MetaStatusPesanan = {
  label: string;
  bg: string;
  fg: string;
  icon: keyof typeof Feather.glyphMap;
};

/** Rupa keenam status pesanan. Rujukan: API-DOCS.md §1.5. */
export const META_STATUS_PESANAN: Record<StatusPesanan, MetaStatusPesanan> = {
  menunggu_bayar: {
    label: "Belum dibayar",
    bg: "#FEF3C7",
    fg: "#B45309",
    icon: "clock",
  },
  dibayar: {
    label: "Sudah dibayar",
    bg: "#DBEAFE",
    fg: "#1D4ED8",
    icon: "check-circle",
  },
  dikemas: { label: "Dikemas", bg: "#EDE9FE", fg: "#6D28D9", icon: "package" },
  dikirim: { label: "Dikirim", bg: "#DBEAFE", fg: "#1D4ED8", icon: "truck" },
  selesai: { label: "Selesai", bg: "#DCF3EA", fg: colors.brand, icon: "check" },
  dibatalkan: {
    label: "Dibatalkan",
    bg: "#FEE2E2",
    fg: "#B91C1C",
    icon: "x-circle",
  },
};

export function metaStatusPesanan(status: string): MetaStatusPesanan {
  return (
    META_STATUS_PESANAN[status as StatusPesanan] ?? {
      label: status,
      bg: "#F1F5F9",
      fg: "#475569",
      icon: "circle",
    }
  );
}
