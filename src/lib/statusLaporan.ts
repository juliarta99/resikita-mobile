import type { Feather } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import type { AlasanRouting, StatusLaporan } from "@/types/enums";

export type MetaStatus = {
  label: string;
  bg: string;
  fg: string;
  icon: keyof typeof Feather.glyphMap;
};

/**
 * Rupa ketujuh status laporan.
 *
 * Versi sebelumnya menangani `menunggu` dan `proses` — dua nilai yang tidak ada
 * di enum manapun — sementara `dikerjakan` dan `digabung` yang benar-benar
 * dikirim peladen jatuh ke cadangan tanpa label. Akibatnya pelapor melihat kata
 * mentah `dikerjakan` di layar, dan penyaring "Diproses" melewatkan justru
 * laporan yang sedang dikerjakan.
 */
export const META_STATUS: Record<StatusLaporan, MetaStatus> = {
  baru: { label: "Baru masuk", bg: "#F1F5F9", fg: "#475569", icon: "clock" },
  diverifikasi: {
    label: "Diverifikasi",
    bg: "#DBEAFE",
    fg: "#1D4ED8",
    icon: "check-circle",
  },
  ditugaskan: {
    label: "Ditugaskan",
    bg: "#FEF3C7",
    fg: "#B45309",
    icon: "user-check",
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    bg: "#FEF3C7",
    fg: "#B45309",
    icon: "tool",
  },
  selesai: { label: "Selesai", bg: "#DCF3EA", fg: colors.brand, icon: "check" },
  ditolak: { label: "Ditolak", bg: "#FEE2E2", fg: "#B91C1C", icon: "x-circle" },
  digabung: {
    label: "Digabung",
    bg: "#EDE9FE",
    fg: "#6D28D9",
    icon: "git-merge",
  },
};

export function metaStatus(status: string): MetaStatus {
  return (
    META_STATUS[status as StatusLaporan] ?? {
      label: status,
      bg: "#F1F5F9",
      fg: "#475569",
      icon: "circle",
    }
  );
}

/** Status yang berarti laporan sudah ditangani seseorang, tapi belum tuntas. */
export const STATUS_BERJALAN: StatusLaporan[] = [
  "diverifikasi",
  "ditugaskan",
  "dikerjakan",
];

/**
 * Penjelasan tambahan untuk `wilayah_belum_terjangkau`.
 *
 * Alasan routing lainnya sudah dijelaskan `pesan_routing` dari peladen dan
 * cukup ditampilkan apa adanya. Yang satu ini butuh konteks lebih: pelapor
 * perlu tahu laporannya tidak hilang, hanya menempuh jalur yang berbeda.
 */
export function catatanRouting(alasan: AlasanRouting): string | null {
  if (alasan !== "wilayah_belum_terjangkau") return null;
  return "Pemerintah wilayah ini belum bergabung di Resikita. Laporan Anda diteruskan Fasilitator Wilayah ke dinas setempat.";
}
