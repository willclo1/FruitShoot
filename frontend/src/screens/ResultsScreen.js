import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

const SAMPLE_RESULTS = [
  { id: "1", title: "Apple — Confidence: 95%" },
  { id: "2", title: "Banana — Confidence: 88%" },
];

export default function ResultsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Results</Text>
      <FlatList
        data={SAMPLE_RESULTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.title}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No results yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  item: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f7f7f7",
    marginBottom: 8,
  },
  empty: { color: "#666" },
});
