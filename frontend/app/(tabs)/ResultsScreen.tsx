import React, { useMemo, useState, useEffect } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import { getUserRecipes, type Recipe } from "@/services/recipes";

const BRAND = "#1F4C47";
const BG = "#F6F3EE";
const TRACK = "#D9D9D9";
const THUMB = "#E94B3C";

const RIPENESS_LABELS = ["Unripe", "Ripe", "Overripe", "Spoiled"];

export default function ResultsScreen() {
  const [ripeness, setRipeness] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const ripenessLabel = useMemo(() => RIPENESS_LABELS[ripeness], [ripeness]);

  // Load recipes on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await getUserRecipes();
        if (mounted) {
          setRecipes(data);
        }
      } catch (e: any) {
        if (mounted) {
          console.error("Failed to load recipes:", e.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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

        {/* Recipes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recipes</Text>

          {loading ? (
            <View style={styles.cardBodyCenter}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : recipes.length === 0 ? (
            <View style={styles.cardBodyCenter}>
              <Text style={styles.cardBigText}>No Recipes</Text>
            </View>
          ) : (
            <View style={styles.cardBody}>
              {recipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onPress={() =>
                    Alert.alert(recipe.title, recipe.ingredients_description)
                  }
                  style={styles.recipeItemSmall}
                >
                  <Text style={styles.recipeItemTitle}>{recipe.title}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={() =>
              Alert.alert(
                "Recipes",
                `You have ${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}.`
              )
            }
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
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: BRAND,
    marginBottom: 6,
  },
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
    paddingTop: 10,
  },
  cardBody: {
    paddingTop: 10,
    maxHeight: 120,
  },
  recipeItemSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 6,
  },
  recipeItemTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  cardBigText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
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
});
