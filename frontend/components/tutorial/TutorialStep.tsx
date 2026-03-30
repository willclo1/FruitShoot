import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TutorialStepConfig } from "@/constants/tutorialSteps";
import { useFontStyle } from "@/services/settingsContext";

type Props = {
  step: TutorialStepConfig;
  index: number;
  total: number;
};

export default function TutorialStep({ step, index, total }: Props) {
  const { scale, fontRegular, fontBold } = useFontStyle();

  return (
    <View style={styles.container}>
      <Text style={[styles.progress, { fontFamily: fontRegular, fontSize: 13 * scale }]}>
        Step {index + 1} of {total}
      </Text>

      <Text style={[styles.title, { fontFamily: fontBold, fontSize: 22 * scale }]}>
        {step.title}
      </Text>

      <View style={styles.highlightPill}>
        <Text style={[styles.highlightText, { fontFamily: fontBold, fontSize: 13 * scale }]}>
          {step.highlightLabel}
        </Text>
      </View>

      <Text style={[styles.description, { fontFamily: fontRegular, fontSize: 15 * scale }]}>
        {step.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  progress: {
    color: "#315A54",
    fontWeight: "700",
  },
  title: {
    color: "#193F3A",
    fontWeight: "900",
    lineHeight: 30,
  },
  highlightPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#D9E8E5",
    borderWidth: 1,
    borderColor: "#1F4A44",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  highlightText: {
    color: "#1F4A44",
    fontWeight: "800",
  },
  description: {
    color: "#21312F",
    lineHeight: 24,
  },
});
