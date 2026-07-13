import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

export default function ChatFab() {
  return (
    <Pressable
      style={styles.fab}
      onPress={() => router.push("/chatbot" as Href)}
    >
      <Feather name="message-circle" size={24} color={colors.white} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
