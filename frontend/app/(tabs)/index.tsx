import React, { useEffect, useRef } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { setAuthed } from "@/services/authState";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";
import TourTarget from "@/components/tutorial/TourTarget";

let homeIntroSpokenThisSession = false;

export default function HomeScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const spokeOnThisMount = useRef(false);
  const isFocused = useRef(false);
  const pendingAutoSpeak = useRef(false);
  const prevEnabled = useRef<boolean | null>(null);
  const prevMode = useRef<"auto" | "onDemand" | null>(null);

  const speak = (text: string, interrupt = true) => {
    if (!loaded) return;
    if (!settings.ttsEnabled) return;
    tts.say(text, { interrupt, rate: settings.ttsRate, pitch: settings.ttsPitch });
  };

  const speakHomeIntro = (interrupt = true) => {
    if (!loaded) return;
    if (!settings.ttsEnabled) return;
    if (settings.ttsMode !== "auto") return;
    speak("Home screen. Tap Upload Picture to get started.", interrupt);
  };

  useFocusEffect(
    React.useCallback(() => {
      isFocused.current = true;
      if (pendingAutoSpeak.current) {
        pendingAutoSpeak.current = false;
        speakHomeIntro(true);
        homeIntroSpokenThisSession = true;
      }
      return () => { isFocused.current = false; };
    }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch])
  );

  useEffect(() => {
    if (!loaded) return;
    const enabled = settings.ttsEnabled;
    const mode = settings.ttsMode;
    const wasEnabled = prevEnabled.current;
    const wasMode = prevMode.current;
    prevEnabled.current = enabled;
    prevMode.current = mode;
    if (!enabled) return;

    if (wasEnabled === false && enabled === true) {
      speak("Voice guidance enabled.", true);
      if (mode === "auto") {
        if (isFocused.current) {
          setTimeout(() => { speakHomeIntro(true); homeIntroSpokenThisSession = true; }, 150);
        } else {
          pendingAutoSpeak.current = true;
        }
      }
      return;
    }

    if (wasMode !== "auto" && mode === "auto") {
      if (isFocused.current) {
        speakHomeIntro(true);
        homeIntroSpokenThisSession = true;
      } else {
        pendingAutoSpeak.current = true;
      }
      return;
    }

    if (wasMode === "auto" && mode !== "auto") {
      pendingAutoSpeak.current = false;
      return;
    }

    if (mode !== "auto") return;

    if (!homeIntroSpokenThisSession && !spokeOnThisMount.current) {
      spokeOnThisMount.current = true;
      homeIntroSpokenThisSession = true;
      speakHomeIntro(true);
    }
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  const onSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          setAuthed(false);
          router.replace("/login");
        },
      },
    ]);
  };

  const onPressUpload = () => {
    if (loaded && settings.ttsEnabled && settings.ttsMode === "onDemand") {
      speak("Upload Picture. Choose a photo or take a new one.", true);
    }
    router.push("/UploadScreen");
  };

  const onPressInstructions = () => {
    if (loaded && settings.ttsEnabled) {
      speak("Instructions: Tap Upload Picture, select or take a photo of a fruit, then wait for the ripeness result.", true);
    } else {
      router.push("/instructions");
    }
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TourTarget id="Sign Out" order={8} text="Tap here when you're done to sign out.">
          <Pressable
            style={[styles.signOutButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
            onPress={onSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={[styles.signOutText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
              Sign Out
            </Text>
          </Pressable>
        </TourTarget>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {showReplay && (
            <Pressable
              style={[styles.replayButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
              onPress={() => speak("Home screen. Tap Upload Picture to get started.", true)}
              accessibilityRole="button"
              accessibilityLabel="Replay voice guidance"
            >
              <Text style={[styles.replayText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
                Replay
              </Text>
            </Pressable>
          )}
          <TourTarget id="Settings" order={4} text="Adjust voice, text size, and accessibility options.">
            <Pressable
              style={[styles.settingsButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
              onPress={() => router.push("/SettingsScreen")}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={[styles.settingsText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
                Settings
              </Text>
            </Pressable>
          </TourTarget>
        </View>
      </View>

      <View style={styles.content}>
        <TourTarget id="Welcome" order={1} text="This is FruitShoot! Scan fruit, get ripeness results, and discover recipes.">
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="FruitShoot logo"
          />
        </TourTarget>

        <View style={styles.buttonStack}>
          <TourTarget id="Scan Fruit" order={2} text="Tap here to upload or take a photo of your fruit.">
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius },
                pressed && styles.buttonPressed,
              ]}
              onPress={onPressUpload}
              accessibilityRole="button"
              accessibilityLabel="Upload Picture"
            >
              <Text style={[styles.buttonText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
                Upload Picture
              </Text>
            </Pressable>
          </TourTarget>

          <TourTarget id="Instructions" order={3} text="Read how scanning works and what results mean.">
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius },
                pressed && styles.buttonPressed,
              ]}
              onPress={onPressInstructions}
              accessibilityRole="button"
              accessibilityLabel="Instructions"
            >
              <Text style={[styles.buttonText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
                Instructions
              </Text>
            </Pressable>
          </TourTarget>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF7F2" },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingsButton: {
    backgroundColor: "#193F3A",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsText: { color: "white", fontWeight: "700" },
  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  replayText: { color: "white", fontWeight: "700" },
  signOutButton: {
    backgroundColor: "#8A1F1F",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: { color: "white", fontWeight: "700" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  logo: { width: 220, height: 220 },
  buttonStack: { width: "100%", maxWidth: 360, gap: 12 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#193F3A",
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { color: "white", fontWeight: "600" },
});