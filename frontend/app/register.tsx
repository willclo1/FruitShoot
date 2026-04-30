import React, { useMemo, useState, useEffect } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { register } from "@/services/register";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;
  const { settings, loaded } = useSettings();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSubmit = useMemo(() => (
    email.trim().length > 0 && username.trim().length > 0 &&
    password.trim().length > 0 && confirmPassword.trim().length > 0
  ), [email, username, password, confirmPassword]);

  const onCreateAccount = async () => {
    if (!canSubmit) { Alert.alert("Missing info", "Please fill out all fields."); return; }
    if (!canSubmit) tts.say("Please fill out all fields.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { Alert.alert("Invalid email", "Please enter a valid email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) tts.say("Please enter a valid email address.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    if (trimmedUsername.length < 3) { Alert.alert("Invalid username", "Username must be at least 3 characters."); return; }
    if (trimmedUsername.length < 3) tts.say("Username must be at least 3 characters.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    if (trimmedPassword.length < 8) { Alert.alert("Weak password", "Password must be at least 8 characters."); return; }
    if (trimmedPassword.length < 8) tts.say("Password must be at least 8 characters.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    if (password !== confirmPassword) { Alert.alert("Passwords don't match", "Please re-enter your password."); return; }
    if (password !== confirmPassword) tts.say("Passwords do not match. Please re-enter your password.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    try {
      await register(normalizedEmail, password, trimmedUsername);
      router.replace("/(tabs)");
    } catch (e: any) { Alert.alert("Register failed", e.message || "Could not create account"); }
  };

  useEffect(() => {
    if (!loaded) return;
    tts.autoSay("Create account screen. Enter email, username, and password to create an account.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <Image source={require("../assets/images/FruitShoot Logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="FruitShoot logo" accessibilityIgnoresInvertColors />

          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>Create Account</Text>

            {[
              { value: email, setter: setEmail, placeholder: "Email", label: "Email", keyboard: "email-address" as const },
              { value: username, setter: setUsername, placeholder: "Username", label: "Username" },
              { value: password, setter: setPassword, placeholder: "Password", label: "Password", secure: true },
              { value: confirmPassword, setter: setConfirmPassword, placeholder: "Confirm Password", label: "Confirm password", secure: true },
            ].map(({ value, setter, placeholder, label, keyboard, secure }) => (
              <TextInput key={label} value={value} onChangeText={setter}
                placeholder={placeholder} placeholderTextColor="#6F6F6F"
                autoCapitalize="none" keyboardType={keyboard ?? "default"} secureTextEntry={secure}
                style={[styles.input, { fontFamily: fontRegular, fontSize: 16 * finalScale, minHeight: tt.minHeight }]}
                accessibilityLabel={label} onFocus={() => tts.say(label, { rate: settings.ttsRate, pitch: settings.ttsPitch, interrupt: false })} />
            ))}

            <Pressable onPress={() => { tts.say("Create account", { rate: settings.ttsRate, pitch: settings.ttsPitch }); onCreateAccount(); }} disabled={!canSubmit}
              style={({ pressed }) => [styles.cta, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal, borderRadius: tt.borderRadius }, pressed && styles.ctaPressed, !canSubmit && styles.ctaDisabled]}
              accessibilityRole="button" accessibilityLabel="Create account">
              <Text style={[styles.ctaText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>Create Account</Text>
            </Pressable>

            <Pressable onPress={() => { tts.say("Back to sign in", { rate: settings.ttsRate, pitch: settings.ttsPitch }); router.replace("/login"); }} style={[styles.backWrap, { minHeight: tt.minHeight, justifyContent: "center" }]}>
              <Text style={[styles.backText, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Back to Sign in</Text>
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