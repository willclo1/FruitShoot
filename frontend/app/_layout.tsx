// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthed, subscribeAuthed } from "@/services/authState";

const LOGIN_ROUTE = "/login";
const TABS_ROUTE = "/(tabs)";

const LOGIN_REDIRECT_DELAY_MS = 250;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const loginRedirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (!navState?.key) return;

    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      const authed = !!token;
      setHasToken(authed);
      setAuthed(authed);
      setAuthChecked(true);
    })();
  }, [navState?.key]);

  useEffect(() => {
    const unsub = subscribeAuthed((authed) => {
      setHasToken(authed);
      setAuthChecked(true);

      if (authed && loginRedirectTimer.current) {
        clearTimeout(loginRedirectTimer.current);
        loginRedirectTimer.current = null;
      }
    });

    return unsub;
  }, []);


  useEffect(() => {
    return () => {
      if (loginRedirectTimer.current) {
        clearTimeout(loginRedirectTimer.current);
        loginRedirectTimer.current = null;
      }
    };
  }, []);


  useEffect(() => {
    if (!navState?.key) return;
    if (!authChecked) return;

    const inTabs = segments[0] === "(tabs)";
    const onAuthScreen = segments[0] === "login" || segments[0] === "register";

    if (!hasToken && inTabs) {

      if (loginRedirectTimer.current) return;

      loginRedirectTimer.current = setTimeout(async () => {
        loginRedirectTimer.current = null;

        const token = await SecureStore.getItemAsync("access_token");
        const authed = !!token;

        if (!authed) {
          router.replace(LOGIN_ROUTE);
        } else {
          setHasToken(true);
          setAuthed(true);
        }
      }, LOGIN_REDIRECT_DELAY_MS);

      return;
    }


    if (hasToken && onAuthScreen) {

      if (loginRedirectTimer.current) {
        clearTimeout(loginRedirectTimer.current);
        loginRedirectTimer.current = null;
      }
      router.replace(TABS_ROUTE);
      return;
    }


    if (!inTabs && loginRedirectTimer.current) {
      clearTimeout(loginRedirectTimer.current);
      loginRedirectTimer.current = null;
    }
  }, [navState?.key, authChecked, hasToken, segments.join("/")]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}