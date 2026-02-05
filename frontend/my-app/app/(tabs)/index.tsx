import { Image, Pressable, SafeAreaView, StyleSheet, Text, View, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  const buttons = [
    { label: "Upload Picture", onPress: () => router.push("/UploadScreen") },
    { label: "Instructions", onPress: () => Alert.alert("Instructions coming soon...") },
    { label: "Login", onPress: () => Alert.alert("Login page coming soon...") },
  ];

  // If you want navigation later, swap onPress to something like:
  // { label: "Profile", onPress: () => router.push("/profile") }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image
          source={require("../../assets/images/FruitShoot Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.buttonStack}>
          {buttons.map((b) => (
            <Pressable
              key={b.label}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={b.onPress}
            >
              <Text style={styles.buttonText}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  logo: {
    width: 220,
    height: 220,
  },
  buttonStack: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#193F3A",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
