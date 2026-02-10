import React from "react";
import { View, Text, Image, Button, StyleSheet } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://placehold.co/200x200?text=Avatar" }}
        style={styles.avatar}
      />
      <Text style={styles.name}>Guest User</Text>
      <Text style={styles.email}>guest@example.com</Text>
      <View style={styles.actions}>
        <Button title="Edit Profile" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: "600" },
  email: { fontSize: 14, color: "#666", marginBottom: 20 },
  actions: { width: "60%" },
});
