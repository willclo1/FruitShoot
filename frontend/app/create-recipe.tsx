import React, { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

export default function CreateRecipeScreen() {
  const router = useRouter();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;
  const { settings, loaded } = useSettings();

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanSteps = steps.map((i) => i.trim()).filter(Boolean);

    return (
      title.trim().length > 0 &&
      cleanIngredients.length > 0 &&
      cleanSteps.length > 0 &&
      !submitting
    );
  }, [title, ingredients, steps, submitting]);

  const onCreate = async () => {
    const cleanTitle = title.trim();
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanSteps = steps.map((i) => i.trim()).filter(Boolean);

    if (!cleanTitle || !cleanIngredients.length || !cleanSteps.length) {
      Alert.alert(
        "Create Recipe",
        "Please complete name, ingredients, and instructions."
      );
      tts.say("Please complete name, ingredients, and instructions.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
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
      tts.say(e?.message || "Could not create recipe", { rate: settings.ttsRate, pitch: settings.ttsPitch });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loaded) return;
    tts.autoSay("Create recipe. Provide a title, ingredients, and numbered instructions.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.heroCard}>
            <View style={styles.brandHeader}>
              <Image
                source={require("../assets/images/FruitShoot Logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            <Text
              style={[
                styles.h1,
                { fontFamily: fontBold, fontSize: 24 * finalScale },
              ]}
            >
              Create Recipe
            </Text>

            <View style={styles.underline} />

            <Text
              style={[
                styles.introText,
                { fontFamily: fontRegular, fontSize: 14 * finalScale },
              ]}
            >
              Build a polished recipe card with simple ingredients and clear,
              numbered instructions.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.label,
                  { fontFamily: fontBold, fontSize: 14 * finalScale },
                ]}
              >
                Recipe Name
              </Text>
              <Text
                style={[
                  styles.helperInline,
                  { fontFamily: fontRegular, fontSize: 12 * finalScale },
                ]}
              >
                Give your recipe a short, friendly title
              </Text>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Banana Yogurt Bowl"
              placeholderTextColor="#7C8782"
              style={[
                styles.input,
                {
                  fontFamily: fontRegular,
                  fontSize: 15 * finalScale,
                  minHeight: tt.minHeight,
                },
              ]}
              editable={!submitting}
              returnKeyType="next"
              onFocus={() => tts.say("Recipe name", { rate: settings.ttsRate, pitch: settings.ttsPitch, interrupt: false })}
            />

            <View style={styles.divider} />

            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontBold, fontSize: 16 * finalScale },
              ]}
            >
              Ingredients
            </Text>
            <Text
              style={[
                styles.sectionHelper,
                { fontFamily: fontRegular, fontSize: 12 * finalScale },
              ]}
            >
              Add one ingredient per line for a cleaner layout.
            </Text>

            <IngredientsInputList
              values={ingredients}
              onChange={setIngredients}
              disabled={submitting}
            />

            <View style={styles.divider} />

            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontBold, fontSize: 16 * finalScale },
              ]}
            >
              Instructions
            </Text>
            <Text
              style={[
                styles.sectionHelper,
                { fontFamily: fontRegular, fontSize: 12 * finalScale },
              ]}
            >
              Add each step in order. Numbers update automatically.
            </Text>

            <NumberedStepsInput
              steps={steps}
              onChange={setSteps}
              disabled={submitting}
            />
          </View>

          <View style={styles.btnRow}>
            <Pressable
              onPress={() => router.back()}
              onPressIn={() => tts.say("Cancel", { rate: settings.ttsRate, pitch: settings.ttsPitch })}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  minHeight: tt.minHeight,
                  borderRadius: tt.borderRadius,
                },
                pressed && styles.pressed,
              ]}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.secondaryText,
                  { fontFamily: fontBold, fontSize: 15 * finalScale },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { tts.say("Create recipe", { rate: settings.ttsRate, pitch: settings.ttsPitch }); onCreate(); }}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  minHeight: tt.minHeight,
                  borderRadius: tt.borderRadius,
                },
                (!canSubmit || submitting) && styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <View style={styles.submitRow}>
                  <ActivityIndicator color="#fff" />
                  <Text
                    style={[
                      styles.primaryText,
                      { fontFamily: fontBold, fontSize: 15 * finalScale },
                    ]}
                  >
                    Creating...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryText,
                    { fontFamily: fontBold, fontSize: 15 * finalScale },
                  ]}
                >
                  Create Recipe
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  safe: {
    flex: 1,
    backgroundColor: CREAM,
  },

  page: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },

  heroCard: {
    borderRadius: 24,
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  brandHeader: {
    alignItems: "center",
    marginBottom: 4,
  },

  brandLogo: {
    width: 120,
    height: 120,
  },

  h1: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },

  underline: {
    height: 3,
    width: 110,
    backgroundColor: CAMERA_GREEN,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 999,
  },

  introText: {
    color: MUTED,
    lineHeight: 21,
    fontWeight: "600",
  },

  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },

  sectionHeader: {
    marginBottom: 6,
  },

  label: {
    color: TEXT_DARK,
    fontWeight: "800",
  },

  helperInline: {
    marginTop: 4,
    color: MUTED,
    lineHeight: 18,
  },

  input: {
    marginTop: 8,
    backgroundColor: "#F5F6F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    color: "#111",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(31,76,71,0.08)",
    marginVertical: 18,
  },

  sectionTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },

  sectionHelper: {
    marginTop: 6,
    color: MUTED,
    lineHeight: 18,
    fontWeight: "600",
  },

  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.16)",
    backgroundColor: "#F4F6F3",
  },

  secondaryText: {
    color: "#28443F",
    fontWeight: "900",
  },

  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CAMERA_GREEN,
  },

  primaryBtnDisabled: {
    opacity: 0.6,
  },

  primaryText: {
    color: "white",
    fontWeight: "900",
  },

  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  pressed: {
    opacity: 0.86,
  },
});