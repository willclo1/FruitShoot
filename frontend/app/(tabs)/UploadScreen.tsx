import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Alert,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

export default function UploadScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

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

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!imageUri) return;

    setLoading(true);

    // Later: send to backend
    setTimeout(() => {
      setLoading(false);
      Alert.alert("Upload complete!");
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back */}
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Upload Fruit Image</Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryBtn} onPress={pickImage}>
          <Text style={styles.secondaryText}>Library</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={takePhoto}>
          <Text style={styles.secondaryText}>Camera</Text>
        </Pressable>
      </View>

      {/* Preview */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      {/* Upload */}
      <Pressable
        style={[styles.uploadBtn, !imageUri && { opacity: 0.4 }]}
        onPress={uploadImage}
        disabled={!imageUri || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FAF7F2" />
        ) : (
          <Text style={styles.uploadText}>Upload</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Background */
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0E1D1B",
  },

  backText: {
    color: "#B9C0BE",
    fontSize: 16,
    marginBottom: 10,
  },

  title: {
    color: "#FAF7F2",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  /* Secondary buttons */
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#1F4C47",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryText: {
    color: "#FAF7F2",
    fontWeight: "600",
  },

  /* Image */
  preview: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    marginVertical: 18,
  },

  placeholder: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#B9C0BE",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 18,
  },

  placeholderText: {
    color: "#B9C0BE",
  },

  /* Upload */
  uploadBtn: {
    backgroundColor: "#E94B3C", 
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  uploadText: {
    color: "#FAF7F2",
    fontWeight: "700",
    fontSize: 16,
  },
});