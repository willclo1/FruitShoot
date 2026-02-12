import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { login } from "@/services/login";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  const onGetStarted = async () => {
  if (!canSubmit) {
    Alert.alert("Missing info", "Please enter your email and password.");
    return;
  }

  try {
    await login(email.trim(), password);
    router.replace("/(tabs)");
  } catch (e: any) {
    Alert.alert("Login failed", e.message || "Invalid email or password");
  }
};

  const onForgotPassword = () => {
    Alert.alert("Forgot Password", "Password reset flow coming soon.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Image
            source={require("../assets/images/FruitShoot Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in with Email</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#6F6F6F"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#6F6F6F"
              secureTextEntry
              style={styles.input}
            />

            <Pressable onPress={onForgotPassword} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

          <Pressable onPress={onGetStarted} style={styles.cta}>
            <Text style={styles.ctaText}>Get Started</Text>
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
    paddingHorizontal: 24,
  },

  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  brandText: {
    fontSize: 34,
    fontWeight: "800",
    color: BRAND,
    marginBottom: 18,
  },

  card: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "transparent",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    color: "#111",
    textDecorationLine: "underline",
  },

  input: {
    height: 44,
    borderRadius: 8,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
    marginBottom: 10,
  },

  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -2,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 12,
    color: "#333",
  },

    cta: {
      alignSelf: "center",
      backgroundColor: "#193F3A",
      paddingVertical: 10,
      paddingHorizontal: 26,
      borderRadius: 10,
      minWidth: 160,
      alignItems: "center",
    },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  backWrap: {
    marginTop: 14,
  },
  backText: {
    color: BRAND,
    fontSize: 14,
    fontWeight: "700",
  },
});
