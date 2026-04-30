import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ttsController } from "../services/ttsController";
import { MaterialIcons } from "@expo/vector-icons";

export default function GlobalTtsControl() {
  const [state, setState] = React.useState<{
    playing: boolean;
    index: number;
    total: number;
    line?: string;
  }>(ttsController.getState());

  React.useEffect(() => {
    const unsub = ttsController.subscribe((s) => setState(s));
    return unsub;
  }, []);

  if (!state.total) return null;

  const progress = state.total ? Math.min(1, state.index / state.total) : 0;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.inner}>
        <Pressable onPress={() => (state.playing ? ttsController.stop() : ttsController.resume())} style={styles.playBtn}>
          <MaterialIcons name={state.playing ? "pause" : "play-arrow"} size={20} color="#fff" />
        </Pressable>
        <View style={styles.meta}>
          <Text style={styles.text}>{state.playing ? `Playing ${state.index}/${state.total}` : `Paused ${Math.max(0, state.index)}/${state.total}`}</Text>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 18,
    zIndex: 9999,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 12,
    width: "100%",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A5C56",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  meta: { flex: 1 },
  text: { color: "#fff", fontWeight: "700", marginBottom: 6 },
  barBackground: { height: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 6, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: "#7DE3C9" },
});
