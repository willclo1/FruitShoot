// A basic home screen for the app. Does not have any functionality yet.

import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>FruitShoot </Text>
    </View>
  );
}