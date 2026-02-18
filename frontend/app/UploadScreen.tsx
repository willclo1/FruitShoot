import React, { useEffect, useState } from "react";
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
import { getMe } from "@/services/me"; // <-- uses tokens to fetch current user

export default function UploadScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!imageUri) return;

    setLoading(true);
    try {
      // ✅ Get the current user's id using tokens
      const me = await getMe();
      if (!me?.id) throw new Error("Could not determine user. Please log in again.");

      const res = await uploadUserImage({
        userId: me.id,
        imageUri,
        description: description.trim() || undefined,
      });
      

      const data = await res.json().catch(() => ({}));
      Alert.alert(
        "Result",
        `${data.prediction.prediction} (${(data.prediction.confidence * 100).toFixed(1)}%)`
      );
      if (!res.ok) throw new Error(data?.detail || "Upload failed");

      Alert.alert("Upload complete!", `Saved as: ${data.filename}`);
      setImageUri(null);
      setDescription("");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Upload Fruit Image</Text>
      <Text style={styles.subtitle}>Choose from your library or take a photo.</Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryBtn} onPress={pickImage} disabled={loading}>
          <Text style={styles.secondaryText}>Library</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={takePhoto} disabled={loading}>
          <Text style={styles.secondaryText}>Camera</Text>
        </Pressable>
      </View>

      {/* Optional description */}
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        placeholderTextColor="#6B7776"
        style={styles.input}
        editable={!loading}
      />

      {/* Preview */}
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

      {/* Upload */}
      <Pressable
        style={[
          styles.uploadBtn,
          (!imageUri || loading) && styles.uploadBtnDisabled,
        ]}
        onPress={uploadImage}
        disabled={!imageUri || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
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

  uploadBtn: {
    backgroundColor: "#E94B3C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  uploadBtnDisabled: { opacity: 0.45 },

  uploadText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});