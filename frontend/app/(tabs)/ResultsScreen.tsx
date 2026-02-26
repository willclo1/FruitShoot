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

const BRAND = "#1F4C47";
const BG = "#F6F3EE";
const TRACK = "#D9D9D9";
const THUMB = "#E94B3C";
const COOL_GRAY = "#B9C0BE";

const RIPENESS_LABELS = ["Unripe", "Ripe", "Overripe", "Spoiled"];

export default function ResultsScreen() {
  const [ripeness, setRipeness] = useState(0);
  const ripenessLabel = useMemo(() => RIPENESS_LABELS[ripeness], [ripeness]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Image
          source={require("../../assets/images/FruitShoot Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.subtitle}>Results</Text>

        {/* Recipes Card (placeholder only) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recipes</Text>

          <View style={styles.cardBodyCenter}>
            <Text style={styles.cardBigText}>Coming soon</Text>
            <Text style={styles.cardSmallText}>
              Recipe suggestions will appear here in a future update.
            </Text>
          </View>

          <Pressable
            onPress={() => Alert.alert("Recipes", "Recipe suggestions are coming soon.")}
            style={styles.seeMoreWrap}
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
              onValueChange={(v) => setRipeness(Math.round(v))}
              minimumValue={0}
              maximumValue={3}
              step={1}
              minimumTrackTintColor={TRACK}
              maximumTrackTintColor={TRACK}
              thumbTintColor={THUMB}
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
              Selected: <Text style={styles.ripenessHintBold}>{ripenessLabel}</Text>
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

  logo: { width: 140, height: 140, marginBottom: 6 },
  subtitle: {
    fontSize: 30,
    fontWeight: "900",
    color: BRAND,
    textDecorationLine: "underline",
    marginBottom: 20,
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