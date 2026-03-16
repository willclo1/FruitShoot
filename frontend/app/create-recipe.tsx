import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { IngredientsInputList } from "@/components/ingredients-input-list";
import { NumberedStepsInput } from "@/components/numbered-steps-input";
import { createRecipe } from "@/services/recipes";
import {
  ingredientsToDescription,
  instructionsToDescription,
} from "@/services/recipeFormat";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

export default function CreateRecipeScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const cleanIngredients = ingredients.map((item) => item.trim()).filter(Boolean);
    const cleanSteps = steps.map((item) => item.trim()).filter(Boolean);

    return (
      title.trim().length > 0 &&
      cleanIngredients.length > 0 &&
      cleanSteps.length > 0 &&
      !submitting
    );
  }, [title, ingredients, steps, submitting]);

  const onCreate = async () => {
    const cleanTitle = title.trim();
    const cleanIngredients = ingredients.map((item) => item.trim()).filter(Boolean);
    const cleanSteps = steps.map((item) => item.trim()).filter(Boolean);

    if (!cleanTitle || !cleanIngredients.length || !cleanSteps.length) {
      Alert.alert("Create Recipe", "Please complete name, ingredients, and instructions.");
      return;
    }

    try {
      setSubmitting(true);
      await createRecipe(
        cleanTitle,
        ingredientsToDescription(cleanIngredients),
        instructionsToDescription(cleanSteps)
      );

      Alert.alert("Create Recipe", "Recipe created successfully.");
      router.back();
    } catch (e: any) {
      Alert.alert("Create Recipe", e?.message || "Could not create recipe");
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

        <Text style={styles.h1}>Create Recipe</Text>
        <View style={styles.underline} />
        <Text style={styles.introText}>
          Build a clean recipe card with structured ingredients and numbered steps.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Banana Yogurt Bowl"
            placeholderTextColor="#66706C"
            style={styles.input}
            editable={!submitting}
          />

          <Text style={styles.sectionTitle}>Ingredients</Text>
          <Text style={styles.sectionHelper}>
            List each ingredient separately for a cleaner recipe layout.
          </Text>
          <IngredientsInputList
            values={ingredients}
            onChange={setIngredients}
            disabled={submitting}
          />

          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.sectionHelper}>
            Steps are numbered automatically as you add or remove them.
          </Text>
          <NumberedStepsInput steps={steps} onChange={setSteps} disabled={submitting} />
        </View>

        <View style={styles.btnRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            disabled={submitting}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={onCreate}
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
                <Text style={styles.primaryText}>Creating...</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>Create Recipe</Text>
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
    marginBottom: 12,
    borderRadius: 2,
  },
  introText: {
    color: "rgba(14,29,27,0.66)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 16,
  },

  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.1)",
    backgroundColor: "rgba(255,255,255,0.84)",
    padding: 16,
  },

  sectionTitle: { marginTop: 16, fontSize: 16, fontWeight: "900", color: "#17302C" },
  sectionHelper: {
    marginTop: 6,
    color: "rgba(14,29,27,0.58)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  label: { marginTop: 0, fontSize: 14, fontWeight: "800", color: "#17302C" },

  input: {
    marginTop: 8,
    backgroundColor: "#F2F3F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    color: "#111",
  },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 18 },

  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.18)",
    backgroundColor: "#F4F6F3",
  },
  secondaryText: { color: "#28443F", fontWeight: "900" },

  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: CAMERA_GREEN,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryText: { color: "white", fontWeight: "900" },

  submitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pressed: { opacity: 0.85 },
});