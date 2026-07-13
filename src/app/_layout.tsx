import Splash from "@/components/Splash";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { setupFonts } from "@/lib/setupFonts";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";

// Native: patch <Text> global -> Plus Jakarta Sans.
// Web: inject Google Fonts + CSS (tanpa fontfaceobserver).
setupFonts();
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Gate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <Splash />;
  return <>{children}</>;
}

export default function RootLayout() {
  // Native: muat 5 varian via expo-font. Web: {} (font sudah dari Google Fonts CSS).
  const [fontsLoaded] = useFonts(
    Platform.OS === "web"
      ? {}
      : {
          PlusJakartaSans_400Regular,
          PlusJakartaSans_500Medium,
          PlusJakartaSans_600SemiBold,
          PlusJakartaSans_700Bold,
          PlusJakartaSans_800ExtraBold,
        },
  );

  // Di web langsung siap; di native tunggu font selesai.
  const ready = Platform.OS === "web" ? true : fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <Splash />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0E7A5C" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </Gate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
