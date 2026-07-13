import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function Splash() {
  return (
    <View style={styles.wrap}>
      <Feather name="feather" size={72} color={colors.white} />
      <Text style={styles.title}>Niti Resik</Text>
      <Text style={styles.sub}>Ekonomi Sirkular untuk Bumi Bersih</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 16,
  },
  sub: { color: colors.white70, fontSize: 14, marginTop: 6 },
});
