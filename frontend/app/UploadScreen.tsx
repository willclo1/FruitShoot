import React, { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";

import { uploadUserImage } from "@/services/images";
import { getMe } from "@/services/me";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function UploadScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing">("idle");

  const loading = phase !== "idle";
  const canUpload = useMemo(() => !!imageUri && !loading, [imageUri, loading]);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access media library is required."
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const uploadImage = async () => {
    if (!imageUri || loading) return;

    try {
      setPhase("uploading");

      const me = await getMe();
      if (!me?.id) throw new Error("Could not determine user. Please log in again.");

      const res = await uploadUserImage({
        userId: me.id,
        imageUri,
        description: description.trim() || undefined,
      });

      setPhase("analyzing");

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Upload failed");

      const minAnalyzeMs = 900;
      await sleep(minAnalyzeMs);

      const label = data?.prediction?.prediction ?? "Unknown";
      const conf = typeof data?.prediction?.confidence === "number" ? data.prediction.confidence : 0;

      Alert.alert("Result", `${label} (${(conf * 100).toFixed(1)}%)`);
      setImageUri(null);
      setDescription("");
      setPhase("idle");
    } catch (e: any) {
      setPhase("idle");
      Alert.alert("Upload failed", e?.message || "Something went wrong");
    }
  };

  const statusText =
    phase === "uploading"
      ? "Uploading image..."
      : phase === "analyzing"
      ? "Analyzing with AI..."
      : "";

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backRow}
        disabled={loading}
      >
        <Text style={[styles.backText, loading && styles.disabledText]}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Upload Fruit Image</Text>
      <Text style={styles.subtitle}>Choose from your library or take a photo.</Text>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.secondaryBtn, loading && styles.btnDisabled]} onPress={pickImage} disabled={loading}>
          <Text style={styles.secondaryText}>Library</Text>
        </Pressable>

        <Pressable style={[styles.secondaryBtn, loading && styles.btnDisabled]} onPress={takePhoto} disabled={loading}>
          <Text style={styles.secondaryText}>Camera</Text>
        </Pressable>
      </View>

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#6B7776"
        style={styles.input}
        editable={!loading}
      />

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>No image selected</Text>
          <Text style={styles.placeholderText}>
            Pick one above to preview it here.
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>{statusText}</Text>
        </View>
      )}

      <Pressable
        style={[styles.uploadBtn, !canUpload && styles.uploadBtnDisabled]}
        onPress={uploadImage}
        disabled={!canUpload}
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

  backRow: { alignSelf: "flex-start", paddingVertical: 8 },
  backText: { color: "#1F4C47", fontSize: 16, fontWeight: "600" },
  disabledText: { opacity: 0.5 },

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