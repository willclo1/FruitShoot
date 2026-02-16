import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // ✅ Re-check token whenever the route changes (and nav is ready)
  useEffect(() => {
    if (!navState?.key) return;

    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      setHasToken(!!token);
      setAuthChecked(true);
    })();
  }, [navState?.key, segments.join("/")]);

  // ✅ Redirect only after auth has been checked
  useEffect(() => {
    if (!navState?.key) return;
    if (!authChecked) return;

    const inTabs = segments[0] === "(tabs)";
    const onLogin = segments[0] === "login";

    if (!hasToken && inTabs) router.replace("/login");
    if (hasToken && onLogin) router.replace("/(tabs)");
  }, [navState?.key, authChecked, hasToken, segments.join("/")]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}