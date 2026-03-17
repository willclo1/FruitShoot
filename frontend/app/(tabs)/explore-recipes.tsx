import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  ExploreRecipe,
  getExploreRecipes,
  saveRecipe,
  unsaveRecipe,
} from "@/services/exploreRecipes";
import {
  parseIngredients,
  parseInstructions,
} from "@/services/recipeFormat";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const CARD = "#FFFFFF";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";
const SOFT_GREEN = "#EEF2ED";
const SOFT_GREEN_2 = "#E4EBE2";
const SOFT_BORDER = "rgba(31,76,71,0.10)";
const SAVE_BG = "#E5ECE6";
const SAVE_BG_ACTIVE = "#1F4C47";

function formatSaveCount(count: number) {
  if (count === 1) return "1 save";
  return `${count} saves`;
}

function ExploreRecipeCard({
  item,
  onToggleSave,
  onOpen,
  busy,
  finalScale,
  fontRegular,
  fontBold,
  minHeight,
}: {
  item: ExploreRecipe;
  onToggleSave: () => void;
  onOpen: () => void;
  busy: boolean;
  finalScale: number;
  fontRegular: string;
  fontBold: string;
  minHeight: number;
}) {
  const ingredients = parseIngredients(item.ingredients_description).slice(0, 4);
  const steps = parseInstructions(item.instructions_description);
  const firstStep = steps[0];

  const previewLabel = useMemo(() => {
    if (ingredients.length >= 3) return "Popular match";
    if (steps.length >= 4) return "Detailed recipe";
    return "Community recipe";
  }, [ingredients.length, steps.length]);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        item.is_saved && styles.cardSaved,
        pressed && styles.cardPressed,
        busy && styles.cardBusy,
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.smallTag}>
            <Text
              style={[
                styles.smallTagText,
                { fontFamily: fontBold, fontSize: 11 * finalScale },
              ]}
            >
              {previewLabel}
            </Text>
          </View>

          <Text
            style={[
              styles.cardTitle,
              { fontFamily: fontBold, fontSize: 20 * finalScale },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            style={[
              styles.metaText,
              { fontFamily: fontRegular, fontSize: 13 * finalScale },
            ]}
          >
            {ingredients.length} ingredients · {steps.length} steps ·{" "}
            {formatSaveCount(item.save_count)}
          </Text>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          disabled={busy}
          style={({ pressed }) => [
            styles.saveButton,
            item.is_saved && styles.saveButtonActive,
            pressed && styles.pressed,
            { minHeight },
          ]}
        >
          <Text
            style={[
              styles.saveButtonText,
              item.is_saved && styles.saveButtonTextActive,
              { fontFamily: fontBold, fontSize: 12 * finalScale },
            ]}
          >
            {busy ? "..." : item.is_saved ? "Saved" : "Save"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionBlock}>
        <Text
          style={[
            styles.sectionLabel,
            { fontFamily: fontBold, fontSize: 12 * finalScale },
          ]}
        >
          Ingredients
        </Text>

        <View style={styles.pillWrap}>
          {ingredients.map((ingredient, idx) => (
            <View key={`${item.id}-ingredient-${idx}`} style={styles.pill}>
              <Text
                style={[
                  styles.pillText,
                  { fontFamily: fontRegular, fontSize: 12 * finalScale },
                ]}
                numberOfLines={1}
              >
                {ingredient}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!!firstStep && (
        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionLabel,
              { fontFamily: fontBold, fontSize: 12 * finalScale },
            ]}
          >
            Step 1 Preview
          </Text>

          <View style={styles.stepPreviewRow}>
            <View style={styles.stepBadge}>
              <Text
                style={[
                  styles.stepBadgeText,
                  { fontFamily: fontBold, fontSize: 12 * finalScale },
                ]}
              >
                1
              </Text>
            </View>

            <Text
              style={[
                styles.stepPreviewText,
                { fontFamily: fontRegular, fontSize: 13 * finalScale },
              ]}
              numberOfLines={3}
            >
              {firstStep}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text
          style={[
            styles.footerHint,
            { fontFamily: fontRegular, fontSize: 12 * finalScale },
          ]}
        >
          Tap to open full recipe
        </Text>

        <Text
          style={[
            styles.footerArrow,
            { fontFamily: fontBold, fontSize: 18 * finalScale },
          ]}
        >
          →
        </Text>
      </View>
    </Pressable>
  );
}

export default function ExploreRecipesScreen() {
  const router = useRouter();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [recipes, setRecipes] = useState<ExploreRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecipes = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await getExploreRecipes(30, 0);
      setRecipes(data);
    } catch (e: any) {
      Alert.alert("Explore", e?.message || "Could not load explore recipes");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const toggleSave = async (recipe: ExploreRecipe) => {
    try {
      setBusyId(recipe.id);

      if (recipe.is_saved) {
        await unsaveRecipe(recipe.id);
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id
              ? {
                  ...r,
                  is_saved: false,
                  save_count: Math.max(0, r.save_count - 1),
                }
              : r
          )
        );
      } else {
        await saveRecipe(recipe.id);
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id
              ? {
                  ...r,
                  is_saved: true,
                  save_count: r.save_count + 1,
                }
              : r
          )
        );
      }
    } catch (e: any) {
      Alert.alert("Explore", e?.message || "Could not update saved recipe");
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text
            style={[
              styles.heroBadgeText,
              { fontFamily: fontBold, fontSize: 11 * finalScale },
            ]}
          >
            COMMUNITY FEED
          </Text>
        </View>

        <Text
          style={[
            styles.screenTitle,
            { fontFamily: fontBold, fontSize: 28 * finalScale },
          ]}
        >
          Explore Recipes
        </Text>

        <Text
          style={[
            styles.subtitle,
            { fontFamily: fontRegular, fontSize: 14 * finalScale },
          ]}
        >
          Discover recipes shared by other users, save your favorites, and build
          your own collection.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text
              style={[
                styles.heroStatValue,
                { fontFamily: fontBold, fontSize: 18 * finalScale },
              ]}
            >
              {recipes.length}
            </Text>
            <Text
              style={[
                styles.heroStatLabel,
                { fontFamily: fontRegular, fontSize: 12 * finalScale },
              ]}
            >
              Loaded now
            </Text>
          </View>

          <View style={styles.heroStatCard}>
            <Text
              style={[
                styles.heroStatValue,
                { fontFamily: fontBold, fontSize: 18 * finalScale },
              ]}
            >
              {recipes.filter((r) => r.is_saved).length}
            </Text>
            <Text
              style={[
                styles.heroStatLabel,
                { fontFamily: fontRegular, fontSize: 12 * finalScale },
              ]}
            >
              Saved by you
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text
          style={[
            styles.feedLabel,
            { fontFamily: fontBold, fontSize: 16 * finalScale },
          ]}
        >
          For You
        </Text>

        <Pressable
          onPress={() => loadRecipes(true)}
          style={({ pressed }) => [styles.refreshChip, pressed && styles.pressed]}
        >
          <Text
            style={[
              styles.refreshChipText,
              { fontFamily: fontBold, fontSize: 12 * finalScale },
            ]}
          >
            Refresh
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRecipes(true)}
            tintColor={CAMERA_GREEN}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator />
              <Text
                style={[
                  styles.loadingText,
                  { fontFamily: fontRegular, fontSize: 14 * finalScale },
                ]}
              >
                Loading explore feed...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text
                style={[
                  styles.emptyTitle,
                  { fontFamily: fontBold, fontSize: 18 * finalScale },
                ]}
              >
                No explore recipes yet
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { fontFamily: fontRegular, fontSize: 13 * finalScale },
                ]}
              >
                Recipes from other users will appear here once people start
                sharing more.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ExploreRecipeCard
            item={item}
            busy={busyId === item.id}
            finalScale={finalScale}
            fontRegular={fontRegular}
            fontBold={fontBold}
            minHeight={tt.minHeight}
            onToggleSave={() => toggleSave(item)}
            onOpen={() => router.push(`/recipe?id=${item.id}&public=1`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 14,
  },

  headerWrap: {
    gap: 14,
    marginBottom: 4,
  },

  heroCard: {
    borderRadius: 26,
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    padding: 18,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: SOFT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  screenTitle: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: MUTED,
    lineHeight: 20,
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: SOFT_GREEN,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  heroStatValue: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
  heroStatLabel: {
    marginTop: 4,
    color: MUTED,
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedLabel: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  refreshChip: {
    backgroundColor: SOFT_GREEN_2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  refreshChipText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },

  loadingBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 6,
  },
  loadingText: { color: MUTED },

  emptyCard: {
    marginTop: 10,
    borderRadius: 22,
    backgroundColor: "#FBFCFA",
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    padding: 18,
  },
  emptyTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 8,
    color: MUTED,
    lineHeight: 20,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    backgroundColor: CARD,
    padding: 16,
  },
  cardSaved: {
    backgroundColor: "#FCFEFB",
    borderColor: "rgba(31,76,71,0.18)",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardBusy: {
    opacity: 0.75,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },

  smallTag: {
    alignSelf: "flex-start",
    backgroundColor: SOFT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  smallTagText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },

  cardTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  metaText: {
    marginTop: 6,
    color: MUTED,
  },

  saveButton: {
    minWidth: 74,
    backgroundColor: SAVE_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonActive: {
    backgroundColor: SAVE_BG_ACTIVE,
    borderColor: SAVE_BG_ACTIVE,
  },
  saveButtonText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
  saveButtonTextActive: {
    color: "#FFFFFF",
  },

  sectionBlock: {
    marginTop: 16,
    paddingTop: 2,
  },
  sectionLabel: {
    color: MUTED,
    fontWeight: "900",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: SOFT_GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    maxWidth: "100%",
  },
  pillText: {
    color: "#30423D",
    fontWeight: "700",
  },

  stepPreviewRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#F9FAF7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    padding: 12,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SOFT_GREEN_2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#2F4A44",
    fontWeight: "900",
  },
  stepPreviewText: {
    flex: 1,
    color: "#30403C",
    lineHeight: 19,
    fontWeight: "600",
  },

  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,76,71,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerHint: {
    color: MUTED,
  },
  footerArrow: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },

  pressed: { opacity: 0.86 },
});