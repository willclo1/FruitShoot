import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { setAuthed } from "@/services/authState";
import * as SecureStore from "expo-secure-store";
import { tts } from "@/services/tts";

export default function HomeScreen() {
  const router = useRouter();

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

  const buttons = [
    { label: "Upload Picture", onPress: () => router.push("/UploadScreen") },
    {
      label: "Instructions",
      onPress: () => Alert.alert("Instructions page coming soon..."),
    },
  ];

  useEffect(() => {
    tts.setMode("auto");
    tts.say("Welcome to FruitShoot! Your personal fruit ripeness assistant. To get started, upload a picture of your fruit and we'll analyze its ripeness and suggest recipes. Let's make the most of your produce and reduce food waste together!");
  }, []);

  return (
    <SafeAreaView style={styles.safe}>

      <View style={styles.topBar}>
      <Pressable style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/SettingsScreen")}
      >
        <Text style={styles.settingsText}>Settings</Text>
      </Pressable>
    </View>


      <View style={styles.content}>
        <Image
          source={require("../../assets/images/FruitShoot Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.buttonStack}>
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={b.onPress}
            >
              <Text style={styles.buttonText}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF7F2",
  },

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
  borderRadius: 999,
  },  

  settingsText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },

  logo: {
    width: 220,
    height: 220,
  },

  buttonStack: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },

  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#193F3A",
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
  backgroundColor: "#8A1F1F",
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 999, // ⭐ makes it ovular
},

  signOutText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
});