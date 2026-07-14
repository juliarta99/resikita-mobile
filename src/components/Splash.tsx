import { colors } from "@/constants/theme";
import { Image, StyleSheet, Text, View } from "react-native";

export default function Splash() {
  return (
    <View style={styles.wrap}>
      <Image
        source={require("@/assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Niti Resik</Text>
      <Text style={styles.sub}>Bersama Wujudkan Bumi Bersih</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 90, height: 90 },
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
