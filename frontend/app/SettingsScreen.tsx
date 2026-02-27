import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSettings } = useSettings();

  const fontScale = settings.largeText ? 1.15 : 1.0;

  const preview = () => {
    if (!settings.ttsEnabled) return;
    tts.say("FruitShoot accessibility preview.", {
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
      interrupt: true,
    });
  };

  const contrastLabel = settings.highContrast
    ? "High Contrast"
    : "Standard Contrast";

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: 22 * fontScale }]}>
          Accessibility Settings
        </Text>

        <Text style={[styles.subtitle, { fontSize: 14 * fontScale }]}>
          Adjust voice, touch target sizing, and contrast options.
        </Text>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * fontScale }]}>
            Text to Speech
          </Text>

          <Row
            label="Enable TTS"
            value={settings.ttsEnabled}
            onChange={(v) =>
              setSettings((prev) => ({
                ...prev,
                ttsEnabled: v,
                // ✅ If turning ON: default to onDemand (no auto speech unless user chooses it)
                // ✅ If turning OFF: keep mode as-is (or force onDemand; either is fine)
                ttsMode: v ? "onDemand" : prev.ttsMode,
              }))
            }
            fontScale={fontScale}
          />

          <Divider />

          {/* Auto speak toggle (only meaningful if TTS enabled) */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { fontSize: 16 * fontScale }]}>
              Auto speak on pages
            </Text>
            <Switch
              value={settings.ttsMode === "auto"}
              onValueChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  // only allow changing when enabled
                  ttsMode: v ? "auto" : "onDemand",
                }))
              }
              disabled={!settings.ttsEnabled}
            />
          </View>

          <Divider />

          <Stepper
            label="Speech speed"
            disabled={!settings.ttsEnabled}
            value={settings.ttsRate}
            min={0.7}
            max={1.4}
            step={0.1}
            onChange={(v) => setSettings((prev) => ({ ...prev, ttsRate: v }))}
            fontScale={fontScale}
          />

          <Divider />

          <Stepper
            label="Speech pitch"
            disabled={!settings.ttsEnabled}
            value={settings.ttsPitch}
            min={0.8}
            max={1.3}
            step={0.1}
            onChange={(v) => setSettings((prev) => ({ ...prev, ttsPitch: v }))}
            fontScale={fontScale}
          />

          <Divider />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              !settings.ttsEnabled && styles.buttonDisabled,
            ]}
            onPress={preview}
            disabled={!settings.ttsEnabled}
          >
            <Text style={[styles.buttonText, { fontSize: 16 * fontScale }]}>
              Play Voice Preview
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * fontScale }]}>
            Touch Targets
          </Text>

          <Row
            label="Larger touch targets"
            value={settings.largeTouchTargets}
            onChange={(v) =>
              setSettings((prev) => ({ ...prev, largeTouchTargets: v }))
            }
            fontScale={fontScale}
          />

          <Divider />

          <Text style={[styles.helper, { fontSize: 12 * fontScale }]}>
            Makes buttons larger and easier to tap.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * fontScale }]}>
            Color Contrast
          </Text>

          <Row
            label={contrastLabel}
            value={settings.highContrast}
            onChange={(v) =>
              setSettings((prev) => ({ ...prev, highContrast: v }))
            }
            fontScale={fontScale}
          />

          <Divider />

          <Text style={[styles.helper, { fontSize: 12 * fontScale }]}>
            (Dummy setting) This will be used later to increase contrast across the
            app.
          </Text>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  onChange,
  fontScale,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  fontScale: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { fontSize: 16 * fontScale }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Stepper({
  label,
  disabled,
  value,
  min,
  max,
  step,
  onChange,
  fontScale,
}: {
  label: string;
  disabled: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fontScale: number;
}) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.smallLabel, { fontSize: 13 * fontScale }]}>{label}</Text>

      <View style={styles.stepRow}>
        <Pressable
          disabled={disabled}
          onPress={dec}
          style={({ pressed }) => [
            styles.stepBtn,
            pressed && !disabled && styles.stepBtnPressed,
            disabled && styles.stepBtnDisabled,
          ]}
        >
          <Text style={styles.stepBtnText}>-</Text>
        </Pressable>

        <View style={styles.stepValueBox}>
          <Text style={[styles.stepValue, { fontSize: 14 * fontScale }]}>
            {value.toFixed(1)}
          </Text>
        </View>

        <Pressable
          disabled={disabled}
          onPress={inc}
          style={({ pressed }) => [
            styles.stepBtn,
            pressed && !disabled && styles.stepBtnPressed,
            disabled && styles.stepBtnDisabled,
          ]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF7F2" },

  topBar: { paddingHorizontal: 16, paddingTop: 8, alignItems: "flex-start" },
  backButton: {
    backgroundColor: "#193F3A",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },

  title: { fontWeight: "800", color: "#193F3A" },
  subtitle: { color: "#3E3E3E", lineHeight: 20 },
  backRow: {
    alignSelf: "flex-start",
    paddingVertical: 20,
    marginLeft: 15,
  },

  backText: {
    color: "#1F4C47",
    fontSize: 16,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#1F4C47",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { color: "white", fontWeight: "700" },

  divider: { height: 1, backgroundColor: "#EFE7DE" },

  sectionTitle: { color: "white", fontWeight: "900" },
  smallLabel: { color: "white", fontWeight: "800" },
  helper: { color: "white", lineHeight: 18 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#193F3A",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  stepBtnDisabled: { opacity: 0.5 },
  stepBtnText: { color: "white", fontSize: 20, fontWeight: "900" },

  stepValueBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FAF7F2",
    borderWidth: 1,
    borderColor: "#EFE7DE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { color: "#193F3A", fontWeight: "800" },

  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#193F3A",
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonDisabled: {
    opacity: 1,
    backgroundColor: "#A7B7B4",
    borderWidth: 1,
    borderColor: "#6E8480",
  },
  buttonText: { color: "white", fontWeight: "800" },
});