import { colors, radius, spacing } from "@/constants/theme";
import { gantiJudulChat, getChatRiwayat, hapusChat } from "@/lib/api";
import { confirmDialog, notify } from "@/lib/dialog";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function dayLabel(iso: string) {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  if (ts >= startToday) return "Hari Ini";
  if (ts >= startToday - 86400000) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Riwayat() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["chat-riwayat"],
    queryFn: getChatRiwayat,
  });
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ["chat-riwayat"] });
    }, []),
  );

  const convos: any[] = Array.isArray(data) ? data : (data?.data ?? []);
  const filtered = convos.filter(
    (c) =>
      c.title?.toLowerCase().includes(q.toLowerCase()) ||
      c.cuplikan?.toLowerCase().includes(q.toLowerCase()),
  );

  type Row = { type: "header"; label: string } | { type: "item"; c: any };
  const rows: Row[] = [];
  let last = "";
  for (const c of filtered) {
    const l = dayLabel(c.updated_at);
    if (l !== last) {
      rows.push({ type: "header", label: l });
      last = l;
    }
    rows.push({ type: "item", c });
  }

  const konfirmasiHapus = (id: number, title: string) =>
    (async () => {
      const ok = await confirmDialog(
        "Hapus Percakapan",
        `Hapus "${title}"? Tindakan ini tidak bisa dibatalkan.`,
        "Hapus",
      );
      if (!ok) return;
      try {
        await hapusChat(id);
        qc.invalidateQueries({ queryKey: ["chat-riwayat"] });
      } catch {
        notify("Gagal", "Tidak dapat menghapus percakapan.");
      }
    })();

  const bukaRename = (id: number, title: string) => {
    setRenameId(id);
    setRenameText(title);
  };
  const simpanRename = async () => {
    if (!renameId || !renameText.trim()) return;
    setSaving(true);
    try {
      await gantiJudulChat(renameId, renameText.trim());
      qc.invalidateQueries({ queryKey: ["chat-riwayat"] });
      setRenameId(null);
    } catch {
      notify("Gagal", "Tidak dapat mengubah judul. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Riwayat Chatbot</Text>
      </View>
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={colors.subtext} />
        <TextInput
          style={styles.search}
          placeholder="Cari percakapan..."
          placeholderTextColor="#9AA5B1"
          value={q}
          onChangeText={setQ}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Feather name="wifi-off" size={30} color={colors.subtext} />
          <Text style={styles.emptyText}>Gagal memuat riwayat.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => refetch()}>
            <Text style={styles.emptyBtnText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) =>
            r.type === "header" ? `h-${r.label}-${i}` : `c-${r.c.id}`
          }
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text style={styles.dateLabel}>{item.label}</Text>
            ) : (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/chatbot",
                    params: { id: item.c.id },
                  })
                }
              >
                <View style={styles.cardBot}>
                  <Feather
                    name="message-circle"
                    size={20}
                    color={colors.white}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.c.title}
                    </Text>
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => bukaRename(item.c.id, item.c.title)}
                        hitSlop={8}
                      >
                        <Feather
                          name="edit-2"
                          size={15}
                          color={colors.subtext}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => konfirmasiHapus(item.c.id, item.c.title)}
                        hitSlop={8}
                      >
                        <Feather
                          name="trash-2"
                          size={15}
                          color={colors.danger}
                        />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.cardSnippet} numberOfLines={2}>
                    {item.c.cuplikan}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Feather
                      name="message-square"
                      size={12}
                      color={colors.subtext}
                    />
                    <Text style={styles.metaText}>
                      {item.c.jumlah_pesan} pesan
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>
                      {hhmm(item.c.updated_at)}
                    </Text>
                    <Text style={styles.lihat}>Lihat Detail</Text>
                  </View>
                </View>
              </Pressable>
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="message-square" size={30} color={colors.brand} />
              </View>
              <Text style={styles.emptyText}>Belum ada percakapan</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push("/chatbot")}
              >
                <Text style={styles.emptyBtnText}>Mulai Percakapan Baru</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <View style={styles.total}>
                <Text style={styles.totalLabel}>Total Percakapan</Text>
                <Text style={styles.totalValue}>
                  {filtered.length} percakapan
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push("/chatbot")}>
        <Feather name="message-circle" size={24} color={colors.white} />
      </Pressable>

      {/* Modal ubah judul */}
      <Modal
        visible={renameId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameId(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenameId(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Ubah Judul</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Judul percakapan"
              placeholderTextColor="#9AA5B1"
              autoFocus
              maxLength={100}
            />
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setRenameId(null)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalSave,
                  (!renameText.trim() || saving) && { opacity: 0.6 },
                ]}
                onPress={simpanRename}
                disabled={!renameText.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  search: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    color: colors.text,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 14,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardBot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginRight: 8,
  },
  cardActions: { flexDirection: "row", gap: 14 },
  cardSnippet: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  metaText: { fontSize: 12, color: colors.subtext },
  metaDot: { color: colors.subtext, marginHorizontal: 2 },
  lihat: {
    marginLeft: "auto",
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
  },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30, gap: 4 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DCEFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.brand,
    fontSize: 15,
    marginTop: 16,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: colors.white, fontWeight: "700" },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 8,
  },
  totalLabel: { color: colors.brand, fontWeight: "600" },
  totalValue: { color: colors.text, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 18 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: { backgroundColor: "#F1F5F9" },
  modalCancelText: { color: colors.text, fontWeight: "700" },
  modalSave: { backgroundColor: colors.brand },
  modalSaveText: { color: "#fff", fontWeight: "700" },
});
