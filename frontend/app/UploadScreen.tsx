import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useFocusEffect } from "expo-router";

import { uploadUserImage } from "@/services/images";
import { addFruitToInventory } from "@/services/inventory";
import { getMe } from "@/services/me";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let uploadIntroSpokenThisSession = false;

export default function UploadScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();

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

  // Prevent double-taps / "buggy" feeling while picker opens
  const pickerBusy = useRef(false);

  const say = (text: string, interrupt = true) => {
    if (!loaded) return;
    if (!settings.ttsEnabled) return;
    tts.say(text, {
      interrupt,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
    });
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

      return () => {
        isFocused.current = false;
      };
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

    // TTS just turned on
    if (wasEnabled === false && enabled === true) {
      say("Voice guidance enabled.", true);

      if (mode === "auto") {
        if (isFocused.current) {
          setTimeout(() => {
            speakUploadIntro();
            uploadIntroSpokenThisSession = true;
          }, 150);
        } else {
          pendingAutoSpeak.current = true;
        }
      }
      return;
    }

    // Mode switched to auto
    if (wasMode !== "auto" && mode === "auto") {
      if (isFocused.current) {
        speakUploadIntro();
        uploadIntroSpokenThisSession = true;
      } else {
        pendingAutoSpeak.current = true;
      }
      return;
    }

    // Mode switched away from auto
    if (wasMode === "auto" && mode !== "auto") {
      pendingAutoSpeak.current = false;
      return;
    }

    if (mode !== "auto") return;

    // First time landing on this screen this session
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
        say("Permission needed. Please allow photo library access to select an image.", true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settings.ttsEnabled]);

  const pickImage = async () => {
    if (loading) return;
    if (pickerBusy.current) return;

    try {
      pickerBusy.current = true;

      // Speak without blocking launch
      say("Opening photo library.", true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // raw image (no crop UI)
        quality: 0.85,        // faster + still very good
        exif: false,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        say("Image selected. Press Upload to continue.", true);
      }
    } finally {
      pickerBusy.current = false;
    }
  };

  const takePhoto = async () => {
    if (loading) return;
    if (pickerBusy.current) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required.");
      say("Permission needed. Please allow camera access to take a photo.", true);
      return;
    }

    try {
      pickerBusy.current = true;

      say("Opening camera.", true);
      await sleep(150); // tiny delay helps on some devices; not blocking much

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // raw image (no crop UI)
        quality: 0.85,
        exif: false,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        say("Photo captured. Press Upload to continue.", true);
      }
    } finally {
      pickerBusy.current = false;
    }
  };

  const uploadImage = async () => {
    if (!imageUri || loading) return;

    try {
      setPhase("uploading");
      say("Uploading image. Please wait.", true);

      const me = await getMe();
      if (!me?.id) throw new Error("Could not determine user. Please log in again.");

      const data = await uploadUserImage({
        userId: me.id,
        imageUri,
        description: description.trim() || undefined,
      });

      if (data.prediction?.fruit) {
        await addFruitToInventory(data.prediction.fruit);
      }

      setPhase("analyzing");
      say("Analyzing. Please wait.", true);

      // keep UI snappy; don’t stall here
      await sleep(150);

      router.push({
        // Adjust if your route is different
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

  const statusText =
    phase === "uploading" ? "Uploading image..." : phase === "analyzing" ? "Analyzing..." : "";

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Returns to the previous screen"
        >
          <Text style={[styles.backText, loading && styles.disabledText]}>← Back</Text>
        </Pressable>

        {showReplay && (
          <Pressable
            style={styles.replayButton}
            onPress={() => {
              say(
                imageUri
                  ? "Upload screen. Image selected. Press Upload to see results."
                  : "Upload screen. Choose Library or Camera to select an image, then press Upload to see results.",
                true
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Replay voice guidance"
            accessibilityHint="Repeats instructions for this screen"
          >
            <Text style={styles.replayText}>Replay</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>Upload Fruit Image</Text>
      <Text style={styles.subtitle}>Choose from your library or take a photo.</Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.secondaryBtn,
            (loading || pickerBusy.current) && styles.btnDisabled,
          ]}
          onPress={pickImage}
          disabled={loading || pickerBusy.current}
          accessibilityRole="button"
          accessibilityLabel="Library"
          accessibilityHint="Select an image from your photo library"
        >
          <Text style={styles.secondaryText}>Library</Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryBtn,
            (loading || pickerBusy.current) && styles.btnDisabled,
          ]}
          onPress={takePhoto}
          disabled={loading || pickerBusy.current}
          accessibilityRole="button"
          accessibilityLabel="Camera"
          accessibilityHint="Take a new photo using the camera"
        >
          <Text style={styles.secondaryText}>Camera</Text>
        </Pressable>
      </View>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#6B7776"
        style={styles.input}
        editable={!loading && !pickerBusy.current}
        accessibilityLabel="Description"
        accessibilityHint="Optional description for your upload"
      />

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.preview}
          accessibilityLabel="Selected image preview"
        />
      ) : (
        <View style={styles.placeholder} accessible accessibilityLabel="No image selected">
          <Text style={styles.placeholderTitle}>No image selected</Text>
          <Text style={styles.placeholderText}>Pick one above to preview it here.</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text style={styles.loadingText}>{statusText}</Text>
        </View>
      )}

      <Pressable
        style={[styles.uploadBtn, !canUpload && styles.uploadBtnDisabled]}
        onPress={uploadImage}
        disabled={!canUpload}
        accessibilityRole="button"
        accessibilityLabel="Upload"
        accessibilityHint="Uploads the selected image and shows results"
      >
        {loading ? (
          <Text style={styles.uploadText}>
            {phase === "uploading" ? "Uploading..." : "Analyzing..."}
          </Text>
        ) : (
          <Text style={styles.uploadText}>Upload</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backRow: { alignSelf: "flex-start", paddingVertical: 8 },
  backText: { color: "#1F4C47", fontSize: 16, fontWeight: "600" },
  disabledText: { opacity: 0.5 },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  replayText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  title: { color: "#0F1F1D", fontSize: 22, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#465251", marginTop: 6, marginBottom: 12, fontSize: 14 },

  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 12 },

  secondaryBtn: {
    flex: 1,
    backgroundColor: "#1F4C47",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
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
    marginBottom: 10,
  },

  preview: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    marginVertical: 14,
  },

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
    paddingHorizontal: 16,
  },
  placeholderTitle: {
    color: "#0F1F1D",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },
  placeholderText: { color: "#465251", textAlign: "center" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loadingText: { color: "#465251", fontWeight: "700" },

  uploadBtn: {
    backgroundColor: "#E94B3C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  uploadBtnDisabled: { opacity: 0.45 },

  uploadText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});