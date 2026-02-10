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
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) setImageUri(result.assets[0].uri);
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
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Upload Fruit Image</Text>
      <Text style={styles.subtitle}>Choose from your library or take a photo.</Text>

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
          <Text style={styles.placeholderTitle}>No image selected</Text>
          <Text style={styles.placeholderText}>Pick one above to preview it here.</Text>
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
  /* Background */
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  backRow: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },

  backText: {
    color: "#1F4C47",
    fontSize: 16,
    fontWeight: "600",
  },

  title: {
    color: "#0F1F1D",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },

  subtitle: {
    color: "#465251",
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
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
    color: "#fff",
    fontWeight: "700",
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
    borderColor: "#D6DDDB",
    backgroundColor: "#F7F9F8",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 18,
    paddingHorizontal: 16,
  },

  placeholderTitle: {
    color: "#0F1F1D",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },

  placeholderText: {
    color: "#465251",
    textAlign: "center",
  },

  /* Upload */
  uploadBtn: {
    backgroundColor: "#E94B3C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  uploadBtnDisabled: {
    opacity: 0.45,
  },

  uploadText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});