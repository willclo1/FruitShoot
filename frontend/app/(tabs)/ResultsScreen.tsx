import React, { useMemo, useState } from "react";
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
import { useFocusEffect } from "expo-router";

import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

const BRAND = "#1F4C47";
const BG = "#F6F3EE";
const TRACK = "#D9D9D9";
const THUMB = "#E94B3C";

const RIPENESS_LABELS = ["Unripe", "Ripe", "Overripe", "Spoiled"];

export default function ResultsScreen() {
  const { settings, loaded } = useSettings();
  const [ripeness, setRipeness] = useState(0);
  const ripenessLabel = useMemo(() => RIPENESS_LABELS[ripeness], [ripeness]);

  // Auto-announce screen on focus
  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay("Results screen. The slider will tell you how ripe the fruit you submitted is.");
    }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch])
  );

  const onSliderChange = (v: number) => {
    const rounded = Math.round(v);
    setRipeness(rounded);
    tts.say(RIPENESS_LABELS[rounded]);
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {showReplay && (
            <Pressable
              style={styles.replayButton}
              onPress={() =>
                tts.say(
                  `Results screen. Current ripeness: ${ripenessLabel}.`
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Replay voice guidance"
              accessibilityHint="Repeats the results screen instructions"
            >
              <Text style={styles.replayText}>Replay</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.subtitle}>Results</Text>

        {/* Recipes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recipes</Text>

          <View style={styles.cardBodyCenter}>
            <Text style={styles.cardBigText}>Coming soon</Text>
            <Text style={styles.cardSmallText}>
              Recipe suggestions will appear here in a future update.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              tts.say("Recipes are coming soon.");
              Alert.alert("Recipes", "Recipe suggestions are coming soon.");
            }}
            style={styles.seeMoreWrap}
            accessibilityRole="button"
            accessibilityLabel="See more recipes"
            accessibilityHint="Recipes feature is coming soon"
          >
            <Text style={styles.seeMoreText}>See more</Text>
          </Pressable>
        </View>

        {/* Ripeness Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ripeness</Text>

          <View style={{ marginTop: 22 }}>
            <Slider
              value={ripeness}
              onValueChange={onSliderChange}
              minimumValue={0}
              maximumValue={3}
              step={1}
              minimumTrackTintColor={TRACK}
              maximumTrackTintColor={TRACK}
              thumbTintColor={THUMB}
              accessibilityLabel="Ripeness slider"
              accessibilityHint="Slide to explore ripeness stages"
            />

            <View style={styles.ripenessRow}>
              {RIPENESS_LABELS.map((label, idx) => (
                <Text
                  key={label}
                  style={[
                    styles.ripenessLabel,
                    idx === ripeness && styles.ripenessLabelActive,
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>

            <Text style={styles.ripenessHint}>
              Selected:{" "}
              <Text style={styles.ripenessHintBold}>{ripenessLabel}</Text>
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 110,
  },

  topRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  logo: { width: 140, height: 140 },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  replayText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  subtitle: {
    fontSize: 30,
    fontWeight: "900",
    color: BRAND,
    textDecorationLine: "underline",
    marginBottom: 20,
    alignSelf: "flex-start",
  },

  card: {
    width: "100%",
    backgroundColor: BRAND,
    borderRadius: 34,
    padding: 22,
    marginTop: 22,
    minHeight: 190,
  },
  cardTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },

  cardBodyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 14,
  },
  cardBigText: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
  cardSmallText: {
    marginTop: 8,
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },

  seeMoreWrap: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
  seeMoreText: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  ripenessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  ripenessLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  ripenessLabelActive: {
    fontWeight: "900",
  },
  ripenessHint: {
    marginTop: 14,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    textAlign: "center",
  },
  ripenessHintBold: {
    fontWeight: "900",
  },
});