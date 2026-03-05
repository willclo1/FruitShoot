import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

const BRAND = "#1F4C47";
const BG = "#F6F3EE";
const TRACK = "#D9D9D9";
const THUMB = "#E94B3C";

const RIPENESS_LABELS = ["Unripe", "Ripe", "Overripe", "Spoiled"] as const;
type RipenessIndex = 0 | 1 | 2 | 3;

function ripenessToIndex(label?: string): RipenessIndex {
  const l = (label || "").toLowerCase();

  // backend labels: "Ripe", "Rotten", "N/A", "Underripe"
  if (l.includes("under")) return 0; // Underripe -> Unripe
  if (l === "ripe") return 1; // Ripe -> Ripe
  if (l.includes("over")) return 2; // Overripe -> Overripe (if ever present)
  if (l.includes("rot") || l.includes("spo")) return 3; // Rotten/Spoiled -> Spoiled
  if (l === "n/a" || l.includes("na")) return 1;

  return 1;
}

function confPct(conf: number) {
  if (!isFinite(conf) || conf <= 0) return null;
  return Math.round(conf * 100);
}

export default function ResultsScreen() {
  const { settings, loaded } = useSettings();

  const params = useLocalSearchParams<{
    uploadedUrl?: string;
    fruit?: string;
    fruitConfidence?: string;
    ripeness?: string;
    ripenessConfidence?: string;
  }>();

  const fruit = params.fruit ?? "Unknown";
  const fruitConfidence = Number(params.fruitConfidence ?? "0");
  const modelRipeness = params.ripeness ?? "N/A";
  const ripenessConfidence = Number(params.ripenessConfidence ?? "0");

  const ripenessIndex: RipenessIndex = useMemo(
    () => ripenessToIndex(modelRipeness),
    [modelRipeness]
  );
  const ripenessLabel = useMemo(
    () => RIPENESS_LABELS[ripenessIndex],
    [ripenessIndex]
  );

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
    switch (ripenessIndex) {
      case 1:
        return "Ready to eat";
      case 0:
        return "Needs more time";
      case 2:
        return "Use soon";
      case 3:
        return "Past its prime";
      default:
        return "Results";
    }
  }, [ripenessIndex]);

  const hint = useMemo(() => {
    switch (ripenessIndex) {
      case 1:
        return "Best flavor right now.";
      case 0:
        return "Give it a little longer.";
      case 2:
        return "Great for smoothies or baking.";
      case 3:
        return "Consider composting if it smells off.";
      default:
        return "";
    }
  }, [ripenessIndex]);

  // Auto-announce once on focus (simple)
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

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topRow}>
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {showReplay && (
            <Pressable
              style={styles.replayButton}
              onPress={() => tts.say(`Results. ${fruit}. ${headline}.`)}
              accessibilityRole="button"
              accessibilityLabel="Replay"
              accessibilityHint="Repeats a short summary"
            >
              <Text style={styles.replayText}>Replay</Text>
            </Pressable>
          )}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel="Uploaded fruit image"
            />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}

          <View style={styles.heroOverlay} />
          <View style={styles.heroText}>
            <Text style={styles.heroFruit}>{fruit}</Text>
            <Text style={styles.heroHeadline}>{headline}</Text>
          </View>
        </View>

        {/* Minimal info strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fruit</Text>
            <Text style={styles.infoValue}>
              {fruit}
              {fruitPct !== null ? (
                <Text style={styles.infoMuted}>  ·  {fruitPct}%</Text>
              ) : null}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ripeness</Text>
            <Text style={styles.infoValue}>
              {ripenessLabel}
              {ripePct !== null ? (
                <Text style={styles.infoMuted}>  ·  {ripePct}%</Text>
              ) : null}
            </Text>
          </View>
        </View>

        {/* Ripeness visualization (read-only) */}
        <View style={styles.ripenessBlock}>
          <Text style={styles.sectionTitle}>Ripeness</Text>

          {/* pointerEvents="none" prevents any interaction */}
          <View style={styles.sliderWrap} pointerEvents="none">
            <Slider
              value={ripenessIndex}
              minimumValue={0}
              maximumValue={3}
              step={1}
              disabled
              minimumTrackTintColor={TRACK}
              maximumTrackTintColor={TRACK}
              thumbTintColor={THUMB}
              accessibilityLabel="Ripeness indicator"
              accessibilityHint="Shows ripeness stage"
            />
          </View>

          <View style={styles.stageRow}>
            {RIPENESS_LABELS.map((label, idx) => {
              const active = (idx as RipenessIndex) === ripenessIndex;
              return (
                <View
                  key={label}
                  style={[styles.stagePill, active && styles.stagePillActive]}
                >
                  <Text style={[styles.stageText, active && styles.stageTextActive]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.hintText}>{hint}</Text>
        </View>

        {/* Recipes teaser */}
        <View style={styles.recipesRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Recipes</Text>
            <Text style={styles.recipesSub}>Coming soon</Text>
          </View>

          <Pressable
            onPress={() => {
              tts.say("Recipes are coming soon.");
              Alert.alert("Recipes", "Recipe suggestions are coming soon.");
            }}
            style={styles.linkButton}
            accessibilityRole="button"
            accessibilityLabel="See more recipes"
            accessibilityHint="Recipes feature is coming soon"
          >
            <Text style={styles.linkText}>See more</Text>
          </Pressable>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 110,
  },

  topRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logo: { width: 110, height: 110 },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  replayText: { color: "#fff", fontWeight: "800", fontSize: 13 },

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
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  heroText: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
  },
  heroFruit: {
    color: "white",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  heroHeadline: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "800",
  },

  infoStrip: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoItem: { flex: 1 },
  infoLabel: {
    color: "rgba(15,31,29,0.65)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  infoValue: {
    marginTop: 6,
    color: "#0F1F1D",
    fontSize: 18,
    fontWeight: "900",
  },
  infoMuted: {
    color: "rgba(15,31,29,0.55)",
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(31,76,71,0.18)",
  },

  ripenessBlock: {
    marginTop: 18,
    paddingTop: 6,
  },
  sectionTitle: {
    color: BRAND,
    fontSize: 20,
    fontWeight: "950" as any,
    textDecorationLine: "underline",
    marginBottom: 10,
  },

  sliderWrap: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.70)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  stageRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  stagePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(31,76,71,0.08)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.12)",
    alignItems: "center",
  },
  stagePillActive: {
    backgroundColor: BRAND,
    borderColor: "rgba(31,76,71,0.30)",
  },
  stageText: {
    color: BRAND,
    fontWeight: "900",
    fontSize: 12,
  },
  stageTextActive: {
    color: "white",
  },

  hintText: {
    marginTop: 10,
    color: "rgba(15,31,29,0.72)",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  recipesRow: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.60)",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recipesSub: {
    marginTop: 6,
    color: "rgba(15,31,29,0.65)",
    fontSize: 14,
    fontWeight: "800",
  },

  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(233,75,60,0.14)",
    borderWidth: 1,
    borderColor: "rgba(233,75,60,0.22)",
  },
  linkText: {
    color: "#B0342B",
    fontWeight: "900",
    textDecorationLine: "underline",
    fontSize: 14,
  },
});