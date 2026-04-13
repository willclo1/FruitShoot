import React, { useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useCopilot } from "react-native-copilot";
import { useRouter } from "expo-router";
import { useFontStyle } from "@/services/settingsContext";

const TOOLTIP_MARGIN = 16;
const TOOLTIP_WIDTH = Dimensions.get("window").width - TOOLTIP_MARGIN * 2;

const BRAND = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

export default function CopilotTooltip() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    goToNext,
    goToPrev,
    stop,
    copilotEvents,
    totalStepsNumber,
    currentStepNumber,
  } = useCopilot();
  const { scale, fontBold, fontRegular } = useFontStyle();
  const router = useRouter();

  useEffect(() => {
    const listener = () => {
      router.replace("/(tabs)");
    };
    copilotEvents.on("stop", listener);
    return () => {
      copilotEvents.off("stop", listener);
    };
  }, [copilotEvents, router]);

  if (!currentStep) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.progress, { fontFamily: fontBold, fontSize: 11 * scale }]}>
        Step {currentStepNumber} of {totalStepsNumber}
      </Text>

      <Text style={[styles.title, { fontFamily: fontBold, fontSize: 18 * scale }]}>
        {currentStep.name}
      </Text>

      <Text style={[styles.description, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
        {currentStep.text}
      </Text>

      <View style={styles.footer}>
        <Pressable
          onPress={stop}
          style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.skipText, { fontFamily: fontBold, fontSize: 13 * scale }]}>
            Skip
          </Text>
        </Pressable>

        <View style={styles.navRow}>
          {!isFirstStep && (
            <Pressable
              onPress={goToPrev}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.backText, { fontFamily: fontBold, fontSize: 13 * scale }]}>
                Back
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={isLastStep ? stop : goToNext}
            style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.nextText, { fontFamily: fontBold, fontSize: 13 * scale }]}>
              {isLastStep ? "Done" : "Next →"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CREAM,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    width: "100%",
    overflow: "visible",
    borderWidth: 1.5,
    borderColor: "rgba(31,76,71,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  progress: {
    color: BRAND,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  description: {
    color: MUTED,
    lineHeight: 20,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(31,76,71,0.06)",
  },
  skipText: {
    color: MUTED,
    fontWeight: "800",
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(31,76,71,0.06)",
  },
  backText: {
    color: TEXT_DARK,
    fontWeight: "800",
  },
  nextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  nextText: {
    color: "#fff",
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.8,
  },
});
