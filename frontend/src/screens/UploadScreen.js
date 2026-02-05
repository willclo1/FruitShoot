import React, { useState, useEffect } from "react";
import { View, Text, Button, Image, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState(null);

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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.cancelled) {
        setImageUri(result.uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Camera permission is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.cancelled) {
        setImageUri(result.uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open camera.");
    }
  };

  const uploadImage = async () => {
    if (!imageUri) return;
    // Placeholder: integrate with your backend here.
    Alert.alert("Upload", "Image ready to upload: " + imageUri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Fruit Image</Text>
      <View style={styles.buttons}>
        <Button title="Pick from library" onPress={pickImage} />
        <View style={styles.spacer} />
        <Button title="Take photo" onPress={takePhoto} />
      </View>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{ color: "#666" }}>No image selected</Text>
        </View>
      )}

      <View style={styles.uploadButton}>
        <Button title="Upload" onPress={uploadImage} disabled={!imageUri} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "600", marginVertical: 12 },
  buttons: { flexDirection: "row", marginBottom: 12 },
  spacer: { width: 12 },
  preview: { width: 320, height: 320, marginVertical: 12, borderRadius: 8 },
  placeholder: {
    width: 320,
    height: 320,
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButton: { width: "60%", marginTop: 8 },
});
