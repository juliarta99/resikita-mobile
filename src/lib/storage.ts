import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Storage token lintas-platform:
// - Android/iOS  -> expo-secure-store (aman, terenkripsi)
// - Web          -> localStorage (SecureStore tidak tersedia di web)
const isWeb = Platform.OS === "web";
const hasLS = () => typeof window !== "undefined" && !!window.localStorage;

export const storage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return hasLS() ? window.localStorage.getItem(key) : null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      if (hasLS()) window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      if (hasLS()) window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
