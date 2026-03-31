import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import TourTarget from "@/components/tutorial/TourTarget";

// ─── Palette (matches app: ResultsScreen / HomeScreen) ──────────────────────
const BRAND        = "#1F4C47";   // app's primary green
const GREEN_MID    = "#2A5C56";   // used for back links, secondary text
const CREAM_BG     = "#F6F3EE";   // matches BG in ResultsScreen
const CARD_BG      = "#FFFFFF";
const CARD_SAVED   = "#F4FAF7";
const TEXT_DARK    = "#0F1F1D";   // matches infoValue in ResultsScreen
const TEXT_MID     = "rgba(15,31,29,0.72)";
const TEXT_MUTED   = "rgba(15,31,29,0.55)";
const BORDER_SOFT  = "rgba(31,76,71,0.12)";  // exact match from ResultsScreen
const BORDER_SAVED = "rgba(31,76,71,0.18)";
const TAG_BG       = "rgba(255,255,255,0.85)"; // matches infoStrip style
const TAG_GREEN    = BRAND;
const PILL_BG      = "#F4F6F3";   // matches secondaryAction bg
const SAVE_IDLE    = "#F4F6F3";
const SAVE_ACTIVE  = BRAND;
const STEP_BG      = "rgba(255,255,255,0.7)"; // matches sliderWrap

const PAGE_SIZE = 30;

function formatSaveCount(count: number) {
  if (count === 1) return "1 save";
  return `${count} saves`;
}

function getRecipeMood(item: ExploreRecipe) {
  const title = item.title.toLowerCase();
  const ingredients = parseIngredients(item.ingredients_description).length;
  const steps = parseInstructions(item.instructions_description).length;

  if (
    title.includes("smoothie") ||
    title.includes("parfait") ||
    title.includes("bowl")
  ) {
    return { label: "Quick & easy", hint: "Ready in minutes" };
  }
  if (
    title.includes("pancake") ||
    title.includes("crisp") ||
    title.includes("muffin") ||
    title.includes("bake")
  ) {
    return { label: "Cozy bake", hint: "Perfect for weekends" };
  }
  if (title.includes("salad") || title.includes("salsa")) {
    return { label: "Fresh & light", hint: "Bright flavors" };
  }
  if (ingredients >= 6 || steps >= 5) {
    return { label: "Worth the effort", hint: "A little more involved" };
  }
  return { label: "Fun find", hint: "Something new to try" };
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
  const mood = useMemo(() => getRecipeMood(item), [item]);

  const previewLabel = useMemo(() => {
    if (item.save_count >= 10) return "Crowd favorite";
    if (ingredients.length >= 3) return "Popular match";
    if (steps.length >= 4) return "Detailed recipe";
    return "Community recipe";
  }, [ingredients.length, steps.length, item.save_count]);

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
      {/* ── Header ── */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={styles.tagRow}>
            <View style={styles.tagChip}>
              <Text style={[styles.tagChipText, { fontFamily: fontBold, fontSize: 10 * finalScale }]}>
                {previewLabel}
              </Text>
            </View>
            <View style={styles.moodChip}>
              <Text style={[styles.moodChipText, { fontFamily: fontRegular, fontSize: 10 * finalScale }]}>
                {mood.label}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 19 * finalScale }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text style={[styles.metaLine, { fontFamily: fontRegular, fontSize: 12 * finalScale }]}>
            {ingredients.length} ingredients · {steps.length} steps · {formatSaveCount(item.save_count)}
          </Text>
        </View>

        <Pressable
          onPress={(e) => { e.stopPropagation(); onToggleSave(); }}
          disabled={busy}
          style={({ pressed }) => [
            styles.saveBtn,
            item.is_saved && styles.saveBtnActive,
            pressed && styles.pressed,
            { minHeight },
          ]}
        >
          <Text style={[
            styles.saveBtnText,
            item.is_saved && styles.saveBtnTextActive,
            { fontFamily: fontBold, fontSize: 12 * finalScale },
          ]}>
            {busy ? "···" : item.is_saved ? "Saved" : "Save"}
          </Text>
        </Pressable>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Ingredients ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontFamily: fontBold, fontSize: 10 * finalScale }]}>
          INGREDIENTS
        </Text>
        <View style={styles.pillRow}>
          {ingredients.map((ingredient, idx) => (
            <View key={`${item.id}-ing-${idx}`} style={styles.pill}>
              <Text
                style={[styles.pillText, { fontFamily: fontRegular, fontSize: 12 * finalScale }]}
                numberOfLines={1}
              >
                {ingredient}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── First Step ── */}
      {!!firstStep && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontFamily: fontBold, fontSize: 10 * finalScale }]}>
            FIRST STEP
          </Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={[styles.stepNumText, { fontFamily: fontBold, fontSize: 11 * finalScale }]}>1</Text>
            </View>
            <Text
              style={[styles.stepText, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}
              numberOfLines={3}
            >
              {firstStep}
            </Text>
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={styles.cardFooter}>
        <Text style={[styles.moodHint, { fontFamily: fontRegular, fontSize: 12 * finalScale }]}>
          {mood.hint}
        </Text>
        <Text style={[styles.openLabel, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>
          View recipe →
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const savedCount = useMemo(() => recipes.filter((r) => r.is_saved).length, [recipes]);

  const loadRecipes = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await getExploreRecipes(PAGE_SIZE, 0);
      setRecipes(data);
      setOffset(data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      Alert.alert("Explore", e?.message || "Could not load explore recipes");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  const loadMoreRecipes = React.useCallback(async () => {
    if (loading || refreshing || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const data = await getExploreRecipes(PAGE_SIZE, offset);
      if (data.length === 0) { setHasMore(false); return; }
      setRecipes((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const uniqueNew = data.filter((r) => !existingIds.has(r.id));
        return [...prev, ...uniqueNew];
      });
      setOffset((prev) => prev + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      Alert.alert("Explore", e?.message || "Could not load more recipes");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, refreshing, loadingMore, hasMore, offset]);

  useFocusEffect(
    React.useCallback(() => { loadRecipes(); }, [loadRecipes])
  );

  const toggleSave = async (recipe: ExploreRecipe) => {
    try {
      setBusyId(recipe.id);
      if (recipe.is_saved) {
        await unsaveRecipe(recipe.id);
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id
              ? { ...r, is_saved: false, save_count: Math.max(0, r.save_count - 1) }
              : r
          )
        );
      } else {
        await saveRecipe(recipe.id);
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id
              ? { ...r, is_saved: true, save_count: r.save_count + 1 }
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
      {/* ── Hero ── */}
      <TourTarget id="explore-header">
        <View style={styles.hero}>
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="FruitShoot logo"
          />
        <Text style={[styles.heroEyebrow, { fontFamily: fontBold, fontSize: 11 * finalScale }]}>
          DISCOVER
        </Text>
        <Text style={[styles.heroTitle, { fontFamily: fontBold, fontSize: 30 * finalScale }]}>
          Find something{"\n"}fun to make
        </Text>
        <Text style={[styles.heroSub, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>
          Browse community recipes, save your favorites, and get inspired.
        </Text>

        {savedCount > 0 && (
          <View style={styles.savedPill}>
            <Text style={[styles.savedPillText, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>
              {savedCount} saved by you
            </Text>
          </View>
        )}
        </View>
      </TourTarget>

      {/* ── Feed row ── */}
      <View style={styles.feedRow}>
        <Text style={[styles.feedLabel, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>
          All recipes
        </Text>
        <Pressable
          onPress={() => loadRecipes(true)}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.refreshBtnText, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>
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
            tintColor={BRAND}
          />
        }
        onEndReached={loadMoreRecipes}
        onEndReachedThreshold={0.45}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={GREEN_MID} size="small" />
              <Text style={[styles.footerLoaderText, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}>
                Finding more...
              </Text>
            </View>
          ) : !hasMore && recipes.length > 0 ? (
            <View style={styles.endCard}>
              <Text style={[styles.endCardTitle, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>
                You've seen it all
              </Text>
              <Text style={[styles.endCardText, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}>
                Pull down to refresh for a fresh pass.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={GREEN_MID} />
              <Text style={[styles.loadingText, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>
                Loading recipes...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { fontFamily: fontBold, fontSize: 17 * finalScale }]}>
                Nothing here yet
              </Text>
              <Text style={[styles.emptyText, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}>
                Recipes from the community will appear here once people start sharing.
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
  safe: {
    flex: 1,
    backgroundColor: CREAM_BG,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // ── Header ──────────────────────────────────────────────
  headerWrap: {
    gap: 20,
    marginBottom: 4,
  },
  hero: {
    paddingVertical: 24,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  heroLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  heroEyebrow: {
    color: GREEN_MID,
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: "900",
    textAlign: "center",
  },
  heroTitle: {
    color: TEXT_DARK,
    lineHeight: 36,
    letterSpacing: -0.5,
    fontWeight: "900",
    textAlign: "center",
  },
  heroSub: {
    marginTop: 10,
    color: TEXT_MID,
    lineHeight: 21,
    fontWeight: "600",
    textAlign: "center",
  },
  savedPill: {
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: "rgba(31,76,71,0.08)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  savedPillText: {
    color: BRAND,
    fontWeight: "900",
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  feedLabel: {
    color: TEXT_DARK,
    letterSpacing: -0.2,
    fontWeight: "900",
  },
  refreshBtn: {
    backgroundColor: "#F4F6F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: BORDER_SAVED,
  },
  refreshBtnText: {
    color: BRAND,
    fontWeight: "900",
  },

  // ── Card ────────────────────────────────────────────────
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: "rgba(255,255,255,0.82)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardSaved: {
    backgroundColor: CARD_SAVED,
    borderColor: BORDER_SAVED,
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.997 }],
  },
  cardBusy: {
    opacity: 0.7,
  },

  // Card top
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTopLeft: {
    flex: 1,
    gap: 6,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tagChip: {
    backgroundColor: "rgba(31,76,71,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  tagChipText: {
    color: BRAND,
    letterSpacing: 0.2,
    fontWeight: "900",
  },
  moodChip: {
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
  },
  moodChipText: {
    color: TEXT_MID,
    fontWeight: "700",
  },
  cardTitle: {
    color: TEXT_DARK,
    letterSpacing: -0.3,
    lineHeight: 24,
    fontWeight: "900",
  },
  metaLine: {
    color: TEXT_MUTED,
    lineHeight: 18,
    fontWeight: "600",
  },

  // Save button — matches app's settingsButton style
  saveBtn: {
    minWidth: 68,
    backgroundColor: PILL_BG,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER_SOFT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  saveBtnText: {
    color: BRAND,
    fontWeight: "900",
  },
  saveBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: BORDER_SOFT,
    marginVertical: 14,
  },

  // Sections
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 8,
    fontWeight: "900",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    backgroundColor: PILL_BG,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  pillText: {
    color: TEXT_MID,
    fontWeight: "700",
  },

  // Step — matches sliderWrap style from ResultsScreen
  stepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(31,76,71,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: BRAND,
    fontWeight: "900",
  },
  stepText: {
    flex: 1,
    color: TEXT_MID,
    lineHeight: 19,
    fontWeight: "700",
  },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  moodHint: {
    color: TEXT_MUTED,
    fontWeight: "600",
  },
  openLabel: {
    color: BRAND,
    fontWeight: "900",
  },

  // ── States ──────────────────────────────────────────────
  loadingBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 4,
  },
  loadingText: {
    color: TEXT_MUTED,
    fontWeight: "700",
  },
  emptyCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 20,
  },
  emptyTitle: {
    color: TEXT_DARK,
    marginBottom: 6,
    fontWeight: "900",
  },
  emptyText: {
    color: TEXT_MUTED,
    lineHeight: 20,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: {
    color: TEXT_MUTED,
    fontWeight: "700",
  },
  endCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 18,
    alignItems: "center",
  },
  endCardTitle: {
    color: TEXT_DARK,
    marginBottom: 4,
    fontWeight: "900",
  },
  endCardText: {
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.82,
  },
});