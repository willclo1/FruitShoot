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

export default function SuggestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const fruit = String(params.fruit || "");
  const ripeness = String(params.ripeness || "");

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Suggestions</Text>
        <Text style={styles.subtitle}>
          {fruit} · {ripeness}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/recipe?id=${item.id}`)}
              >
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                No good matches for this fruit.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, padding: 20 },

  back: { color: GREEN, fontWeight: "900", marginBottom: 10 },

  title: { fontSize: 26, fontWeight: "900", color: GREEN },
  subtitle: { marginTop: 4, opacity: 0.6 },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  reason: { marginTop: 4, opacity: 0.6 },

  empty: { marginTop: 20, opacity: 0.6 },
});