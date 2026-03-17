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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

import { IngredientsInputList } from "@/components/ingredients-input-list";
import { NumberedStepsInput } from "@/components/numbered-steps-input";
import { clipFromUrl } from "@/services/clip";
import { createRecipe } from "@/services/recipes";
import {
  ingredientsToDescription,
  instructionsToDescription,
  parseIngredients,
  parseInstructions,
} from "@/services/recipeFormat";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

export default function UploadRecipeScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [recipeUrl, setRecipeUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const canImport = useMemo(
    () => recipeUrl.trim().length > 0 && !importing && !submitting,
    [recipeUrl, importing, submitting]
  );

  const canSubmit = useMemo(
    () =>
      title.trim().length > 0 &&
      ingredients.some((i) => i.trim().length > 0) &&
      instructions.some((i) => i.trim().length > 0) &&
      !submitting &&
      !importing,
    [title, ingredients, instructions, submitting, importing]
  );

  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay(
        "Upload Recipe screen. Paste a URL to import, or fill in the fields manually."
      );
    }, [
      loaded,
      settings.ttsEnabled,
      settings.ttsMode,
      settings.ttsRate,
      settings.ttsPitch,
    ])
  );

  const onImport = async () => {
    const url = recipeUrl.trim();
    if (!url) {
      Alert.alert("Import Recipe", "Paste a recipe URL.");
      return;
    }

    try {
      setImporting(true);
      tts.say("Importing recipe. Please wait.");

      const res = await clipFromUrl({ url, ml_disable: true });

      setTitle(res.recipe.title || "");
      setIngredients(
        parseIngredients(res.recipe.ingredients_description || "").length
          ? parseIngredients(res.recipe.ingredients_description || "")
          : [""]
      );
      setInstructions(
        parseInstructions(res.recipe.instructions_description || "").length
          ? parseInstructions(res.recipe.instructions_description || "")
          : [""]
      );

      tts.say("Recipe imported. Review the fields, then tap Submit.");
      Alert.alert("Import Recipe", "Imported! Review and edit, then submit.");
    } catch (e: any) {
      Alert.alert("Import Recipe", e?.message || "Could not import recipe.");
    } finally {
      setImporting(false);
    }
  };

  const onSubmit = async () => {
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanInstructions = instructions.map((i) => i.trim()).filter(Boolean);

    if (!title.trim() || !cleanIngredients.length || !cleanInstructions.length) {
      Alert.alert(
        "Upload Recipe",
        "Please fill out title, ingredients, and instructions."
      );
      return;
    }

    try {
      setSubmitting(true);
      tts.say("Submitting recipe. Please wait.");

      await createRecipe(
        title.trim(),
        ingredientsToDescription(cleanIngredients),
        instructionsToDescription(cleanInstructions)
      );

      tts.say("Recipe submitted successfully.");
      Alert.alert("Upload Recipe", "Recipe submitted!");
      router.back();
    } catch (e: any) {
      Alert.alert("Upload Recipe", e?.message || "Could not submit recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const showReplay = loaded && settings.ttsEnabled;

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

            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.h1,
                  { fontFamily: fontBold, fontSize: 24 * finalScale },
                ]}
              >
                Upload Recipe
              </Text>

              {showReplay && (
                <Pressable
                  style={[
                    styles.replayButton,
                    {
                      minHeight: tt.minHeight,
                      paddingHorizontal: tt.paddingHorizontal,
                      borderRadius: tt.borderRadius,
                    },
                  ]}
                  onPress={() =>
                    tts.say(
                      "Upload Recipe screen. Paste a URL to import, or fill in manually, then tap Submit."
                    )
                  }
                >
                  <Text
                    style={[
                      styles.replayText,
                      { fontFamily: fontBold, fontSize: 13 * finalScale },
                    ]}
                  >
                    Replay
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.underline} />

            <Text
              style={[
                styles.introText,
                { fontFamily: fontRegular, fontSize: 14 * finalScale },
              ]}
            >
              Import a recipe from a link or fill everything in manually before
              saving it to your recipe collection.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.importCard}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: fontBold, fontSize: 16 * finalScale },
                ]}
              >
                Import from URL
              </Text>

              <Text
                style={[
                  styles.sectionHelper,
                  { fontFamily: fontRegular, fontSize: 12 * finalScale },
                ]}
              >
                Paste a recipe link and the fields below will be filled in
                automatically.
              </Text>

              <TextInput
                value={recipeUrl}
                onChangeText={setRecipeUrl}
                placeholder="https://www.allrecipes.com/recipe/..."
                placeholderTextColor="#7C8782"
                style={[
                  styles.input,
                  {
                    fontFamily: fontRegular,
                    fontSize: 15 * finalScale,
                    minHeight: tt.minHeight,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!importing && !submitting}
              />

              <Pressable
                onPress={onImport}
                style={({ pressed }) => [
                  styles.importBtn,
                  {
                    minHeight: tt.minHeight,
                    borderRadius: tt.borderRadius,
                  },
                  (!canImport || importing) && styles.primaryBtnDisabled,
                  pressed && styles.pressed,
                ]}
                disabled={!canImport || importing || submitting}
              >
                {importing ? (
                  <View style={styles.submitRow}>
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={[
                        styles.primaryText,
                        { fontFamily: fontBold, fontSize: 15 * finalScale },
                      ]}
                    >
                      Importing...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.primaryText,
                      { fontFamily: fontBold, fontSize: 15 * finalScale },
                    ]}
                  >
                    Import
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.divider} />

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
                Edit the recipe title if needed
              </Text>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Banana Bread"
              placeholderTextColor="#7C8782"
              style={[
                styles.input,
                {
                  fontFamily: fontRegular,
                  fontSize: 15 * finalScale,
                  minHeight: tt.minHeight,
                },
              ]}
              editable={!submitting && !importing}
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
              Add one ingredient per line for a cleaner recipe layout.
            </Text>

            <IngredientsInputList
              values={ingredients}
              onChange={setIngredients}
              disabled={submitting || importing}
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
              Keep each step separate so it stays easy to read and edit.
            </Text>

            <NumberedStepsInput
              steps={instructions}
              onChange={setInstructions}
              disabled={submitting || importing}
            />
          </View>

          <View style={styles.btnRow}>
            <Pressable
              onPress={() => {
                tts.say("Cancelled.");
                router.back();
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  minHeight: tt.minHeight,
                  borderRadius: tt.borderRadius,
                },
                pressed && styles.pressed,
              ]}
              disabled={submitting || importing}
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
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  minHeight: tt.minHeight,
                  borderRadius: tt.borderRadius,
                },
                (!canSubmit || submitting || importing) &&
                  styles.primaryBtnDisabled,
                pressed && styles.pressed,
              ]}
              disabled={!canSubmit || submitting || importing}
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
                    Submitting...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryText,
                    { fontFamily: fontBold, fontSize: 15 * finalScale },
                  ]}
                >
                  Submit
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

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  h1: {
    fontWeight: "900",
    color: CAMERA_GREEN,
    flexShrink: 1,
  },

  underline: {
    height: 3,
    width: 120,
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

  replayButton: {
    backgroundColor: "#2F3D39",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  replayText: {
    color: "#fff",
    fontWeight: "800",
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

  importCard: {
    borderRadius: 18,
    backgroundColor: "#FBFCF9",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    padding: 14,
  },

  sectionHeader: {
    marginBottom: 6,
  },

  sectionTitle: {
    fontWeight: "900",
    color: TEXT_DARK,
  },

  sectionHelper: {
    marginTop: 6,
    color: MUTED,
    lineHeight: 18,
    fontWeight: "600",
  },

  helperInline: {
    marginTop: 4,
    color: MUTED,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(31,76,71,0.08)",
    marginVertical: 18,
  },

  label: {
    fontWeight: "800",
    color: TEXT_DARK,
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

  importBtn: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CAMERA_GREEN,
    paddingVertical: 12,
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
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.18)",
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

  pressed: {
    opacity: 0.86,
  },

  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});