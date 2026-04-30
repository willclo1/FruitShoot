import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SettingsProvider, useSettings } from "@/services/settingsContext";
import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { BackHandler, Dimensions } from "react-native";
import { setAuthed, subscribeAuthed } from "@/services/authState";
import { useFonts } from "expo-font";
import DisclosureModal from "@/components/disclosureModal";
import SplashScreen from "@/components/splash-screen";
import CopilotTooltip from "@/components/tutorial/CopilotTooltip";
import { TutorialProvider } from "@/services/tutorialContext";
import { CopilotProvider } from "react-native-copilot";
import GlobalTtsControl from "@/components/GlobalTtsControl";

const LOGIN_ROUTE = "/login";
const TABS_ROUTE = "/(tabs)";
const LOGIN_REDIRECT_DELAY_MS = 250;
const DEFAULT_MIN_SPLASH_DURATION_MS = 2200;

/**
 * RootContent: Inner component that uses SettingsProvider context
 * This wrapper allows us to access useSettings() hook for reduceMotion setting
 * and render the SplashScreen with the correct accessibility configuration
 */
function RootContent() {
  const { settings } = useSettings();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  // Keep splash mounted while fading; visibility controls opacity animation.
  const [splashMounted, setSplashMounted] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    "Atkinson-Regular": require("../assets/images/fonts/TTF/Atkinson-Hyperlegible-Regular-102.ttf"),
    "Atkinson-Bold": require("../assets/images/fonts/TTF/Atkinson-Hyperlegible-Bold-102.ttf"),
    "Atkinson-Italic": require("../assets/images/fonts/TTF/Atkinson-Hyperlegible-Italic-102.ttf"),
    "Atkinson-BoldItalic": require("../assets/images/fonts/TTF/Atkinson-Hyperlegible-BoldItalic-102.ttf"),
  });

  const loginRedirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Handle splash screen hiding
   * Called by SplashScreen component after fade-out animation completes
   */
  const handleSplashHide = () => {
    if (splashMounted) {
      setSplashMounted(false);
    }
  };

  /**
   * Track app readiness from auth initialization.
   */
  useEffect(() => {
    if (authChecked) {
      setAppReady(true);
    }
  }, [authChecked]);

  /**
   * Keep splash visible long enough to be perceived on Expo Go.
   */
  useEffect(() => {
    const minDuration =
      settings.splashMinDurationMs > 0
        ? settings.splashMinDurationMs
        : DEFAULT_MIN_SPLASH_DURATION_MS;

    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [settings.splashMinDurationMs]);

  /**
   * Start splash fade-out only after both conditions are met:
   * 1) minimum splash duration elapsed
   * 2) app is ready
   */
  useEffect(() => {
    if (minSplashElapsed && appReady) {
      setSplashVisible(false);
    }
  }, [minSplashElapsed, appReady]);

  // Check token + whether to show disclosure
  useEffect(() => {
    if (!navState?.key) return;

    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      const authed = !!token;
      setHasToken(authed);
      setAuthed(authed);
      setAuthChecked(true); // Triggers splash fade-out via effect above

      // Only show disclosure if user is NOT logged in
      if (!authed) {
        setShowDisclosure(true);
      }
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

  const onAcceptDisclosure = () => {
    setShowDisclosure(false);
  };

  const onDeclineDisclosure = () => {
    BackHandler.exitApp();
  };

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <CopilotProvider
        overlay="svg"
        tooltipComponent={CopilotTooltip}
        stepNumberComponent={() => null}
        backdropColor="rgba(0, 0, 0, 0.65)"
        arrowColor="#FAF7F2"
        tooltipStyle={{
          borderRadius: 16,
          padding: 0,
          width: Dimensions.get("window").width - 32,
          maxWidth: Dimensions.get("window").width - 32,
          left: 16,
          overflow: "visible",
        }}
        animated
      >
        <TutorialProvider
          autoStartEnabled={!splashMounted && appReady && hasToken && segments[0] === "(tabs)"}
        >
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
          <DisclosureModal
            visible={showDisclosure}
            onAccept={onAcceptDisclosure}
            onDecline={onDeclineDisclosure}
          />

          {/* Render splash last so it stays visually above navigator content. */}
          {splashMounted && (
            <SplashScreen
              isVisible={splashVisible}
              onHide={handleSplashHide}
              reduceMotion={settings.reduceMotion}
            />
          )}
          {/* Global TTS control */}
          <GlobalTtsControl />
        </TutorialProvider>
      </CopilotProvider>
    </ThemeProvider>
  );
}

/**
 * RootLayout: Outer wrapper component
 * Wraps RootContent with SettingsProvider so RootContent can use useSettings() hook
 */
export default function RootLayout() {
  return (
    <SettingsProvider>
      <RootContent />
    </SettingsProvider>
  );
}