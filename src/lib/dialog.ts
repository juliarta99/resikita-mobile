import { Alert, Platform } from "react-native";

/** Konfirmasi ya/tidak. Di web pakai window.confirm (Alert.alert tidak menampilkan tombol di web). */
export function confirmDialog(
  title: string,
  message: string,
  konfirmLabel = "Ya",
): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok =
      typeof window !== "undefined"
        ? window.confirm(`${title}\n\n${message}`)
        : false;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel", onPress: () => resolve(false) },
      {
        text: konfirmLabel,
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Notifikasi sederhana (web pakai window.alert). */
export function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}
