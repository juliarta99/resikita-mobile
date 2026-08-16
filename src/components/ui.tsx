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
  const border: ViewStyle | null =
    variant === "outline"
      ? { borderWidth: 1.5, borderColor: colors.white15 }
      : null;
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed ? 0.9 : 1 },
        border,
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

/**
 * Pembungkus satu baris formulir: label, isi, dan pesan galatnya.
 *
 * Dipakai `Field` di bawah, dan bisa dipakai langsung untuk kontrol yang bukan
 * `TextInput` — pemilih kategori, pemilih wilayah, daftar kurir. Sebelumnya
 * kontrol semacam itu tidak punya cara menandai dirinya salah sama sekali,
 * sehingga galatnya selalu terdampar di pesan umum di atas tombol kirim.
 */
export function Bidang({
  label,
  required,
  error,
  hint,
  children,
  style,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {!!label && (
        <Text style={[styles.label, !!error && { color: colors.danger }]}>
          {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
        </Text>
      )}
      {children}
      {!!error ? (
        <Text
          style={styles.err}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label?: string;
  required?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  error?: string;
  /** Penjelasan kecil di bawah input; disembunyikan saat ada galat. */
  hint?: string;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
};
export function Field({
  label,
  required,
  icon,
  error,
  hint,
  rightIcon,
  onRightPress,
  style,
  ...rest
}: FieldProps) {
  return (
    <Bidang label={label} required={required} error={error} hint={hint}>
      <View
        style={[
          styles.inputWrap,
          !!error && { borderColor: colors.danger, backgroundColor: "#FEF2F2" },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={error ? colors.danger : colors.subtext}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          placeholderTextColor="#9AA5B1"
          style={[styles.input, style]}
          accessibilityState={{ disabled: rest.editable === false }}
          {...rest}
        />
        {rightIcon && (
          <Pressable onPress={onRightPress} hitSlop={8}>
            <Feather name={rightIcon} size={18} color={colors.subtext} />
          </Pressable>
        )}
      </View>
    </Bidang>
  );
}

/**
 * Pesan galat yang tidak menunjuk satu field tertentu.
 *
 * Tempatnya di **atas** formulir, bukan menempel di atas tombol kirim: pada
 * formulir yang panjang, pesan di bawah muncul di luar layar tepat ketika
 * pengguna menekan tombolnya, dan kegagalannya terasa seperti tombol yang tidak
 * berfungsi. Yang di sini hanya untuk galat jaringan, `403`, dan pelanggaran
 * aturan bisnis — galat per field ditempelkan di bawah inputnya sendiri.
 */
export function PesanGalat({
  pesan,
  style,
}: {
  pesan?: string;
  style?: ViewStyle;
}) {
  if (!pesan) return null;
  return (
    <View
      style={[styles.banner, style]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Feather name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.bannerTeks}>{pesan}</Text>
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
  err: { color: colors.danger, fontSize: 12, marginTop: 6, lineHeight: 17 },
  hint: { color: colors.subtext, fontSize: 12, marginTop: 6, lineHeight: 17 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
  },
  bannerTeks: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 19,
  },
});
