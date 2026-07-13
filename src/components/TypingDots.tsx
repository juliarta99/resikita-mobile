import { colors } from "@/constants/theme";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(700 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <Animated.View
      style={[styles.dot, { opacity, transform: [{ translateY }] }]}
    />
  );
}

export default function TypingDots() {
  return (
    <View style={styles.bubble}>
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    alignSelf: "flex-start",
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#94A3B8" },
});
