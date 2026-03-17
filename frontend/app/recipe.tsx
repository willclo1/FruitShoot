import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { IngredientsInputList } from "@/components/ingredients-input-list";
import { NumberedStepsInput } from "@/components/numbered-steps-input";
import {
  deleteRecipe,
  getPublicRecipe,
  getRecipe,
  PublicRecipe,
  Recipe,
  updateRecipe,
} from "@/services/recipes";
import { saveRecipe, unsaveRecipe } from "@/services/exploreRecipes";
import {
  ingredientsToDescription,
  instructionsToDescription,
  parseIngredients,
  parseInstructions,
} from "@/services/recipeFormat";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

type AnyRecipe = Recipe | PublicRecipe;

export default function RecipeScreen() {
  const router = useRouter();
  const { id, edit, public: isPublicParam } = useLocalSearchParams<{
    id?: string;
    edit?: string;
    public?: string;
  }>();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [recipe, setRecipe] = useState<AnyRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);

  const isEditing = edit === "1";
  const isPublic = isPublicParam === "1";

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;

      (async () => {
        try {
          setLoading(true);

          const found = isPublic
            ? await getPublicRecipe(Number(id))
            : await getRecipe(Number(id));

          if (!alive) return;

          setRecipe(found);
          setTitle(found.title || "");
          setIngredients(
            parseIngredients(found.ingredients_description || "").length
              ? parseIngredients(found.ingredients_description || "")
              : [""]
          );
          setSteps(
            parseInstructions(found.instructions_description || "").length
              ? parseInstructions(found.instructions_description || "")
              : [""]
          );
        } catch (e: any) {
          Alert.alert("Recipe", e?.message || "Could not load recipe");
        } finally {
          if (alive) setLoading(false);
        }
      })();

      return () => {
        alive = false;
      };
    }, [id, isPublic])
  );

  const canSave = useMemo(() => {
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanSteps = steps.map((i) => i.trim()).filter(Boolean);
    return (
      title.trim().length > 0 &&
      cleanIngredients.length > 0 &&
      cleanSteps.length > 0 &&
      !submitting
    );
  }, [title, ingredients, steps, submitting]);

  const onDelete = () => {
    if (!recipe || isPublic) return;

    Alert.alert("Delete Recipe", "Delete this recipe permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSubmitting(true);
            await deleteRecipe(recipe.id);
            router.replace("/recipes");
          } catch (e: any) {
            Alert.alert("Recipe", e?.message || "Could not delete recipe");
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const onSaveEdit = async () => {
    if (!recipe || isPublic) return;

    const cleanTitle = title.trim();
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanSteps = steps.map((i) => i.trim()).filter(Boolean);

    if (!cleanTitle || !cleanIngredients.length || !cleanSteps.length) {
      Alert.alert("Recipe", "Please complete name, ingredients, and instructions.");
      return;
    }

    try {
      setSubmitting(true);

      const updated = await updateRecipe(
        recipe.id,
        cleanTitle,
        ingredientsToDescription(cleanIngredients),
        instructionsToDescription(cleanSteps)
      );

      setRecipe(updated);
      router.replace(`/recipe?id=${updated.id}`);
    } catch (e: any) {
      Alert.alert("Recipe", e?.message || "Could not update recipe");
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleSaved = async () => {
    if (!recipe || !isPublic) return;

    try {
      setSubmitting(true);

      const publicRecipe = recipe as PublicRecipe;

      if (publicRecipe.is_saved) {
        await unsaveRecipe(recipe.id);
        setRecipe({
          ...publicRecipe,
          is_saved: false,
          save_count: Math.max(0, publicRecipe.save_count - 1),
        });
      } else {
        await saveRecipe(recipe.id);
        setRecipe({
          ...publicRecipe,
          is_saved: true,
          save_count: publicRecipe.save_count + 1,
        });
      }
    } catch (e: any) {
      Alert.alert("Recipe", e?.message || "Could not update saved recipe");
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    if (isEditing && recipe?.id) {
      router.replace(`/recipe?id=${recipe.id}`);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text
            style={[
              styles.loadingText,
              { fontFamily: fontRegular, fontSize: 14 * finalScale },
            ]}
          >
            Loading recipe...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text
            style={[
              styles.emptyTitle,
              { fontFamily: fontBold, fontSize: 18 * finalScale },
            ]}
          >
            Recipe not found
          </Text>

          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text
              style={[
                styles.primaryButtonText,
                { fontFamily: fontBold, fontSize: 14 * finalScale },
              ]}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isEditing && !isPublic) {
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
            <View style={styles.topBar}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backLink,
                  pressed && styles.backLinkPressed,
                ]}
              >
                <Text
                  style={[
                    styles.backLinkText,
                    { fontFamily: fontBold, fontSize: 17 * finalScale },
                  ]}
                >
                  ← Back
                </Text>
              </Pressable>
            </View>

            <View style={styles.heroCard}>
              <Text
                style={[
                  styles.heroTitle,
                  { fontFamily: fontBold, fontSize: 24 * finalScale },
                ]}
              >
                Edit Recipe
              </Text>
              <View style={styles.heroUnderline} />
              <Text
                style={[
                  styles.heroSubtitle,
                  { fontFamily: fontRegular, fontSize: 14 * finalScale },
                ]}
              >
                Update your recipe and save the changes when you are ready.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: fontBold, fontSize: 16 * finalScale },
                ]}
              >
                Recipe Name
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Recipe name"
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
                  styles.helperText,
                  { fontFamily: fontRegular, fontSize: 12 * finalScale },
                ]}
              >
                Add one ingredient per line.
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
                  styles.helperText,
                  { fontFamily: fontRegular, fontSize: 12 * finalScale },
                ]}
              >
                Keep each step separate so it stays easy to read.
              </Text>

              <NumberedStepsInput
                steps={steps}
                onChange={setSteps}
                disabled={submitting}
              />
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => router.replace(`/recipe?id=${recipe.id}`)}
                style={styles.secondaryButton}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { fontFamily: fontBold, fontSize: 15 * finalScale },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={onSaveEdit}
                style={[
                  styles.primaryButton,
                  (!canSave || submitting) && styles.disabled,
                ]}
                disabled={!canSave || submitting}
              >
                {submitting ? (
                  <View style={styles.submitRow}>
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { fontFamily: fontBold, fontSize: 15 * finalScale },
                      ]}
                    >
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { fontFamily: fontBold, fontSize: 15 * finalScale },
                    ]}
                  >
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={{ height: 28 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const parsedIngredients = parseIngredients(recipe.ingredients_description || "");
  const parsedSteps = parseInstructions(recipe.instructions_description || "");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backLink,
              pressed && styles.backLinkPressed,
            ]}
          >
            <Text
              style={[
                styles.backLinkText,
                { fontFamily: fontBold, fontSize: 17 * finalScale },
              ]}
            >
              ← Back
            </Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text
            style={[
              styles.heroTitle,
              { fontFamily: fontBold, fontSize: 26 * finalScale },
            ]}
          >
            {recipe.title}
          </Text>

          <Text
            style={[
              styles.metaText,
              { fontFamily: fontRegular, fontSize: 13 * finalScale },
            ]}
          >
            {parsedIngredients.length} ingredients · {parsedSteps.length} steps
          </Text>

          {isPublic && "is_saved" in recipe && (
            <View style={styles.publicMetaRow}>
              <Text style={styles.publicMetaText}>{recipe.save_count} saves</Text>

              <Pressable
                onPress={onToggleSaved}
                style={[styles.secondaryButtonSmall, submitting && styles.disabled]}
                disabled={submitting}
              >
                <Text style={styles.secondaryButtonSmallText}>
                  {recipe.is_saved ? "Saved" : "Save"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text
            style={[
              styles.sectionTitle,
              { fontFamily: fontBold, fontSize: 17 * finalScale },
            ]}
          >
            Ingredients
          </Text>

          <View style={styles.ingredientsWrap}>
            {parsedIngredients.map((item, idx) => (
              <View key={`${recipe.id}-ingredient-${idx}`} style={styles.pill}>
                <Text
                  style={[
                    styles.pillText,
                    { fontFamily: fontRegular, fontSize: 13 * finalScale },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text
            style={[
              styles.sectionTitle,
              { fontFamily: fontBold, fontSize: 17 * finalScale },
            ]}
          >
            Instructions
          </Text>

          <View style={styles.stepsList}>
            {parsedSteps.map((step, idx) => (
              <View key={`${recipe.id}-step-${idx}`} style={styles.stepRow}>
                <View style={styles.stepBadgeLarge}>
                  <Text
                    style={[
                      styles.stepBadgeText,
                      { fontFamily: fontBold, fontSize: 12 * finalScale },
                    ]}
                  >
                    {idx + 1}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stepText,
                    { fontFamily: fontRegular, fontSize: 14 * finalScale },
                  ]}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {!isPublic && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.replace(`/recipe?id=${recipe.id}&edit=1`)}
              style={styles.secondaryButton}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { fontFamily: fontBold, fontSize: 15 * finalScale },
                ]}
              >
                Edit
              </Text>
            </Pressable>

            <Pressable
              onPress={onDelete}
              style={[styles.deleteButton, submitting && styles.disabled]}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.deleteButtonText,
                  { fontFamily: fontBold, fontSize: 15 * finalScale },
                ]}
              >
                {submitting ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: CREAM },
  page: { padding: 20, gap: 16, paddingBottom: 32 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: MUTED },
  emptyTitle: { color: TEXT_DARK, fontWeight: "900" },

  topBar: {
    marginBottom: 2,
  },
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backLinkText: {
    color: "#2A5C56",
    fontWeight: "900",
  },
  backLinkPressed: {
    opacity: 0.65,
  },

  heroCard: {
    borderRadius: 24,
    backgroundColor: "#FFFDF9",
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  heroTitle: { color: CAMERA_GREEN, fontWeight: "900" },
  heroUnderline: {
    height: 3,
    width: 110,
    backgroundColor: CAMERA_GREEN,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 999,
  },
  heroSubtitle: { color: MUTED, lineHeight: 21, fontWeight: "600" },
  metaText: { marginTop: 8, color: MUTED },

  publicMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  publicMetaText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },

  sectionCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  sectionTitle: { color: TEXT_DARK, fontWeight: "900", marginBottom: 12 },
  helperText: { marginTop: -4, marginBottom: 10, color: MUTED, lineHeight: 18 },

  divider: { height: 1, backgroundColor: "rgba(31,76,71,0.08)", marginVertical: 18 },

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

  ingredientsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    backgroundColor: "#EEF1EC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  pillText: { color: "#30423D" },

  stepsList: { gap: 12 },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepBadgeLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E5ECE6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#2F4A44", fontWeight: "900" },
  stepText: { flex: 1, color: "#30403C", lineHeight: 21 },

  actionRow: { flexDirection: "row", gap: 12 },
  submitRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  primaryButton: {
    flex: 1,
    backgroundColor: CAMERA_GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "900" },

  secondaryButton: {
    flex: 1,
    backgroundColor: "#F4F6F3",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.18)",
  },
  secondaryButtonText: { color: "#28443F", fontWeight: "900" },

  secondaryButtonSmall: {
    backgroundColor: "#F4F6F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.18)",
  },
  secondaryButtonSmallText: {
    color: "#28443F",
    fontWeight: "900",
    fontSize: 13,
  },

  deleteButton: {
    flex: 1,
    backgroundColor: "#F5ECE8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(159,112,97,0.30)",
  },
  deleteButtonText: { color: "#8D4D42", fontWeight: "900" },

  disabled: { opacity: 0.6 },
});