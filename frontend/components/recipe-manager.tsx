import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { IngredientsInputList } from "@/components/ingredients-input-list";
import { NumberedStepsInput } from "@/components/numbered-steps-input";
import { getFruitInventory } from "@/services/inventory";
import {
  createRecipe,
  deleteRecipe,
  getUserRecipes,
  Recipe,
  updateRecipe,
} from "@/services/recipes";
import {
  ingredientsToDescription,
  instructionsToDescription,
  isLikelyFruit,
  normalizeFruit,
  parseIngredients,
  parseInstructions,
  pickRandomItems,
  recipeMatchesAnyFruit,
} from "@/services/recipeFormat";

type RecipeManagerProps = {
  title?: string;
  currentFruit?: string;
  allowCreateInline?: boolean;
};

export function RecipeManager({
  title = "My Recipes",
  currentFruit,
  allowCreateInline = false,
}: RecipeManagerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIngredients, setEditIngredients] = useState<string[]>([""]);
  const [editSteps, setEditSteps] = useState<string[]>([""]);

  const [newTitle, setNewTitle] = useState("");
  const [newIngredients, setNewIngredients] = useState<string[]>([""]);
  const [newSteps, setNewSteps] = useState<string[]>([""]);

  const [suggestedIds, setSuggestedIds] = useState<number[]>([]);
  const [lastSuggestionReason, setLastSuggestionReason] = useState<string>("");

  const suggestedRecipes = useMemo(
    () => recipes.filter((recipe) => suggestedIds.includes(recipe.id)),
    [recipes, suggestedIds]
  );

  const loadRecipes = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserRecipes();
      setRecipes(data);
    } catch (e: any) {
      Alert.alert("Recipes", e?.message || "Could not load recipes");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const beginEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setEditTitle(recipe.title);
    setEditIngredients(parseIngredients(recipe.ingredients_description).length
      ? parseIngredients(recipe.ingredients_description)
      : [""]);
    setEditSteps(parseInstructions(recipe.instructions_description).length
      ? parseInstructions(recipe.instructions_description)
      : [""]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditIngredients([""]);
    setEditSteps([""]);
  };

  const saveEdit = async (recipeId: number) => {
    const title = editTitle.trim();
    const ingredients = editIngredients.map((item) => item.trim()).filter(Boolean);
    const steps = editSteps.map((item) => item.trim()).filter(Boolean);

    if (!title || ingredients.length === 0 || steps.length === 0) {
      Alert.alert("Recipes", "Title, ingredients, and instructions are required.");
      return;
    }

    try {
      setSaving(true);
      const updated = await updateRecipe(
        recipeId,
        title,
        ingredientsToDescription(ingredients),
        instructionsToDescription(steps)
      );

      setRecipes((prev) => prev.map((recipe) => (recipe.id === recipeId ? updated : recipe)));
      cancelEdit();
    } catch (e: any) {
      Alert.alert("Recipes", e?.message || "Could not update recipe");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (recipeId: number) => {
    Alert.alert("Delete Recipe", "Delete this recipe permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteRecipe(recipeId);
            setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId));
            setSuggestedIds((prev) => prev.filter((id) => id !== recipeId));
          } catch (e: any) {
            Alert.alert("Recipes", e?.message || "Could not delete recipe");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const createInlineRecipe = async () => {
    const title = newTitle.trim();
    const ingredients = newIngredients.map((item) => item.trim()).filter(Boolean);
    const steps = newSteps.map((item) => item.trim()).filter(Boolean);

    if (!title || ingredients.length === 0 || steps.length === 0) {
      Alert.alert("Recipes", "Title, ingredients, and instructions are required.");
      return;
    }

    try {
      setSaving(true);
      const created = await createRecipe(
        title,
        ingredientsToDescription(ingredients),
        instructionsToDescription(steps)
      );

      setRecipes((prev) => [created, ...prev]);
      setNewTitle("");
      setNewIngredients([""]);
      setNewSteps([""]);
    } catch (e: any) {
      Alert.alert("Recipes", e?.message || "Could not create recipe");
    } finally {
      setSaving(false);
    }
  };

  const suggestRecipes = async () => {
    if (!recipes.length) {
      Alert.alert("Suggest Recipes", "Create a recipe first to get suggestions.");
      return;
    }

    const inventory = await getFruitInventory();
    const activeFruits = [...inventory];

    if (currentFruit && isLikelyFruit(currentFruit)) {
      const normalized = normalizeFruit(currentFruit);
      if (!activeFruits.includes(normalized)) {
        activeFruits.push(normalized);
      }
    }

    if (!activeFruits.length) {
      setSuggestedIds([]);
      setLastSuggestionReason("No fruit inventory yet. Upload fruit images to build your inventory.");
      return;
    }

    const matching = recipes.filter((recipe) =>
      recipeMatchesAnyFruit(recipe.ingredients_description, activeFruits)
    );

    if (!matching.length) {
      setSuggestedIds([]);
      setLastSuggestionReason("No recipes match your current fruit inventory.");
      return;
    }

    const randomPick = pickRandomItems(matching, Math.min(2, matching.length));
    setSuggestedIds(randomPick.map((item) => item.id));
    setLastSuggestionReason(`Suggestions based on: ${activeFruits.join(", ")}`);
  };

  const formatFruitLabel = (value: string) =>
    value.replace(/(^|\s)\S/g, (char) => char.toUpperCase());

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Recipe Library</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.headerNote}>
              Save, refine, and revisit recipes matched to what you have on hand.
            </Text>
          </View>

          <Pressable
            onPress={suggestRecipes}
            style={({ pressed }) => [styles.suggestButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Suggest recipes"
          >
            <Text style={styles.suggestText}>Suggest Recipes</Text>
          </Pressable>
        </View>
      </View>

      {!!lastSuggestionReason && <Text style={styles.reasonText}>{lastSuggestionReason}</Text>}

      {suggestedRecipes.length > 0 && (
        <View style={styles.suggestionsBlock}>
          <View style={styles.suggestionsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Suggested Recipes</Text>
              <Text style={styles.sectionNote}>Random picks filtered by your available fruits.</Text>
            </View>
            <View style={styles.suggestionBadge}>
              <Text style={styles.suggestionBadgeText}>{suggestedRecipes.length} ready now</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionScrollContent}
          >
          {suggestedRecipes.map((recipe) => (
            <View key={`suggested-${recipe.id}`} style={styles.suggestionCard}>
              <View style={styles.suggestionCardTopRow}>
                <Text style={styles.suggestionCardTitle}>{recipe.title}</Text>
                <View style={styles.inlineTag}>
                  <Text style={styles.inlineTagText}>Suggested</Text>
                </View>
              </View>

              <View style={styles.pillWrap}>
                {parseIngredients(recipe.ingredients_description)
                  .slice(0, 3)
                  .map((item, idx) => (
                    <View key={`suggested-ingredient-${recipe.id}-${idx}`} style={styles.ingredientPillMuted}>
                      <Text style={styles.ingredientPillTextMuted}>{item}</Text>
                    </View>
                  ))}
              </View>

              {parseInstructions(recipe.instructions_description)
                .slice(0, 1)
                .map((step, idx) => (
                  <View key={`suggested-step-${recipe.id}-${idx}`} style={styles.suggestionStepPreview}>
                    <View style={styles.stepBadgeSoft}>
                      <Text style={styles.stepBadgeSoftText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.suggestionStepText}>{step}</Text>
                  </View>
                ))}
            </View>
          ))}
          </ScrollView>
        </View>
      )}

      {allowCreateInline && (
        <View style={styles.inlineCreateCard}>
          <Text style={styles.sectionTitle}>Quick Create</Text>

          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g., Strawberry Oat Bowl"
            placeholderTextColor="#666"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.label}>Ingredients</Text>
          <IngredientsInputList
            values={newIngredients}
            onChange={setNewIngredients}
            disabled={saving}
          />

          <Text style={styles.label}>Instructions</Text>
          <NumberedStepsInput steps={newSteps} onChange={setNewSteps} disabled={saving} />

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={createInlineRecipe}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Create recipe"
          >
            <Text style={styles.saveButtonText}>Create Recipe</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <Text style={styles.emptyText}>No recipes yet.</Text>
      ) : (
        <View style={styles.recipeList}>
          {recipes.map((recipe) => {
            const isEditing = editingId === recipe.id;
            const isSuggested = suggestedIds.includes(recipe.id);
            const ingredients = parseIngredients(recipe.ingredients_description);
            const steps = parseInstructions(recipe.instructions_description);

            return (
              <View key={recipe.id} style={[styles.card, isSuggested && styles.cardSuggested]}>
                {isEditing ? (
                  <>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.cardTitle}>Editing Recipe</Text>
                        <Text style={styles.metaText}>Update the details below, then save.</Text>
                      </View>
                      <View style={styles.inlineTagMuted}>
                        <Text style={styles.inlineTagMutedText}>Draft</Text>
                      </View>
                    </View>

                    <Text style={styles.label}>Recipe Name</Text>
                    <TextInput
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Recipe name"
                      placeholderTextColor="#666"
                      style={styles.input}
                      editable={!saving}
                    />

                    <Text style={styles.label}>Ingredients</Text>
                    <IngredientsInputList
                      values={editIngredients}
                      onChange={setEditIngredients}
                      disabled={saving}
                    />

                    <Text style={styles.label}>Instructions</Text>
                    <NumberedStepsInput
                      steps={editSteps}
                      onChange={setEditSteps}
                      disabled={saving}
                    />

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={cancelEdit}
                        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                        disabled={saving}
                      >
                        <Text style={styles.secondaryText}>Cancel</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => saveEdit(recipe.id)}
                        style={({ pressed }) => [
                          styles.saveButton,
                          saving && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                        disabled={saving}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeadingWrap}>
                        <Text style={styles.cardTitle}>{recipe.title}</Text>
                        <Text style={styles.metaText}>Created recipe</Text>
                      </View>

                      {isSuggested && (
                        <View style={styles.inlineTag}>
                          <Text style={styles.inlineTagText}>Suggested</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.contentSection}>
                      <Text style={styles.subTitle}>Ingredients</Text>
                      <View style={styles.pillWrap}>
                        {ingredients.map((item, idx) => (
                          <View key={`${recipe.id}-ingredient-${idx}`} style={styles.ingredientPill}>
                            <Text style={styles.ingredientPillText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.contentSection}>
                      <Text style={styles.subTitle}>Instructions</Text>
                      <View style={styles.stepsList}>
                        {steps.map((step, idx) => (
                          <View key={`${recipe.id}-step-${idx}`} style={styles.stepRowCard}>
                            <View style={styles.stepBadge}>
                              <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => beginEdit(recipe)}
                        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                        disabled={saving}
                      >
                        <Text style={styles.secondaryText}>Edit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => confirmDelete(recipe.id)}
                        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                        disabled={saving}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 8, gap: 14 },

  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.1)",
    backgroundColor: "rgba(255,255,255,0.82)",
    padding: 16,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(31,76,71,0.56)",
  },

  title: { fontSize: 20, fontWeight: "900", color: "#1F4C47" },
  headerNote: {
    color: "rgba(14,29,27,0.62)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  suggestButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#E5ECE6",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
  },
  suggestText: { color: "#23423D", fontWeight: "900", fontSize: 12 },

  reasonText: {
    color: "rgba(14,29,27,0.64)",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 4,
  },

  suggestionsBlock: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(92,112,93,0.2)",
    backgroundColor: "#F2F4EF",
    paddingVertical: 14,
    gap: 12,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  suggestionCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(92,112,93,0.18)",
    backgroundColor: "#FBFCFA",
    padding: 14,
    gap: 10,
  },
  suggestionScrollContent: { paddingHorizontal: 14, gap: 10 },
  suggestionCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  suggestionCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#203B36",
  },
  suggestionStepPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  suggestionStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#44524D",
    fontWeight: "600",
  },

  inlineCreateCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  sectionTitle: {
    fontSize: 16,
    color: "#1F4C47",
    fontWeight: "900",
    marginBottom: 2,
  },
  sectionNote: { color: "rgba(14,29,27,0.56)", fontSize: 12, fontWeight: "600" },
  suggestionBadge: {
    borderRadius: 999,
    backgroundColor: "#E0E7DE",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  suggestionBadgeText: { color: "#4D6156", fontSize: 11, fontWeight: "900" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  loadingText: { color: "rgba(14,29,27,0.65)", fontWeight: "700" },

  emptyText: {
    color: "rgba(14,29,27,0.58)",
    fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 16,
    padding: 16,
    lineHeight: 20,
  },

  recipeList: { gap: 12 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    backgroundColor: "white",
    padding: 16,
    gap: 12,
    shadowColor: "#16302B",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardSuggested: {
    backgroundColor: "#FAFBF8",
    borderColor: "rgba(92,112,93,0.24)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardHeadingWrap: { flex: 1 },

  cardTitle: { fontSize: 18, fontWeight: "900", color: "#1E3A35" },
  cardBody: { color: "#43534F", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  metaText: { marginTop: 4, color: "rgba(14,29,27,0.54)", fontSize: 12, fontWeight: "700" },
  subTitle: { fontWeight: "900", color: "#203530", fontSize: 13, marginBottom: 8 },
  contentSection: {
    borderRadius: 14,
    backgroundColor: "#F8F8F5",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.07)",
    padding: 12,
  },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ingredientPill: {
    borderRadius: 999,
    backgroundColor: "#EEF1EC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  ingredientPillText: { color: "#30423D", fontSize: 12, fontWeight: "700" },
  ingredientPillMuted: {
    borderRadius: 999,
    backgroundColor: "#E7ECE5",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ingredientPillTextMuted: { color: "#52665C", fontSize: 12, fontWeight: "700" },
  stepsList: { gap: 10 },
  stepRowCard: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5ECE6",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepBadgeText: { color: "#2F4A44", fontSize: 12, fontWeight: "900" },
  stepBadgeSoft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E7DE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeSoftText: { color: "#4B6056", fontSize: 11, fontWeight: "900" },
  stepText: { flex: 1, color: "#30403C", fontSize: 13, lineHeight: 19, fontWeight: "600" },

  label: { marginTop: 8, fontSize: 13, fontWeight: "900", color: "#1D2E2A" },
  input: {
    marginTop: 6,
    backgroundColor: "#F2F3F0",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111",
    fontSize: 14,
  },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 2 },

  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.18)",
    backgroundColor: "#F4F6F3",
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryText: { color: "#28443F", fontWeight: "900" },

  saveButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#1F4C47",
    alignItems: "center",
    paddingVertical: 12,
  },
  saveButtonText: { color: "white", fontWeight: "900" },

  deleteButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(159,112,97,0.3)",
    backgroundColor: "#F5ECE8",
    alignItems: "center",
    paddingVertical: 12,
  },
  deleteText: { color: "#8D4D42", fontWeight: "900" },

  inlineTag: {
    borderRadius: 999,
    backgroundColor: "#E4EBE2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineTagText: { color: "#53675D", fontSize: 11, fontWeight: "900" },
  inlineTagMuted: {
    borderRadius: 999,
    backgroundColor: "#EFEFEA",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineTagMutedText: { color: "#68706B", fontSize: 11, fontWeight: "900" },

  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.82 },
});