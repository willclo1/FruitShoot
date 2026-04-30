import React, { useMemo, useState, useEffect } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { login } from "@/services/login";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

export default function LoginScreen() {
  const router = useRouter();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;
  const { settings, loaded } = useSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const onGetStarted = async () => {
    if (!canSubmit) { Alert.alert("Missing info", "Please enter your email and password."); return; }
    if (!canSubmit) tts.say("Please enter your email and password.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) { Alert.alert("Login failed", e.message || "Invalid email or password"); }
  };

  useEffect(() => {
    if (!loaded) return;
    tts.autoSay("Sign in screen. Enter your email and password to sign in.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <Image source={require("../assets/images/FruitShoot Logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="FruitShoot logo" accessibilityIgnoresInvertColors />

          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>Sign in with Email</Text>

            <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#6F6F6F"
              autoCapitalize="none" keyboardType="email-address"
              style={[styles.input, { fontFamily: fontRegular, fontSize: 16 * finalScale, minHeight: tt.minHeight }]}
              accessibilityLabel="Email" onFocus={() => tts.say("Email field", { rate: settings.ttsRate, pitch: settings.ttsPitch, interrupt: false })} />

            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#6F6F6F"
              secureTextEntry
              style={[styles.input, { fontFamily: fontRegular, fontSize: 16 * finalScale, minHeight: tt.minHeight }]}
              accessibilityLabel="Password" onFocus={() => tts.say("Password field", { rate: settings.ttsRate, pitch: settings.ttsPitch, interrupt: false })} />

            <Pressable onPress={() => { tts.say("Password reset flow coming soon."); Alert.alert("Forgot Password", "Password reset flow coming soon."); }}
              style={[styles.forgotWrap, { minHeight: tt.minHeight, justifyContent: "center" }]}>
              <Text style={[styles.forgotText, { fontFamily: fontRegular, fontSize: 12 * finalScale }]}>Forgot Password?</Text>
            </Pressable>

            <Pressable onPress={() => { tts.say("Get started", { rate: settings.ttsRate, pitch: settings.ttsPitch }); onGetStarted(); }} disabled={!canSubmit}
              style={({ pressed }) => [styles.cta, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal, borderRadius: tt.borderRadius }, pressed && styles.ctaPressed, !canSubmit && styles.ctaDisabled]}
              accessibilityRole="button" accessibilityLabel="Get started">
              <Text style={[styles.ctaText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>Get Started</Text>
            </Pressable>

            <Pressable onPress={() => { tts.say("Create an account", { rate: settings.ttsRate, pitch: settings.ttsPitch }); router.push("/register"); }} style={[styles.backWrap, { minHeight: tt.minHeight, justifyContent: "center" }]}> 
              <Text style={[styles.backText, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Create an account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BRAND = "#193F3A";
const BG = "#F6F3EE";
const INPUT_BG = "#D7D7D7";
const BORDER = "#1F4A44";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    paddingHorizontal: 24 
  },
  logo: { width: 200, height: 200, marginBottom: 10 },
  card: { 
    width: "100%", 
    maxWidth: 360, 
    borderWidth: 2, 
    borderColor: BORDER, 
    borderRadius: 8, 
    padding: 16, 
    backgroundColor: "transparent" 
  },
  cardTitle: { 
    fontWeight: "800", 
    textAlign: "center", 
    marginBottom: 12, 
    color: "#111", 
    textDecorationLine: "underline" 
  },
  input: { 
    borderRadius: 8, 
    backgroundColor: INPUT_BG, 
    paddingHorizontal: 12, 
    color: "#111", 
    marginBottom: 10 
  },
  forgotWrap: { alignSelf: "flex-end", marginTop: -2, marginBottom: 12 },
  forgotText: { color: "#333" },
  cta: { 
    alignSelf: "center", 
    backgroundColor: BRAND, 
    paddingVertical: 10, 
    paddingHorizontal: 26, 
    borderRadius: 12, 
    minWidth: 160, 
    alignItems: "center" 
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  ctaDisabled: { opacity: 0.55 },
  ctaText: { color: "white", fontWeight: "800" },
  backWrap: { marginTop: 14, alignSelf: "center" },
  backText: { color: BRAND, fontWeight: "700" },
});