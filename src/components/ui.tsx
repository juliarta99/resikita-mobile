import { colors, radius, spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "white" | "outline";
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};
export function Button({
  label,
  onPress,
  variant = "solid",
  icon,
  loading,
  disabled,
  style,
}: BtnProps) {
  const isSolid = variant === "solid";
  const isWhite = variant === "white";
  const bg = disabled
    ? colors.muted
    : isSolid
      ? colors.brand
      : isWhite
        ? colors.white
        : "transparent";
  const fg = isSolid ? colors.white : isWhite ? colors.brand : colors.white;
  const border =
    variant === "outline"
      ? { borderWidth: 1.5, borderColor: colors.white15 }
      : null;
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed ? 0.9 : 1 },
        border as any,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon && (
            <Feather
              name={icon}
              size={18}
              color={fg}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label?: string;
  required?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
};
export function Field({
  label,
  required,
  icon,
  error,
  rightIcon,
  onRightPress,
  style,
  ...rest
}: FieldProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrap,
          error ? { borderColor: colors.danger } : null,
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={colors.subtext}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          placeholderTextColor="#9AA5B1"
          style={[styles.input, style]}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightPress} hitSlop={8}>
            <Feather name={rightIcon} size={18} color={colors.subtext} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.err}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  err: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
