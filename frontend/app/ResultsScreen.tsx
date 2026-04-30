import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
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


const RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"] as const;
const FRUIT_LABELS = ["Apple", "Banana", "Strawberry", "Non-Fruit"] as const;
type RipenessIndex = 0 | 1 | 2 | 3;
type FruitIndex = 0 | 1 | 2 | 3;

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

// ─── Correction Modal ─────────────────────────────────────────────────────────
type CorrectionField = "fruit" | "ripeness" | "both";

const FIELD_OPTIONS: { value: CorrectionField; label: string }[] = [
  { value: "fruit",    label: "Fruit identification" },
  { value: "ripeness", label: "Ripeness assessment" },
  { value: "both",     label: "Both fruit & ripeness" },
];

/** A row of tappable pill chips — no native Picker needed. */
function ChipSelector<T extends number>({
  options,
  selected,
  onSelect,
  fontBold,
  finalScale,
}: {
  options: readonly string[];
  selected: T;
  onSelect: (v: T) => void;
  fontBold: string;
  finalScale: number;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map((label, idx) => {
        const active = idx === selected;
        return (
          <Pressable
            key={idx}
            onPress={() => onSelect(idx as T)}
            style={({ pressed }) => [
              chipStyles.chip,
              active && chipStyles.chipActive,
              pressed && !active && chipStyles.chipPressed,
            ]}
          >
            <Text
              style={[
                chipStyles.chipText,
                active && chipStyles.chipTextActive,
                { fontFamily: fontBold, fontSize: 13 * finalScale },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface CorrectionModalProps {
  visible: boolean;
  currentFruitIndex: FruitIndex;
  currentRipenessIndex: RipenessIndex;
  fontBold: string;
  finalScale: number;
  onSubmit: (correctedFruitIndex: FruitIndex, correctedRipenessIndex: RipenessIndex) => void;
  onCancel: () => void;
}

function CorrectionModal({
  visible,
  currentFruitIndex,
  currentRipenessIndex,
  fontBold,
  finalScale,
  onSubmit,
  onCancel,
}: CorrectionModalProps) {
  const [field, setField] = useState<CorrectionField>("fruit");
  const [correctedFruit, setCorrectedFruit] = useState<FruitIndex>(currentFruitIndex);
  const [correctedRipeness, setCorrectedRipeness] = useState<RipenessIndex>(currentRipenessIndex);

  const showFruitChips    = field === "fruit"    || field === "both";
  const showRipenessChips = field === "ripeness" || field === "both";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { fontFamily: fontBold, fontSize: 18 * finalScale }]}>
              What was incorrect?
            </Text>
            <Pressable onPress={onCancel} style={modalStyles.closeBtn} accessibilityLabel="Close">
              <Text style={[modalStyles.closeBtnText, { fontSize: 18 * finalScale }]}>✕</Text>
            </Pressable>
          </View>

          <Text style={[modalStyles.subtitle, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
            Help us improve by selecting what the model got wrong.
          </Text>

          {/* Which field was wrong */}
          <Text style={[modalStyles.label, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
            What was wrong?
          </Text>
          <View style={chipStyles.row}>
            {FIELD_OPTIONS.map(({ value, label }) => {
              const active = field === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setField(value)}
                  style={({ pressed }) => [
                    chipStyles.chip,
                    active && chipStyles.chipActive,
                    pressed && !active && chipStyles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      chipStyles.chipText,
                      active && chipStyles.chipTextActive,
                      { fontFamily: fontBold, fontSize: 13 * finalScale },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Correct fruit */}
          {showFruitChips && (
            <>
              <Text style={[modalStyles.label, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
                Correct fruit
              </Text>
              <ChipSelector
                options={FRUIT_LABELS}
                selected={correctedFruit}
                onSelect={setCorrectedFruit}
                fontBold={fontBold}
                finalScale={finalScale}
              />
            </>
          )}

          {/* Correct ripeness */}
          {showRipenessChips && (
            <>
              <Text style={[modalStyles.label, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
                Correct ripeness
              </Text>
              <ChipSelector
                options={RIPENESS_LABELS}
                selected={correctedRipeness}
                onSelect={setCorrectedRipeness}
                fontBold={fontBold}
                finalScale={finalScale}
              />
            </>
          )}

          {/* Actions */}
          <View style={modalStyles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [modalStyles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[modalStyles.cancelBtnText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                onSubmit(
                  showFruitChips    ? correctedFruit    : currentFruitIndex,
                  showRipenessChips ? correctedRipeness : currentRipenessIndex,
                )
              }
              style={({ pressed }) => [modalStyles.submitBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={[modalStyles.submitBtnText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>
                Submit
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const fruitIndex = Number(params.fruit_index ?? "0") as FruitIndex;

  // fruit_map index 3 = 'Non-Fruit'
  const isNonFruit =
    fruit.toLowerCase().includes("non") ||
    fruit.toLowerCase().includes("background") ||
    fruitIndex === 3;

  const fruitConfidence = Number(params.fruitConfidence ?? "0");
  const modelRipeness = params.ripeness ?? "N/A";
  const ripenessConfidence = Number(params.ripenessConfidence ?? "0");
  const imageId = Number(params.image_id ?? "0");

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);

  const ripenessIndex: RipenessIndex | null = useMemo(() => {
    if (isNonFruit) return null;
    const idx = Number(params.ripeness_index);
    if (Number.isInteger(idx) && idx >= 0 && idx <= 3) return idx as RipenessIndex;
    return ripenessLabelToIndex(modelRipeness);
  }, [params.ripeness_index, modelRipeness, isNonFruit]);

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
      case 0: return "Ready to eat";
      case 1: return "Past its prime";
      case 2: return "Not applicable";
      case 3: return "Needs more time";
      default: return "Results";
    }
  }, [ripenessIndex, isNonFruit]);

  const hint = useMemo(() => {
    if (isNonFruit) return "This image does not appear to contain fruit.";
    switch (ripenessIndex) {
      case 0: return "Best flavor right now.";
      case 1: return "Consider composting if it smells off.";
      case 2: return "";
      case 3: return "Give it a little longer.";
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
    if (liked || disliked) return;
    if (!imageId) return;
    setLiked(true);
    try {
      await addRetrainingSample({
        image_id: imageId,
        fruit_index: fruitIndex,
        ripeness_index: Number(params.ripeness_index ?? "0"),
        fruit_confidence: fruitConfidence,
        ripeness_confidence: ripenessConfidence,
      });
    } catch (err) {
      console.error("Failed to add retraining sample", err);
      setLiked(false);
    }
  };


  const handleDislike = () => {
    if (liked || disliked) return;
    if (!imageId) return;
    setCorrectionModalVisible(true);
  };


  const handleCorrectionSubmit = async (
    correctedFruitIndex: FruitIndex,
    correctedRipenessIndex: RipenessIndex
  ) => {
    setCorrectionModalVisible(false);
    setDisliked(true);
    try {
      await addRetrainingSample({
        image_id: imageId,
        fruit_index: correctedFruitIndex,
        ripeness_index: correctedRipenessIndex,
        fruit_confidence: fruitConfidence,
        ripeness_confidence: ripenessConfidence,
      });
    } catch (err) {
      console.error("Failed to add correction sample", err);
      setDisliked(false);
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

        {/* ── Feedback buttons ── */}
        <View style={styles.feedbackRow}>
          {/* Like */}
          <Pressable
            onPress={handleLike}
            style={({ pressed }) => [
              styles.likeButton,
              { minHeight: tt.minHeight, borderRadius: tt.borderRadius, flex: 1 },
              liked && styles.likeButtonActive,
              pressed && !liked && !disliked && styles.likeButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Saved for improvement" : "Looks right"}
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
                { fontFamily: fontBold, fontSize: 13 * finalScale },
              ]}
            >
              {liked ? "Saved!" : "Looks Right"}
            </Text>
          </Pressable>

          {/* Dislike */}
          <Pressable
            onPress={handleDislike}
            style={({ pressed }) => [
              styles.dislikeButton,
              { minHeight: tt.minHeight, borderRadius: tt.borderRadius, flex: 1 },
              disliked && styles.dislikeButtonActive,
              pressed && !liked && !disliked && styles.dislikeButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={disliked ? "Correction saved" : "Mark result as incorrect"}
          >
            <Text
              style={[
                styles.dislikeIcon,
                disliked && styles.dislikeIconActive,
                { fontSize: 18 * finalScale },
              ]}
            >
              {disliked ? "✓" : "✕"}
            </Text>
            <Text
              style={[
                styles.dislikeText,
                disliked && styles.dislikeTextActive,
                { fontFamily: fontBold, fontSize: 13 * finalScale },
              ]}
            >
              {disliked ? "Correction Saved" : "Mark as Incorrect"}
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
              { minHeight: tt.minHeight, borderRadius: tt.borderRadius },
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
              { minHeight: tt.minHeight, borderRadius: tt.borderRadius },
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

      {/* ── Correction Modal ── */}
      <CorrectionModal
        visible={correctionModalVisible}
        currentFruitIndex={fruitIndex}
        currentRipenessIndex={ripenessIndex ?? 0}
        fontBold={fontBold ?? ""}
        finalScale={finalScale}
        onSubmit={handleCorrectionSubmit}
        onCancel={() => setCorrectionModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 110 },

  topBar: { marginBottom: 10 },
  backLink: { alignSelf: "flex-start", paddingVertical: 4 },
  backLinkText: { color: "#2A5C56", fontWeight: "900" },
  backLinkPressed: { opacity: 0.65 },

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
  divider: { width: 1, height: 34, backgroundColor: "rgba(31,76,71,0.18)" },

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
  ripeBadgeLabel: { fontWeight: "900" },
  ripeBadgeHint: { fontWeight: "700", opacity: 0.85, textAlign: "center" },

  feedbackRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },

  likeButton: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  likeButtonPressed: { transform: [{ scale: 0.98 }] },
  likeButtonActive: { backgroundColor: BRAND, borderColor: BRAND },
  likeIcon: { color: BRAND, fontWeight: "900" },
  likeIconActive: { color: "#fff" },
  likeText: { color: BRAND, fontWeight: "900" },
  likeTextActive: { color: "#fff" },

  dislikeButton: {
    backgroundColor: "#FFF4F2",
    borderWidth: 1.5,
    borderColor: "#F0B7AD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  dislikeButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  dislikeButtonActive: { backgroundColor: "#B8422E", borderColor: "#B8422E" },
  dislikeIcon: { color: "#B8422E", fontWeight: "900" },
  dislikeIconActive: { color: "#fff" },
  dislikeText: { color: "#8A2C1D", fontWeight: "900" },
  dislikeTextActive: { color: "#fff" },

  suggestCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
    padding: 16,
  },
  suggestTitle: { color: BRAND, fontWeight: "900" },
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
  primaryActionText: { color: "white", fontWeight: "900" },

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
  secondaryActionText: { color: "#28443F", fontWeight: "900" },

  pressed: { opacity: 0.86 },
});


const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 38,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: BRAND,
    fontWeight: "900",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "rgba(15,31,29,0.5)",
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(15,31,29,0.6)",
    fontWeight: "600",
    marginBottom: 12,
  },
  label: {
    color: BRAND,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 4,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F4F6F3",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.18)",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#28443F",
    fontWeight: "900",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#B8422E",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "900",
  },
});

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.22)",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  chipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    color: BRAND,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
});