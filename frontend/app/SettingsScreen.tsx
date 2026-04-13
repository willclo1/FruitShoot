import React from "react";
import { SafeAreaView, StyleSheet, Text, View, Pressable, Switch, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useTouchTarget } from "@/services/settingsContext";
import { useTutorial } from "@/services/tutorialContext";

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSettings } = useSettings();
  const { startTutorial } = useTutorial();
  const tt = useTouchTarget();

  const fontScale = settings.largeText ? 1.15 : 1.0;
  const accessibleFontBoost = settings.accessibleFont ? 1.08 : 1.0;
  const scale = fontScale * accessibleFontBoost * tt.fontBoost;

  const fontRegular = settings.accessibleFont ? "Atkinson-Regular" : undefined;
  const fontBold = settings.accessibleFont ? "Atkinson-Bold" : undefined;

  const preview = () => {
    if (!settings.ttsEnabled) return;
    tts.say("FruitShoot accessibility preview.", { rate: settings.ttsRate, pitch: settings.ttsPitch, interrupt: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} style={[styles.backRow, { minHeight: tt.minHeight }]}>
        <Text style={[styles.backText, { fontFamily: fontBold, fontSize: 16 * scale }]}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontSize: 22 * scale, fontFamily: fontBold }]}>Accessibility Settings</Text>
        <Text style={[styles.subtitle, { fontSize: 14 * scale, fontFamily: fontRegular }]}>Adjust voice and touch target sizing.</Text>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * scale, fontFamily: fontBold }]}>Text to Speech</Text>
          <Row label="Enable TTS" value={settings.ttsEnabled}
            onChange={(v) => setSettings((prev) => ({ ...prev, ttsEnabled: v, ttsMode: v ? "onDemand" : prev.ttsMode }))}
            scale={scale} fontFamily={fontBold} minHeight={tt.minHeight} />
          <Divider />
          <View style={[styles.row, { minHeight: tt.minHeight }]}>
            <Text style={[styles.rowLabel, { fontSize: 16 * scale, fontFamily: fontBold }]}>Auto speak on pages</Text>
            <Switch
              value={settings.ttsMode === "auto"}
              onValueChange={(v) => setSettings((prev) => ({ ...prev, ttsMode: v ? "auto" : "onDemand" }))}
              disabled={!settings.ttsEnabled}
            />
          </View>
          <Divider />
          <Stepper label="Speech speed" disabled={!settings.ttsEnabled} value={settings.ttsRate} min={0.7} max={1.4} step={0.1}
            onChange={(v) => setSettings((prev) => ({ ...prev, ttsRate: v }))} scale={scale} fontFamily={fontBold} tt={tt} />
          <Divider />
          <Stepper label="Speech pitch" disabled={!settings.ttsEnabled} value={settings.ttsPitch} min={0.8} max={1.3} step={0.1}
            onChange={(v) => setSettings((prev) => ({ ...prev, ttsPitch: v }))} scale={scale} fontFamily={fontBold} tt={tt} />
          <Divider />
          <Pressable
            style={({ pressed }) => [styles.button, { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius }, pressed && styles.buttonPressed, !settings.ttsEnabled && styles.buttonDisabled]}
            onPress={preview} disabled={!settings.ttsEnabled}
          >
            <Text style={[styles.buttonText, { fontSize: 16 * scale, fontFamily: fontBold }]}>Play Voice Preview</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * scale, fontFamily: fontBold }]}>Touch Targets</Text>
          <Row label="Larger touch targets" value={settings.largeTouchTargets}
            onChange={(v) => setSettings((prev) => ({ ...prev, largeTouchTargets: v }))}
            scale={scale} fontFamily={fontBold} minHeight={tt.minHeight} />
          <Divider />
          <Text style={[styles.helper, { fontSize: 12 * scale, fontFamily: fontRegular }]}>Makes buttons larger and easier to tap.</Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * scale, fontFamily: fontBold }]}>Font</Text>
          <Row label="Accessible font" value={settings.accessibleFont}
            onChange={(v) => setSettings((prev) => ({ ...prev, accessibleFont: v }))}
            scale={scale} fontFamily={fontBold} minHeight={tt.minHeight} />
          <Divider />
          <Text style={[styles.helper, { fontSize: 12 * scale, fontFamily: fontRegular }]}>
            Switches to Atkinson Hyperlegible, a font designed for low vision readers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * scale, fontFamily: fontBold }]}>Startup Splash</Text>
          <Stepper
            label="Splash display time (seconds)"
            disabled={false}
            value={settings.splashMinDurationMs / 1000}
            min={1.0}
            max={5.0}
            step={0.5}
            onChange={(v) =>
              setSettings((prev) => ({
                ...prev,
                splashMinDurationMs: Math.round(v * 1000),
              }))
            }
            scale={scale}
            fontFamily={fontBold}
            tt={tt}
          />
          <Divider />
          <Text style={[styles.helper, { fontSize: 12 * scale, fontFamily: fontRegular }]}>Controls how long the splash stays visible on cold app launch.</Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 14 * scale, fontFamily: fontBold }]}>Help / Tutorial</Text>
          <Text style={[styles.helper, { fontSize: 12 * scale, fontFamily: fontRegular }]}>Re-open the guided app tutorial at any time.</Text>
          <Pressable
              style={({ pressed }) => [
                styles.button,
                { minHeight: tt.minHeight, paddingVertical: tt.paddingVertical, borderRadius: tt.borderRadius },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                router.replace("/(tabs)");
                setTimeout(() => startTutorial(), 500);
              }}
            >
              <Text style={[styles.buttonText, { fontSize: 16 * scale, fontFamily: fontBold }]}>Replay Tutorial</Text>
            </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange, scale, fontFamily, minHeight }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  scale: number; fontFamily?: string; minHeight: number;
}) {
  return (
    <View style={[styles.row, { minHeight }]}>
      <Text style={[styles.rowLabel, { fontSize: 16 * scale, fontFamily }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }

function Stepper({ label, disabled, value, min, max, step, onChange, scale, fontFamily, tt }: {
  label: string; disabled: boolean; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; scale: number; fontFamily?: string;
  tt: { minHeight: number; borderRadius: number };
}) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));
  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.smallLabel, { fontSize: 13 * scale, fontFamily }]}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable disabled={disabled} onPress={dec}
          style={({ pressed }) => [styles.stepBtn, { minHeight: tt.minHeight, minWidth: tt.minHeight, borderRadius: tt.borderRadius }, pressed && !disabled && styles.stepBtnPressed, disabled && styles.stepBtnDisabled]}>
          <Text style={[styles.stepBtnText, { fontFamily }]}>-</Text>
        </Pressable>
        <View style={[styles.stepValueBox, { minHeight: tt.minHeight, borderRadius: tt.borderRadius }]}>
          <Text style={[styles.stepValue, { fontSize: 14 * scale, fontFamily }]}>{value.toFixed(1)}</Text>
        </View>
        <Pressable disabled={disabled} onPress={inc}
          style={({ pressed }) => [styles.stepBtn, { minHeight: tt.minHeight, minWidth: tt.minHeight, borderRadius: tt.borderRadius }, pressed && !disabled && styles.stepBtnPressed, disabled && styles.stepBtnDisabled]}>
          <Text style={[styles.stepBtnText, { fontFamily }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF7F2" },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#193F3A" },
  subtitle: { color: "#3E3E3E", lineHeight: 20 },
  backRow: { 
    alignSelf: "flex-start", 
    paddingVertical: 20, 
    marginLeft: 15, 
    justifyContent: "center" 
  },
  backText: { color: "#1F4C47", fontWeight: "600" },
  card: { 
    backgroundColor: "#1F4C47", 
    borderRadius: 16, 
    padding: 16, 
    gap: 12, 
    shadowColor: "#000", 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 6 }, 
    elevation: 2 
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
    justifyContent: "center" 
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
    justifyContent: "center" 
  },
  stepValue: { color: "#193F3A", fontWeight: "800" },
  button: { 
    borderRadius: 12, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#193F3A" 
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonDisabled: { 
    opacity: 1, 
    backgroundColor: "#A7B7B4", 
    borderWidth: 1, 
    borderColor: "#6E8480" 
  },
  buttonText: { color: "white", fontWeight: "800" },
});