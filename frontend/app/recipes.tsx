import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { getUserRecipes, Recipe } from "@/services/recipes";
import { getSavedRecipes, ExploreRecipe } from "@/services/exploreRecipes";
import {
  parseIngredients,
  parseInstructions,
} from "@/services/recipeFormat";
import { useFontStyle, useTouchTarget, useSettings } from "@/services/settingsContext";
import { tts } from "@/services/tts";
import TourTarget from "@/components/tutorial/TourTarget";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

type TabKey = "uploads" | "saved";
type RecipeLike = Recipe | ExploreRecipe;

type ParsedRecipe = {
  id: number;
  title: string;
  ingredients: string[];
  steps: string[];
  raw: RecipeLike;
};

function RecipeCard({
  item,
  onPress,
}: {
  item: ParsedRecipe;
  onPress: () => void;
}) {
  const previewIngredients = item.ingredients.slice(0, 3);
  const previewStep = item.steps[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.metaText}>
            {item.ingredients.length} ingredients · {item.steps.length} steps
          </Text>
        </View>
      </View>

      <View style={styles.pillWrap}>
        {previewIngredients.map((ingredient, idx) => (
          <View key={`${item.id}-ingredient-${idx}`} style={styles.pill}>
            <Text style={styles.pillText}>{ingredient}</Text>
          </View>
        ))}
      </View>

      {!!previewStep && (
        <View style={styles.stepPreviewRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.stepPreviewText} numberOfLines={3}>
            {previewStep}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function RecipesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;
  const { settings, loaded } = useSettings();

  const [tab, setTab] = useState<TabKey>(
    params.tab === "saved" ? "saved" : "uploads"
  );
  const [recipes, setRecipes] = useState<RecipeLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const parsedRecipes = useMemo<ParsedRecipe[]>(() => {
    return recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      ingredients: parseIngredients(recipe.ingredients_description || ""),
      steps: parseInstructions(recipe.instructions_description || ""),
      raw: recipe,
    }));
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parsedRecipes;

    return parsedRecipes.filter((item) => {
      const haystack = [item.title, ...item.ingredients, ...item.steps]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [parsedRecipes, query]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;

      (async () => {
        try {
          setLoading(true);

          const data =
            tab === "saved"
              ? await getSavedRecipes()
              : await getUserRecipes();

          if (!alive) return;
          setRecipes(data);
        } catch (e: any) {
          Alert.alert("Recipes", e?.message || "Could not load recipes");
        } finally {
          if (alive) setLoading(false);
        }
      })();

      return () => {
        alive = false;
      };
    }, [tab])
  );

  React.useEffect(() => {
    if (!loaded) return;
    tts.autoSay("Recipes. Browse your recipes. Use Create to add a new recipe or Import to bring one in.", { rate: settings.ttsRate, pitch: settings.ttsPitch });
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backLink,
              pressed && styles.backLinkPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
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

        <View style={styles.header}>
          <Text
            style={[
              styles.screenTitle,
              { fontFamily: fontBold, fontSize: 24 * finalScale },
            ]}
          >
            Recipes
          </Text>
        </View>

        <Text
          style={[
            styles.subtitle,
            { fontFamily: fontRegular, fontSize: 13 * finalScale },
          ]}
        >
          Browse quickly, then open a recipe when you want the full details.
        </Text>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => { tts.say("Create recipe", { rate: settings.ttsRate, pitch: settings.ttsPitch }); router.push("/create-recipe"); }}
            style={({ pressed }) => [
              styles.primaryActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.primaryActionText,
                { fontFamily: fontBold, fontSize: 14 * finalScale },
              ]}
            >
              + Create
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { tts.say("Import recipe", { rate: settings.ttsRate, pitch: settings.ttsPitch }); router.push("/upload-recipe"); }}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.secondaryActionText,
                { fontFamily: fontBold, fontSize: 14 * finalScale },
              ]}
            >
              Import
            </Text>
          </Pressable>
        </View>

        <View style={styles.segmentedRow}>
          {(["uploads", "saved"] as TabKey[]).map((item) => {
            const selected = tab === item;
            const button = (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  selected && styles.segmentButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextActive,
                    { fontFamily: fontBold, fontSize: 14 * finalScale },
                  ]}
                >
                  {item === "uploads" ? "My Uploads" : "Saved"}
                </Text>
              </Pressable>
            );

            if (item === "saved") {
              return (
                <TourTarget key="tour-saved-tab" id="recipes-saved-tab" order={5} text="Saved recipes tab" style={{ flex: 1 }}>
                  {button}
                </TourTarget>
              );
            }

            return button;
          })}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search recipes, ingredients, or steps"
            placeholderTextColor="#7C8782"
            style={[
              styles.searchInput,
              {
                fontFamily: fontRegular,
                fontSize: 14 * finalScale,
                minHeight: tt.minHeight,
              },
            ]}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <Text
              style={[
                styles.loadingText,
                { fontFamily: fontRegular, fontSize: 14 * finalScale },
              ]}
            >
              Loading recipes...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text
                  style={[
                    styles.emptyTitle,
                    { fontFamily: fontBold, fontSize: 16 * finalScale },
                  ]}
                >
                  {tab === "saved" ? "No saved recipes yet" : "No recipes yet"}
                </Text>

                <Text
                  style={[
                    styles.emptyText,
                    { fontFamily: fontRegular, fontSize: 13 * finalScale },
                  ]}
                >
                  {tab === "saved"
                    ? "Recipes you save from other users will appear here."
                    : "Create or import a recipe to start your library."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <RecipeCard
                item={item}
                onPress={() => {
                  tts.say(item.title, { rate: settings.ttsRate, pitch: settings.ttsPitch });
                  router.push(
                    tab === "saved"
                      ? `/recipe?id=${item.id}&public=1`
                      : `/recipe?id=${item.id}`
                  );
                }}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  topBar: {
    marginBottom: 14,
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  screenTitle: { color: CAMERA_GREEN, fontWeight: "900" },
  subtitle: { marginTop: 6, color: MUTED, lineHeight: 18 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: CAMERA_GREEN,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: { color: "#fff", fontWeight: "900" },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: "#F4F6F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.18)",
  },
  secondaryActionText: { color: "#28443F", fontWeight: "900" },

  segmentedRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EEF2ED",
    padding: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
  },
  segmentText: { color: "rgba(23,48,44,0.65)", fontWeight: "800" },
  segmentTextActive: { color: CAMERA_GREEN },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#F5F6F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    color: "#111",
  },

  loadingBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 24,
  },
  loadingText: { color: MUTED },

  listContent: { paddingTop: 14, paddingBottom: 24, gap: 12 },

  emptyCard: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    padding: 16,
  },
  emptyTitle: { color: TEXT_DARK, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, lineHeight: 20 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: "900", color: TEXT_DARK },
  metaText: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "700" },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  pill: {
    borderRadius: 999,
    backgroundColor: "#EEF1EC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  pillText: { color: "#30423D", fontSize: 12, fontWeight: "700" },

  stepPreviewRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5ECE6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#2F4A44", fontSize: 12, fontWeight: "900" },
  stepPreviewText: {
    flex: 1,
    color: "#30403C",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  pressed: { opacity: 0.86 },
});