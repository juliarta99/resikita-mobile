import TypingDots from "@/components/TypingDots";
import { colors, radius, spacing } from "@/constants/theme";
import { chat, gantiJudulChat, getChatDetail } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type Msg = { role: "user" | "model"; text: string; at: number };

const GREETING =
  "Halo! Saya Chatbot Niti Resik. Saya bisa bantu soal pemilahan sampah, daur ulang, kompos, bank sampah, dan tips ramah lingkungan. Ada yang ingin ditanyakan?";
const greeting = (): Msg => ({ role: "model", text: GREETING, at: Date.now() });

// Kumpulan pertanyaan pembuka (umum, tanpa berbasis lokasi seperti "TPS/UMKM terdekat")
const QUESTION_POOL = [
  "Cara bikin kompos dari sampah rumah?",
  "Apa itu sampah B3?",
  "Bagaimana memilah sampah dengan benar?",
  "Cara mengurangi sampah plastik?",
  "Apa manfaat daur ulang?",
  "Bagaimana cara menabung di bank sampah?",
  "Apa itu ekonomi sirkular?",
  "Sampah apa saja yang bisa didaur ulang?",
  "Tips mengurangi sampah makanan?",
  "Bagaimana mengolah sampah organik?",
  "Beda sampah organik dan anorganik?",
  "Cara membuat ecobrick?",
  "Kenapa memilah sampah itu penting?",
  "Bagaimana cara daur ulang botol plastik?",
  "Apa yang termasuk sampah residu?",
];
const pickChips = () =>
  [...QUESTION_POOL].sort(() => Math.random() - 0.5).slice(0, 4);

export default function Chatbot() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [convoId, setConvoId] = useState<number | null>(id ? Number(id) : null);
  const [messages, setMessages] = useState<Msg[]>([greeting()]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<string[]>(pickChips);
  const listRef = useRef<FlatList>(null);
  const qc = useQueryClient();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  // Layar ini TIDAK memakai <BottomBar>: bar bawahnya berupa input +
  // disclaimer yang menyatu dengan latar body, bukan tombol CTA berlatar
  // putih. Jadi ruang nav bar HP disuntik langsung ke elemen terbawah.
  const insets = useSafeAreaInsets();

  const simpanRename = async () => {
    if (!convoId || !renameText.trim()) return;
    setSavingRename(true);
    try {
      await gantiJudulChat(convoId, renameText.trim());
      qc.invalidateQueries({ queryKey: ["chat-riwayat"] });
      setRenameOpen(false);
    } catch {
      Alert.alert("Gagal", "Tidak dapat mengubah judul. Coba lagi.");
    } finally {
      setSavingRename(false);
    }
  };

  useEffect(() => {
    if (id)
      getChatDetail(id)
        .then((d) => setMessages([greeting(), ...normalizeLoaded(d?.messages)]))
        .catch(() => {});
  }, [id]);

  useEffect(() => {
    const t = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(t);
  }, [messages.length, typing]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: t, at: Date.now() }]);
    setTyping(true);
    try {
      const res = await chat(t, { conversation_id: convoId });
      if (res.conversation_id) setConvoId(res.conversation_id);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: res.balasan, at: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Maaf, terjadi gangguan. Silakan coba lagi.",
          at: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const newChat = () => {
    setMessages([greeting()]);
    setConvoId(null);
    setChips(pickChips()); // acak ulang pertanyaan
  };

  const showChips = messages.length === 1 && !typing;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/")} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.botAvatar}>
          <Feather name="message-circle" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.botName}>Chatbot Niti Resik</Text>
          <Text style={styles.botSub}>Asisten Virtual Anda</Text>
        </View>
        {convoId && (
          <Pressable
            onPress={() => {
              setRenameText("");
              setRenameOpen(true);
            }}
            hitSlop={10}
            style={{ marginRight: 16 }}
          >
            <Feather name="edit-2" size={21} color={colors.white} />
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push("/chatbot/riwayat")}
          hitSlop={10}
          style={{ marginRight: 16 }}
        >
          <Feather name="clock" size={22} color={colors.white} />
        </Pressable>
        <Pressable onPress={newChat} hitSlop={10}>
          <Feather name="plus" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 8 }}
            renderItem={({ item }) => <Bubble msg={item} />}
            ListFooterComponent={
              <>
                {typing && (
                  <View style={{ marginLeft: 40, marginTop: 4 }}>
                    <TypingDots />
                  </View>
                )}
                {showChips && (
                  <View style={styles.chips}>
                    {chips.map((c) => (
                      <Pressable
                        key={c}
                        style={styles.chip}
                        onPress={() => send(c)}
                      >
                        <Text style={styles.chipText}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            }
          />

          {/* Input bar — hanya teks (tanpa voice) */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ketik pertanyaan Anda..."
              placeholderTextColor="#9AA5B1"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              multiline
            />
            <Pressable
              style={[
                styles.send,
                (!input.trim() || typing) && { opacity: 0.5 },
              ]}
              onPress={() => send(input)}
              // dulu hanya tampak redup tapi tetap bisa ditekan
              disabled={!input.trim() || typing}
            >
              <Feather name="send" size={18} color={colors.white} />
            </Pressable>
          </View>

          {/* Elemen terbawah: padding bawah = 8 + tinggi nav bar HP */}
          <Text
            style={[styles.disclaimer, { paddingBottom: 8 + insets.bottom }]}
          >
            Chatbot dapat memberikan informasi yang tidak akurat. Verifikasi
            jawaban penting.
          </Text>
        </KeyboardAvoidingView>
      </View>

      {/* Modal ubah judul percakapan */}
      <Modal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenameOpen(false)}>
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
                onPress={() => setRenameOpen(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalSave,
                  (!renameText.trim() || savingRename) && { opacity: 0.6 },
                ]}
                onPress={simpanRename}
                disabled={!renameText.trim() || savingRename}
              >
                {savingRename ? (
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

// Rapikan pesan tersimpan (data lama bisa tak punya `at` valid / text kosong / role beda)
function normalizeLoaded(raw: any): Msg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === "object")
    .map((m: any): Msg => {
      const role: "user" | "model" = m.role === "user" ? "user" : "model";
      const text = String(m.text ?? m.content ?? m.message ?? "").trim();
      let at = Number(m.at ?? m.timestamp ?? m.created_at);
      if (!Number.isFinite(at)) at = NaN;
      else if (at > 0 && at < 1e12) at = at * 1000; // detik -> ms
      return { role, text, at };
    })
    .filter((m) => m.text.length > 0);
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const time = Number.isFinite(msg.at)
    ? new Date(msg.at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <View style={[styles.msgRow, isUser && { justifyContent: "flex-end" }]}>
      {!isUser && (
        <View style={styles.smallBot}>
          <Feather name="message-circle" size={16} color={colors.white} />
        </View>
      )}
      <View style={{ maxWidth: "80%" }}>
        <View
          style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}
        >
          {isUser ? (
            <Text style={[styles.bubbleText, { color: colors.white }]}>
              {msg.text}
            </Text>
          ) : (
            <FormattedText text={msg.text} />
          )}
        </View>
        {time !== "" && (
          <Text style={[styles.time, isUser && { textAlign: "right" }]}>
            {time}
          </Text>
        )}
      </View>
      {isUser && (
        <View style={styles.smallUser}>
          <Feather name="user" size={16} color={colors.subtext} />
        </View>
      )}
    </View>
  );
}

/* ---------- Perapi balasan: bullet / nomor / tebal, buang artefak markdown ---------- */
function inlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    return m ? (
      <Text key={keyPrefix + i} style={styles.bold}>
        {m[1]}
      </Text>
    ) : (
      <Text key={keyPrefix + i}>{p}</Text>
    );
  });
}

function FormattedText({ text }: { text: string }) {
  const clean = (text || "")
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "") // buang heading markdown (#)
    .replace(/`{1,3}/g, "") // buang backtick kode
    .replace(/\n{3,}/g, "\n\n") // rapikan baris kosong berlebih
    .trim();

  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      nodes.push(<View key={"sp" + idx} style={{ height: 6 }} />);
      return;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);

    if (bullet) {
      nodes.push(
        <View key={idx} style={styles.liRow}>
          <Text style={styles.liDot}>•</Text>
          <Text style={styles.liText}>{inlineBold(bullet[1], idx + "-")}</Text>
        </View>,
      );
    } else if (numbered) {
      nodes.push(
        <View key={idx} style={styles.liRow}>
          <Text style={styles.liNum}>{numbered[1]}.</Text>
          <Text style={styles.liText}>
            {inlineBold(numbered[2], idx + "-")}
          </Text>
        </View>,
      );
    } else {
      nodes.push(
        <Text key={idx} style={styles.para}>
          {inlineBold(line, idx + "-")}
        </Text>,
      );
    }
  });

  return <View>{nodes}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white15,
    alignItems: "center",
    justifyContent: "center",
  },
  botName: { color: colors.white, fontSize: 17, fontWeight: "700" },
  botSub: { color: colors.white70, fontSize: 12 },
  body: {
    flex: 1,
    backgroundColor: "#EEF3F1",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  smallBot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  smallUser: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { padding: 14, borderRadius: 16 },
  bubbleBot: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUser: { backgroundColor: colors.brand, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20, color: colors.text },
  para: { fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: 2 },
  bold: { fontWeight: "700", color: colors.text },
  liRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 2,
    alignItems: "flex-start",
  },
  liDot: { color: colors.brand, fontSize: 15, lineHeight: 21 },
  liNum: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 21,
  },
  liText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
  time: { fontSize: 11, color: "#94A3B8", marginTop: 4, marginHorizontal: 4 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginLeft: 40,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#BFE3D5",
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: colors.brand, fontSize: 13, fontWeight: "500" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.text,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    textAlign: "center",
    color: colors.subtext,
    fontSize: 11,
    paddingTop: 8,
    // paddingBottom disuntik dari insets di komponen
    paddingHorizontal: 20,
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
