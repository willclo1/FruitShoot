import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";
import { addRetrainingSample } from "@/services/retrain";

const BRAND = "#1F4C47";
const BG = "#F6F3EE";

// ─── Label maps — must stay in sync with model.py / predict.py ───────────────
// fruit_map: {0: 'Apple', 1: 'Banana', 2: 'Strawberry', 3: 'Non-Fruit'}
// ripe_map:  {0: 'Ripe',  1: 'Rotten', 2: 'N/A',        3: 'Underripe'}
const RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"] as const;
type RipenessIndex = 0 | 1 | 2 | 3;

// Each ripeness state gets its own accent colour for the badge.
const RIPENESS_COLORS: Record<RipenessIndex, { bg: string; text: string; border: string }> = {
  0: { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" }, // Ripe      — green
  1: { bg: "#FBE9E7", text: "#BF360C", border: "#FFAB91" }, // Rotten    — red-orange
  2: { bg: "#F5F5F5", text: "#616161", border: "#BDBDBD" }, // N/A       — neutral grey
  3: { bg: "#FFF8E1", text: "#E65100", border: "#FFE082" }, // Underripe — amber
};

/** Fallback: parse raw ripeness label string → index when param is missing. */
function ripenessLabelToIndex(label?: string): RipenessIndex {
  const l = (label || "").toLowerCase();
  if (l === "ripe") return 0;
  if (l === "rotten") return 1;
  if (l === "n/a") return 2;
  if (l === "underripe" || l.includes("under")) return 3;
  return 0;
}

function confPct(conf: number) {
  if (!isFinite(conf) || conf <= 0) return null;
  return Math.round(conf * 100);
}

export default function ResultsScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const params = useLocalSearchParams<{
    image_id?: string;
    uploadedUrl?: string;
    fruit?: string;
    fruit_index?: string;
    fruitConfidence?: string;
    ripeness?: string;
    ripeness_index?: string;
    ripenessConfidence?: string;
  }>();

  const fruit = params.fruit ?? "Unknown";
  const fruitIndex = Number(params.fruit_index ?? "0");

  // fruit_map index 3 = 'Non-Fruit'
  const isNonFruit =
    fruit.toLowerCase().includes("non") ||
    fruit.toLowerCase().includes("background") ||
    fruitIndex === 3;

  const fruitConfidence = Number(params.fruitConfidence ?? "0");
  const modelRipeness = params.ripeness ?? "N/A";      // raw backend label string
  const ripenessConfidence = Number(params.ripenessConfidence ?? "0");
  const imageId = Number(params.image_id ?? "0");
  const [liked, setLiked] = useState(false);

  // ripe_map index used to drive the slider + pill UI — same as the backend index.
  const ripenessIndex: RipenessIndex | null = useMemo(() => {
    if (isNonFruit) return null;
    const idx = Number(params.ripeness_index);
    if (Number.isInteger(idx) && idx >= 0 && idx <= 3) return idx as RipenessIndex;
    return ripenessLabelToIndex(modelRipeness);
  }, [params.ripeness_index, modelRipeness, isNonFruit]);

  /** Label shown in the info strip and pills — directly from the model's ripe_map. */
  const ripenessLabel = useMemo(() => {
    if (ripenessIndex === null) return null;
    return RIPENESS_LABELS[ripenessIndex];
  }, [ripenessIndex]);

  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
  const imageUrl = useMemo(() => {
    const u = params.uploadedUrl;
    if (!u) return null;
    if (u.startsWith("http")) return u;
    return `${apiBase}${u}`;
  }, [params.uploadedUrl, apiBase]);

  const fruitPct = confPct(fruitConfidence);
  const ripePct = confPct(ripenessConfidence);

  const headline = useMemo(() => {
    if (isNonFruit) return "Not a fruit";
    switch (ripenessIndex) {
      case 0: return "Ready to eat";        // Ripe
      case 1: return "Past its prime";      // Rotten
      case 2: return "Not applicable";      // N/A
      case 3: return "Needs more time";     // Underripe
      default: return "Results";
    }
  }, [ripenessIndex, isNonFruit]);

  const hint = useMemo(() => {
    if (isNonFruit) return "This image does not appear to contain fruit.";
    switch (ripenessIndex) {
      case 0: return "Best flavor right now.";                    // Ripe
      case 1: return "Consider composting if it smells off.";    // Rotten
      case 2: return "";                                          // N/A
      case 3: return "Give it a little longer.";                  // Underripe
      default: return "";
    }
  }, [ripenessIndex, isNonFruit]);

  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay(`Results. ${fruit}. ${headline}.`);
    }, [
      loaded,
      settings.ttsEnabled,
      settings.ttsMode,
      settings.ttsRate,
      settings.ttsPitch,
      fruit,
      headline,
    ])
  );

  const handleLike = async () => {
    if (liked) return;
    if (!imageId) return;

    setLiked(true);

    try {
      await addRetrainingSample({
        image_id: imageId,
        fruit_index: fruitIndex,
        ripeness_index: Number(params.ripeness_index ?? "0"), // send raw backend index
        fruit_confidence: fruitConfidence,
        ripeness_confidence: ripenessConfidence,
      });
    } catch (err) {
      console.error("Failed to add retraining sample", err);
      setLiked(false);
    }
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.brandHeader}>
          <Image
            source={require("../assets/images/FruitShoot Logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          {showReplay && (
            <Pressable
              style={[
                styles.replayButton,
                {
                  minHeight: tt.minHeight,
                  paddingHorizontal: tt.paddingHorizontal,
                },
              ]}
              onPress={() => tts.say(`Results. ${fruit}. ${headline}.`)}
            >
              <Text
                style={[
                  styles.replayText,
                  { fontFamily: fontBold, fontSize: 14 * finalScale },
                ]}
              >
                Replay
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.hero}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroText}>
            <Text
              style={[
                styles.heroFruit,
                { fontFamily: fontBold, fontSize: 26 * finalScale },
              ]}
            >
              {fruit}
            </Text>
            <Text
              style={[
                styles.heroHeadline,
                { fontFamily: fontBold, fontSize: 16 * finalScale },
              ]}
            >
              {headline}
            </Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Text
              style={[
                styles.infoLabel,
                { fontFamily: fontBold, fontSize: 12 * finalScale },
              ]}
            >
              Fruit
            </Text>
            <Text
              style={[
                styles.infoValue,
                { fontFamily: fontBold, fontSize: 18 * finalScale },
              ]}
            >
              {fruit}
              {fruitPct !== null ? (
                <Text style={styles.infoMuted}> · {fruitPct}%</Text>
              ) : null}
            </Text>
          </View>

          {!isNonFruit && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <Text
                  style={[
                    styles.infoLabel,
                    { fontFamily: fontBold, fontSize: 12 * finalScale },
                  ]}
                >
                  Ripeness
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    { fontFamily: fontBold, fontSize: 18 * finalScale },
                  ]}
                >
                  {ripenessLabel}
                  {ripePct !== null ? (
                    <Text style={styles.infoMuted}> · {ripePct}%</Text>
                  ) : null}
                </Text>
              </View>
            </>
          )}
        </View>

        {!isNonFruit && ripenessIndex !== null && (
          <View style={styles.ripenessBlock}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontBold, fontSize: 15 * finalScale },
              ]}
            >
              Ripeness
            </Text>

            <View
              style={[
                styles.ripeBadgeCard,
                {
                  backgroundColor: RIPENESS_COLORS[ripenessIndex].bg,
                  borderColor: RIPENESS_COLORS[ripenessIndex].border,
                },
              ]}
            >
              <Text
                style={[
                  styles.ripeBadgeLabel,
                  {
                    fontFamily: fontBold,
                    fontSize: 22 * finalScale,
                    color: RIPENESS_COLORS[ripenessIndex].text,
                  },
                ]}
              >
                {RIPENESS_LABELS[ripenessIndex]}
              </Text>

              {hint ? (
                <Text
                  style={[
                    styles.ripeBadgeHint,
                    {
                      fontFamily: fontBold,
                      fontSize: 13 * finalScale,
                      color: RIPENESS_COLORS[ripenessIndex].text,
                    },
                  ]}
                >
                  {hint}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.feedbackContainer}>
          <Pressable
            onPress={handleLike}
            style={({ pressed }) => [
              styles.likeButton,
              {
                minHeight: tt.minHeight,
                borderRadius: tt.borderRadius,
              },
              liked && styles.likeButtonActive,
              pressed && !liked && styles.likeButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              liked ? "Saved for improvement" : "Looks right"
            }
          >
            <Text
              style={[
                styles.likeIcon,
                liked && styles.likeIconActive,
                { fontSize: 18 * finalScale },
              ]}
            >
              {liked ? "✓" : "♡"}
            </Text>

            <Text
              style={[
                styles.likeText,
                liked && styles.likeTextActive,
                { fontFamily: fontBold, fontSize: 15 * finalScale },
              ]}
            >
              {liked ? "Saved for improvement" : "Looks Right"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.suggestCard}>
          <Text
            style={[
              styles.suggestTitle,
              { fontFamily: fontBold, fontSize: 20 * finalScale },
            ]}
          >
            Get recipe suggestions
          </Text>

          <Text
            style={[
              styles.suggestSubtitle,
              { fontFamily: fontRegular, fontSize: 13 * finalScale },
            ]}
          >
            Find recipe ideas based on this fruit and its condition.
          </Text>

          <Pressable
            onPress={() =>
              router.push(
                `/suggestion?fruit=${encodeURIComponent(fruit)}&ripeness=${encodeURIComponent(modelRipeness)}&fruitConfidence=${fruitConfidence}&ripenessConfidence=${ripenessConfidence}`
              )
            }
            style={({ pressed }) => [
              styles.primaryAction,
              {
                minHeight: tt.minHeight,
                borderRadius: tt.borderRadius,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.primaryActionText,
                { fontFamily: fontBold, fontSize: 16 * finalScale },
              ]}
            >
              See Suggestions
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                minHeight: tt.minHeight,
                borderRadius: tt.borderRadius,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.secondaryActionText,
                { fontFamily: fontBold, fontSize: 15 * finalScale },
              ]}
            >
              Scan Again
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 110 },

  topBar: {
    marginBottom: 10,
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

  brandLogo: { width: 140, height: 140, marginBottom: 6 },
  brandHeader: { alignItems: "center" },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  replayText: { color: "#fff", fontWeight: "800" },

  hero: {
    width: "100%",
    height: 310,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#E7E1D9",
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    height: 120,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  heroText: { position: "absolute", bottom: 14, left: 16 },
  heroFruit: { color: "white", fontWeight: "900" },
  heroHeadline: { color: "white", fontWeight: "800" },

  infoStrip: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  infoItem: { flex: 1 },
  infoLabel: { color: "rgba(15,31,29,0.65)", fontWeight: "900" },
  infoValue: { marginTop: 6, color: "#0F1F1D", fontWeight: "900" },
  infoMuted: { color: "rgba(15,31,29,0.55)" },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(31,76,71,0.18)",
  },

  ripenessBlock: { marginTop: 18 },
  sectionTitle: {
    color: BRAND,
    fontWeight: "900",
    textDecorationLine: "underline",
    marginBottom: 10,
  },
  ripeBadgeCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
  },
  ripeBadgeLabel: {
    fontWeight: "900",
  },
  ripeBadgeHint: {
    fontWeight: "700",
    opacity: 0.85,
    textAlign: "center",
  },

  feedbackContainer: {
    marginTop: 16,
  },

  likeButton: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  likeButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  likeButtonActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  likeIcon: {
    color: BRAND,
    fontWeight: "900",
  },
  likeIconActive: {
    color: "#fff",
  },
  likeText: {
    color: BRAND,
    fontWeight: "900",
  },
  likeTextActive: {
    color: "#fff",
  },

  suggestCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
    padding: 16,
  },
  suggestTitle: {
    color: BRAND,
    fontWeight: "900",
  },
  suggestSubtitle: {
    marginTop: 4,
    color: "rgba(15,31,29,0.68)",
    lineHeight: 18,
  },

  primaryAction: {
    marginTop: 16,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: "white",
    fontWeight: "900",
  },

  secondaryAction: {
    marginTop: 10,
    backgroundColor: "#F4F6F3",
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: "#28443F",
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.86,
  },
});