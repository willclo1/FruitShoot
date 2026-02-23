import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

export default function UploadRecipeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  const onSubmit = () => {
    // TODO: call backend later
    Alert.alert("Upload Recipe", "Recipe submitted (stub).");
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
        <Image
            source={require("../assets/images/FruitShoot Logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.h1}>Upload Recipe</Text>
        <View style={styles.underline} />

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Banana Bread"
          placeholderTextColor="#666"
          style={styles.input}
        />

        <Text style={styles.label}>Ingredients</Text>
        <TextInput
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="One per line..."
          placeholderTextColor="#666"
          style={[styles.input, styles.multiline]}
          multiline
        />

        <Text style={styles.label}>Instructions</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Steps..."
          placeholderTextColor="#666"
          style={[styles.input, styles.multiline]}
          multiline
        />

        <View style={styles.btnRow}>
          <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>

          <Pressable onPress={onSubmit} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Submit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },
    brandHeader: {
    alignItems: "center",
    marginBottom: 0,
  },
  
  brandLogo: {
    width: 140,
    height: 140,
    marginBottom: 6,
  },

  h1: { fontSize: 22, fontWeight: "900", color: CAMERA_GREEN },
  underline: {
    height: 2,
    width: 120,
    backgroundColor: CAMERA_GREEN,
    marginTop: 6,
    marginBottom: 18,
    borderRadius: 2,
  },

  label: { marginTop: 12, fontSize: 14, fontWeight: "800", color: "#111" },
  input: {
    marginTop: 8,
    backgroundColor: "#E5E5E5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COOL_GRAY,
    color: "#111",
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: CAMERA_GREEN,
    backgroundColor: "transparent",
  },
  secondaryText: { color: CAMERA_GREEN, fontWeight: "900" },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: CAMERA_GREEN,
  },
  primaryText: { color: "white", fontWeight: "900" },
});
