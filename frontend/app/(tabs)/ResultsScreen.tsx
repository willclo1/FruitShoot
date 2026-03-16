import React, { useMemo } from "react";
import {
  Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { RecipeManager } from "@/components/recipe-manager";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const BRAND = "#1F4C47";
const BG = "#F6F3EE";
const TRACK = "#D9D9D9";
const THUMB = "#E94B3C";
const RIPENESS_LABELS = ["Unripe", "Ripe", "Overripe", "Spoiled"] as const;
type RipenessIndex = 0 | 1 | 2 | 3;

function ripenessToIndex(label?: string): RipenessIndex {
  const l = (label || "").toLowerCase();
  if (l.includes("under")) return 0;
  if (l === "ripe") return 1;
  if (l.includes("over")) return 2;
  if (l.includes("rot") || l.includes("spo")) return 3;
  if (l === "n/a" || l.includes("na")) return 1;
  return 1;
}

function confPct(conf: number) {
  if (!isFinite(conf) || conf <= 0) return null;
  return Math.round(conf * 100);
}

export default function ResultsScreen() {
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const params = useLocalSearchParams<{
    uploadedUrl?: string; fruit?: string; fruitConfidence?: string;
    ripeness?: string; ripenessConfidence?: string;
  }>();

  const fruit = params.fruit ?? "Unknown";
  const isNonFruit = fruit.toLowerCase().includes("non") || fruit.toLowerCase().includes("background");
  const fruitConfidence = Number(params.fruitConfidence ?? "0");
  const modelRipeness = params.ripeness ?? "N/A";
  const ripenessConfidence = Number(params.ripenessConfidence ?? "0");

  const ripenessIndex: RipenessIndex | null = useMemo(() => {
    if (isNonFruit) return null;
    return ripenessToIndex(modelRipeness);
  }, [modelRipeness, isNonFruit]);

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
      case 1: return "Ready to eat";
      case 0: return "Needs more time";
      case 2: return "Use soon";
      case 3: return "Past its prime";
      default: return "Results";
    }
  }, [ripenessIndex, isNonFruit]);

  const hint = useMemo(() => {
    if (isNonFruit) return "This image does not appear to contain fruit.";
    switch (ripenessIndex) {
      case 1: return "Best flavor right now.";
      case 0: return "Give it a little longer.";
      case 2: return "Great for smoothies or baking.";
      case 3: return "Consider composting if it smells off.";
      default: return "";
    }
  }, [ripenessIndex, isNonFruit]);

  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay(`Results. ${fruit}. ${headline}.`);
    }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch, fruit, headline])
  );

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Image source={require("../../assets/images/FruitShoot Logo.png")} style={styles.brandLogo} resizeMode="contain" />
          {showReplay && (
            <Pressable
              style={[styles.replayButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
              onPress={() => tts.say(`Results. ${fruit}. ${headline}.`)}
            >
              <Text style={[styles.replayText, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Replay</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.hero}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.heroImage} /> : <View style={styles.heroPlaceholder} />}
          <View style={styles.heroOverlay} />
          <View style={styles.heroText}>
            <Text style={[styles.heroFruit, { fontFamily: fontBold, fontSize: 26 * finalScale }]}>{fruit}</Text>
            <Text style={[styles.heroHeadline, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>{headline}</Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>Fruit</Text>
            <Text style={[styles.infoValue, { fontFamily: fontBold, fontSize: 18 * finalScale }]}>
              {fruit}{fruitPct !== null ? <Text style={styles.infoMuted}> · {fruitPct}%</Text> : null}
            </Text>
          </View>
          {!isNonFruit && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>Ripeness</Text>
                <Text style={[styles.infoValue, { fontFamily: fontBold, fontSize: 18 * finalScale }]}>
                  {ripenessLabel}{ripePct !== null ? <Text style={styles.infoMuted}> · {ripePct}%</Text> : null}
                </Text>
              </View>
            </>
          )}
        </View>

        {!isNonFruit && ripenessIndex !== null && (
          <View style={styles.ripenessBlock}>
            <Text style={[styles.sectionTitle, { fontFamily: fontBold, fontSize: 20 * finalScale }]}>Ripeness</Text>
            <View style={styles.sliderWrap} pointerEvents="none">
              <Slider value={ripenessIndex} minimumValue={0} maximumValue={3} step={1} disabled
                minimumTrackTintColor={TRACK} maximumTrackTintColor={TRACK} thumbTintColor={THUMB} />
            </View>
            <View style={styles.stageRow}>
              {RIPENESS_LABELS.map((label, idx) => {
                const active = idx === ripenessIndex;
                return (
                  <View key={label} style={[styles.stagePill, active && styles.stagePillActive, { minHeight: tt.minHeight }]}>
                    <Text style={[styles.stageText, active && styles.stageTextActive, { fontFamily: fontBold, fontSize: 12 * finalScale }]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.hintText, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>{hint}</Text>
          </View>
        )}

        <View style={styles.recipesBlock}>
          <RecipeManager title="Recipes" currentFruit={fruit} />
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 110 },
  brandLogo: { width: 140, height: 140, marginBottom: 6 },
  brandHeader: { alignItems: "center" },
  replayButton: { 
    backgroundColor: "#3B3B3B", 
    paddingVertical: 7, 
    paddingHorizontal: 14, 
    borderRadius: 999, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  replayText: { color: "#fff", fontWeight: "800" },
  hero: { 
    width: "100%", 
    height: 310, 
    borderRadius: 26, 
    overflow: "hidden", 
    backgroundColor: "#E7E1D9" 
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { width: "100%", height: "100%" },
  heroOverlay: { 
    position: "absolute", 
    bottom: 0, 
    height: 120, 
    left: 0, 
    right: 0, 
    backgroundColor: "rgba(0,0,0,0.38)" },
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
    alignItems: "center" 
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
    marginBottom: 10 
  },
  sliderWrap: { 
    borderRadius: 18, 
    backgroundColor: "rgba(255,255,255,0.7)", 
    borderWidth: 1, 
    borderColor: "rgba(31,76,71,0.12)", 
    padding: 10 
  },
  stageRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  stagePill: { 
    flex: 1, borderRadius: 999, 
    backgroundColor: "rgba(255,255,255,0.7)", 
    borderWidth: 1, 
    borderColor: "rgba(31,76,71,0.12)", 
    paddingHorizontal: 10, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  stagePillActive: { backgroundColor: BRAND },
  stageText: { color: BRAND, fontWeight: "900" },
  stageTextActive: { color: "white" },
  hintText: { marginTop: 10, color: "rgba(15,31,29,0.72)", fontWeight: "700" },
  recipesBlock: { 
    marginTop: 18, 
    padding: 14, 
    borderRadius: 18, 
    backgroundColor: "rgba(255,255,255,0.6)", 
    borderWidth: 1, 
    borderColor: "rgba(31,76,71,0.1)" 
  },
});