import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getRecipeSuggestions } from "@/services/suggestion";

const BG = "#FAF7F2";
const GREEN = "#1F4C47";
const GREEN_LIGHT = "#EEF3F0";
const GREEN_MID = "#2A5C56";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.55)";
const CARD_BORDER = "rgba(31,76,71,0.10)";

// Score thresholds calibrated to real score distribution:
//   93  = fruit in ingredients + perfect technique + flavour pairs → Excellent
//   90  = fruit in ingredients + perfect technique                 → Good
//   68  = fruit in title       + perfect technique                 → Fair
//   <68 = weak or no technique match                               → Weak
function scoreColor(score: number): string {
  if (score >= 92) return "#2A7A4B"; // excellent — deep green
  if (score >= 88) return "#1F4C47"; // good — brand green
  if (score >= 65) return "#7A6A2A"; // fair — amber
  return "#7A3A2A";                   // weak — muted red
}

function scoreLabel(score: number): string {
  if (score >= 92) return "Excellent";
  if (score >= 88) return "Good";
  if (score >= 65) return "Fair";
  return "Weak";
}

function ripnessEmoji(ripeness: string): string {
  const r = ripeness.toLowerCase();
  if (r === "rotten") return "🍂";
  if (r === "underripe") return "🌿";
  return "✨";
}

export default function SuggestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fruit = String(params.fruit || "");
  const ripeness = String(params.ripeness || "");

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getRecipeSuggestions({
          fruit,
          ripeness,
          fruitConfidence: Number(params.fruitConfidence || 1),
          ripenessConfidence: Number(params.ripenessConfidence || 1),
        });
        setData(res.suggestions || []);
      } catch (e) {
        console.log(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const color = scoreColor(item.score);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/recipe?id=${item.id}&public=1`)}
      >
        {/* Rank badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {item.title}
          </Text>

          {!!item.reason && (
            <Text style={styles.reason} numberOfLines={3}>
              {item.reason}
            </Text>
          )}

          {/* Score pill */}
          <View style={[styles.scorePill, { backgroundColor: color + "18", borderColor: color + "40" }]}>
            <View style={[styles.scoreDot, { backgroundColor: color }]} />
            <Text style={[styles.scoreText, { color }]}>
              {scoreLabel(item.score)} match
            </Text>
          </View>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Recipe Suggestions</Text>
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>🍎 {fruit}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{ripnessEmoji(ripeness)} {ripeness}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={styles.loadingText}>Finding the best matches…</Text>
          </View>
        ) : error ? (
          <View style={styles.centred}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptySubtitle}>Could not load suggestions. Please try again.</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              data.length > 0 ? (
                <Text style={styles.resultCount}>
                  {data.length} recipe{data.length !== 1 ? "s" : ""} found
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.centred}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adding recipes that use {fruit.toLowerCase()} to your collection.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  // ── Header ──────────────────────────────────────────────────────────────
  header: { gap: 14, marginBottom: 16 },

  backBtn: { alignSelf: "flex-start", paddingVertical: 2 },
  backText: { color: GREEN_MID, fontWeight: "900", fontSize: 15 },

  titleBlock: { gap: 10 },
  title: { fontSize: 28, fontWeight: "900", color: GREEN, letterSpacing: -0.5 },

  tagRow: { flexDirection: "row", gap: 8 },
  tag: {
    backgroundColor: GREEN_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tagText: { fontSize: 13, fontWeight: "700", color: GREEN },

  divider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginBottom: 16,
  },

  // ── List ─────────────────────────────────────────────────────────────────
  list: { gap: 10, paddingBottom: 32 },

  resultCount: {
    fontSize: 13,
    fontWeight: "700",
    color: MUTED,
    marginBottom: 6,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#1F4C47",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },

  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    flexShrink: 0,
  },
  rankText: { fontSize: 13, fontWeight: "900", color: GREEN },

  cardBody: { flex: 1, gap: 6 },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
    lineHeight: 20,
  },
  reason: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },

  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  chevron: {
    fontSize: 22,
    color: MUTED,
    fontWeight: "300",
    flexShrink: 0,
  },

  // ── Empty / loading states ────────────────────────────────────────────────
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  loadingText: { color: MUTED, fontSize: 14, fontWeight: "600", marginTop: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: TEXT_DARK },
  emptySubtitle: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});