import React, { useMemo, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

export default function UploadRecipeScreen() {
  const router = useRouter();

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      ingredients.trim().length > 0 &&
      instructions.trim().length > 0 &&
      !submitting
    );
  }, [title, ingredients, instructions, submitting]);

  const onSubmit = async () => {
    if (!API_BASE) {
      Alert.alert("Config", "Missing EXPO_PUBLIC_API_BASE_URL.");
      return;
    }

    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert("Upload Recipe", "Please fill out title, ingredients, and instructions.");
      return;
    }

    const token = await SecureStore.getItemAsync("access_token");
    if (!token) {
      Alert.alert("Auth", "Missing access token. Please log in again.");
      return;
    }

    try {
      setSubmitting(true);

      // Matches your backend schema:
      // RecipeCreate: { title, ingredients_description, instructions_description }
      const payload = {
        title: title.trim(),
        ingredients_description: ingredients.trim(),
        instructions_description: instructions.trim(),
      };

      // Your router is @router.post("/") inside a recipes router
      // So the final path is whatever you mounted it as (commonly "/recipes")
      // CHANGE THIS if your prefix is different.
      const res = await fetch(`${API_BASE}/recipes/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Create recipe failed");
      }

      await res.json().catch(() => null);

      Alert.alert("Upload Recipe", "Recipe submitted!");
      router.back();
    } catch (e: any) {
      Alert.alert("Upload Recipe", e?.message || "Could not submit recipe.");
    } finally {
      setSubmitting(false);
    }
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
          editable={!submitting}
        />

        <Text style={styles.label}>Ingredients</Text>
        <TextInput
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="One per line..."
          placeholderTextColor="#666"
          style={[styles.input, styles.multiline]}
          multiline
          editable={!submitting}
        />

        <Text style={styles.label}>Instructions</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Steps..."
          placeholderTextColor="#666"
          style={[styles.input, styles.multiline]}
          multiline
          editable={!submitting}
        />

        <View style={styles.btnRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            disabled={submitting}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSubmit || submitting) && styles.primaryBtnDisabled,
              pressed && styles.pressed,
            ]}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <View style={styles.submitRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryText}>Submitting…</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Submit</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },

  brandHeader: { alignItems: "center", marginBottom: 0 },
  brandLogo: { width: 140, height: 140, marginBottom: 6 },

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
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryText: { color: "white", fontWeight: "900" },

  pressed: { opacity: 0.85 },

  submitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});