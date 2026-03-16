import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Image, Alert, StyleSheet, Pressable,
  ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useFocusEffect } from "expo-router";

import { uploadUserImage } from "@/services/images";
import { addFruitToInventory } from "@/services/inventory";
import { getMe } from "@/services/me";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let uploadIntroSpokenThisSession = false;

export default function UploadScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing">("idle");

  const loading = phase !== "idle";
  const canUpload = useMemo(() => !!imageUri && !loading, [imageUri, loading]);

  const spokeOnThisMount = useRef(false);
  const isFocused = useRef(false);
  const pendingAutoSpeak = useRef(false);
  const prevEnabled = useRef<boolean | null>(null);
  const prevMode = useRef<"auto" | "onDemand" | null>(null);
  const pickerBusy = useRef(false);

  const say = (text: string, interrupt = true) => {
    if (!loaded) return;
    if (!settings.ttsEnabled) return;
    tts.say(text, { interrupt, rate: settings.ttsRate, pitch: settings.ttsPitch });
  };

  const speakUploadIntro = () => {
    if (!loaded) return;
    if (!settings.ttsEnabled) return;
    if (settings.ttsMode !== "auto") return;
    say("Upload screen. Choose Library or Camera, then press Upload to see results.", true);
  };

  useFocusEffect(
    React.useCallback(() => {
      isFocused.current = true;
      if (pendingAutoSpeak.current) {
        pendingAutoSpeak.current = false;
        speakUploadIntro();
        uploadIntroSpokenThisSession = true;
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
      say("Voice guidance enabled.", true);
      if (mode === "auto") {
        if (isFocused.current) {
          setTimeout(() => { speakUploadIntro(); uploadIntroSpokenThisSession = true; }, 150);
        } else { pendingAutoSpeak.current = true; }
      }
      return;
    }

    if (wasMode !== "auto" && mode === "auto") {
      if (isFocused.current) { speakUploadIntro(); uploadIntroSpokenThisSession = true; }
      else { pendingAutoSpeak.current = true; }
      return;
    }

    if (wasMode === "auto" && mode !== "auto") { pendingAutoSpeak.current = false; return; }
    if (mode !== "auto") return;

    if (!uploadIntroSpokenThisSession && !spokeOnThisMount.current) {
      spokeOnThisMount.current = true;
      uploadIntroSpokenThisSession = true;
      speakUploadIntro();
    }
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Permission to access media library is required.");
        say("Permission needed. Please allow photo library access.", true);
      }
    })();
  }, [loaded, settings.ttsEnabled]);

  const pickImage = async () => {
    if (loading || pickerBusy.current) return;
    try {
      pickerBusy.current = true;
      say("Opening photo library.", true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, quality: 0.85, exif: false,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        say("Image selected. Press Upload to continue.", true);
      }
    } finally { pickerBusy.current = false; }
  };

  const takePhoto = async () => {
    if (loading || pickerBusy.current) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required.");
      say("Permission needed. Please allow camera access.", true);
      return;
    }
    try {
      pickerBusy.current = true;
      say("Opening camera.", true);
      await sleep(150);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, quality: 0.85, exif: false,
      });
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        say("Photo captured. Press Upload to continue.", true);
      }
    } finally { pickerBusy.current = false; }
  };

  const uploadImage = async () => {
    if (!imageUri || loading) return;
    try {
      setPhase("uploading");
      say("Uploading image. Please wait.", true);
      const me = await getMe();
      if (!me?.id) throw new Error("Could not determine user. Please log in again.");
      const data = await uploadUserImage({
        userId: me.id, imageUri,
        description: description.trim() || undefined,
      });
      if (data.prediction?.fruit) await addFruitToInventory(data.prediction.fruit);
      setPhase("analyzing");
      say("Analyzing. Please wait.", true);
      await sleep(150);
      router.push({
        pathname: "/ResultsScreen",
        params: {
          uploadedUrl: data.url,
          fruit: data.prediction?.fruit ?? "Unknown",
          fruitConfidence: String(data.prediction?.fruit_confidence ?? 0),
          ripeness: data.prediction?.ripeness ?? "N/A",
          ripenessConfidence: String(data.prediction?.ripeness_confidence ?? 0),
        },
      });
      setImageUri(null);
      setDescription("");
      setPhase("idle");
    } catch (e: any) {
      setPhase("idle");
      const msg = e?.message || "Something went wrong";
      say(`Upload failed. ${msg}`, true);
      Alert.alert("Upload failed", msg);
    }
  };

  const statusText = phase === "uploading" ? "Uploading image..." : phase === "analyzing" ? "Analyzing..." : "";
  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backRow, { minHeight: tt.minHeight }]}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={[styles.backText, loading && styles.disabledText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
            ← Back
          </Text>
        </Pressable>

        {showReplay && (
          <Pressable
            style={[styles.replayButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
            onPress={() => say(
              imageUri
                ? "Upload screen. Image selected. Press Upload to see results."
                : "Upload screen. Choose Library or Camera, then press Upload.",
              true
            )}
            accessibilityRole="button"
            accessibilityLabel="Replay voice guidance"
          >
            <Text style={[styles.replayText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>Replay</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.title, { fontFamily: fontBold, fontSize: 22 * finalScale }]}>Upload Fruit Image</Text>
      <Text style={[styles.subtitle, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>
        Choose from your library or take a photo.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.secondaryBtn, { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius }, (loading || pickerBusy.current) && styles.btnDisabled]}
          onPress={pickImage}
          disabled={loading || pickerBusy.current}
          accessibilityRole="button"
          accessibilityLabel="Library"
        >
          <Text style={[styles.secondaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Library</Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius }, (loading || pickerBusy.current) && styles.btnDisabled]}
          onPress={takePhoto}
          disabled={loading || pickerBusy.current}
          accessibilityRole="button"
          accessibilityLabel="Camera"
        >
          <Text style={[styles.secondaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Camera</Text>
        </Pressable>
      </View>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#6B7776"
        style={[styles.input, { fontFamily: fontRegular, fontSize: 15 * finalScale, minHeight: tt.minHeight }]}
        editable={!loading && !pickerBusy.current}
        accessibilityLabel="Description"
      />

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} accessibilityLabel="Selected image preview" />
      ) : (
        <View style={styles.placeholder} accessible accessibilityLabel="No image selected">
          <Text style={[styles.placeholderTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>No image selected</Text>
          <Text style={[styles.placeholderText, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>Pick one above to preview it here.</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text style={[styles.loadingText, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>{statusText}</Text>
        </View>
      )}

      <Pressable
        style={[styles.uploadBtn, { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius }, !canUpload && styles.uploadBtnDisabled]}
        onPress={uploadImage}
        disabled={!canUpload}
        accessibilityRole="button"
        accessibilityLabel="Upload"
      >
        <Text style={[styles.uploadText, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
          {loading ? (phase === "uploading" ? "Uploading..." : "Analyzing...") : "Upload"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#fff" 
  },
  topRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  backRow: { 
    alignSelf: "flex-start", 
    paddingVertical: 8, 
    justifyContent: "center" 
  },
  backText: { color: "#1F4C47", fontWeight: "600" },
  disabledText: { opacity: 0.5 },
  replayButton: { 
    backgroundColor: "#3B3B3B", 
    paddingVertical: 6, 
    paddingHorizontal: 14, 
    borderRadius: 999, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  replayText: { color: "#fff", fontWeight: "700" },
  title: { color: "#0F1F1D", fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#465251", marginTop: 6, marginBottom: 12 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  secondaryBtn: { 
    flex: 1, backgroundColor: "#1F4C47", 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  secondaryText: { color: "#fff", fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  input: { 
    borderWidth: 1, 
    borderColor: "#D6DDDB", 
    backgroundColor: "#F7F9F8", 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    color: "#0F1F1D", 
    marginBottom: 10 
  },
  preview: { width: "100%", height: 320, borderRadius: 14, marginVertical: 14 },
  placeholder: { 
    width: "100%", 
    height: 320, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: "#D6DDDB", 
    backgroundColor: "#F7F9F8", 
    justifyContent: "center", 
    alignItems: "center", 
    marginVertical: 14, 
    paddingHorizontal: 16 
  },
  placeholderTitle: { color: "#0F1F1D", fontWeight: "800", marginBottom: 6 },
  placeholderText: { color: "#465251", textAlign: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  loadingText: { color: "#465251", fontWeight: "700" },
  uploadBtn: { 
    backgroundColor: "#E94B3C", 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  uploadBtnDisabled: { opacity: 0.45 },
  uploadText: { color: "#fff", fontWeight: "800" },
});