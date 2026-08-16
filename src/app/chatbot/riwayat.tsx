import { Feather } from "@expo/vector-icons";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "@/components/states/EmptyState";
import ErrorState from "@/components/states/ErrorState";
import LoadingState from "@/components/states/LoadingState";
import { colors, radius, spacing } from "@/constants/theme";
import { hapusSesiChat, sesiChat } from "@/lib/api/chatbot";
import { confirmDialog, notify } from "@/lib/dialog";
import type { SesiChat } from "@/types/chatbot";

const waktuRelatif = (iso: string) => {
  const selisih = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(selisih / 60000);
  if (menit < 1) return "Baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function RiwayatChatbot() {
  const qc = useQueryClient();

  const q = useInfiniteQuery({
    queryKey: ["chatbot", "daftar-sesi"],
    queryFn: ({ pageParam }) => sesiChat({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (h) =>
      h.meta.current_page < h.meta.last_page
        ? h.meta.current_page + 1
        : undefined,
  });

  const hapus = useMutation({
    mutationFn: (id: number) => hapusSesiChat(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chatbot", "daftar-sesi"] }),
    onError: () =>
      notify("Gagal", "Percakapan tidak dapat dihapus. Coba lagi sebentar."),
  });

  const daftar = q.data?.pages.flatMap((h) => h.data) ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.appbarTitle}>Riwayat Percakapan</Text>
        <Pressable
          onPress={() => router.replace("/chatbot" as Href)}
          hitSlop={10}
          style={{ marginLeft: "auto" }}
          accessibilityRole="button"
          accessibilityLabel="Mulai percakapan baru"
        >
          <Feather name="plus-circle" size={22} color={colors.brand} />
        </Pressable>
      </View>

      {q.isLoading ? (
        <LoadingState pesan="Memuat percakapan…" />
      ) : q.isError ? (
        <ErrorState error={q.error} onCobaLagi={() => q.refetch()} />
      ) : (
        <FlatList
          data={daftar}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={
            daftar.length === 0
              ? { flexGrow: 1 }
              : { padding: spacing.lg, paddingBottom: 30 }
          }
          renderItem={({ item }) => (
            <Kartu
              s={item}
              sedangHapus={hapus.isPending && hapus.variables === item.id}
              onHapus={async () => {
                const yakin = await confirmDialog(
                  "Hapus percakapan",
                  `"${item.judul}" akan dihapus permanen beserta seluruh pesannya.`,
                  "Hapus",
                );
                if (yakin) hapus.mutate(item.id);
              }}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              judul="Belum ada percakapan"
              pesan="Pertanyaan Anda ke asisten akan tersimpan di sini supaya bisa dibuka lagi kapan saja."
              aksiLabel="Mulai Bertanya"
              onAksi={() => router.replace("/chatbot" as Href)}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Kartu({
  s,
  sedangHapus,
  onHapus,
}: {
  s: SesiChat;
  sedangHapus: boolean;
  onHapus: () => void;
}) {
  return (
    <Pressable
      style={styles.kartu}
      onPress={() =>
        router.push({ pathname: "/chatbot", params: { sesi: String(s.id) } })
      }
      accessibilityRole="button"
      accessibilityLabel={`Buka percakapan ${s.judul}, ${waktuRelatif(s.updated_at ?? s.created_at)}`}
    >
      <View style={styles.ikon}>
        <Feather name="message-circle" size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.judul} numberOfLines={2}>
          {s.judul}
        </Text>
        <Text style={styles.waktu}>
          {waktuRelatif(s.updated_at ?? s.created_at)}
        </Text>
      </View>
      <Pressable
        onPress={(e) => {
          // Tanpa ini, ketukan pada ikon hapus menggelembung ke kartu induk di
          // web dan percakapannya justru terbuka.
          e?.stopPropagation?.();
          onHapus();
        }}
        hitSlop={8}
        style={styles.hapus}
        disabled={sedangHapus}
        accessibilityRole="button"
        accessibilityLabel={`Hapus percakapan ${s.judul}`}
        accessibilityState={{ disabled: sedangHapus }}
      >
        {sedangHapus ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Feather name="trash-2" size={17} color={colors.danger} />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EEF3F1" },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  appbarTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  kartu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  ikon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCF3EA",
    alignItems: "center",
    justifyContent: "center",
  },
  judul: { fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 20 },
  waktu: { fontSize: 12, color: colors.subtext, marginTop: 4 },
  hapus: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
