import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
  Animated,
} from "react-native";
import type { TutorialStepConfig } from "@/constants/tutorialSteps";
import { tts } from "@/services/tts";
import { useSettings, useFontStyle } from "@/services/settingsContext";
import { usePathname, useRouter } from "expo-router";
import { useTutorial } from "@/services/tutorialContext";
import {
  calculateCalloutPosition,
  calculateSpotlightMasks,
  isTargetVisible,
} from "@/utils/tutorialPositioning";
import type { CalloutPosition } from "@/utils/tutorialPositioning";

type Props = {
  visible: boolean;
  steps: TutorialStepConfig[];
  onClose: () => void;
};

/**
 * TutorialOverlay - Interactive guided walkthrough with spotlight highlighting.
 *
 * Features:
 * - Dynamic spotlight effect with four-sided masks and padding
 * - Animated highlight border with glow and pulse effect
 * - Intelligent callout positioning with arrow direction
 * - Cross-page navigation support
 * - TTS narration with mute toggle
 * - Smooth transitions between steps
 *
 * Positioning logic:
 * 1. Gets target element bounds from tutorialContext (registered by TourTarget wrapper)
 * 2. Calculates spotlight masks around target with padding
 * 3. Determines best callout placement (top/bottom/center) based on available space
 * 4. Positions arrow to point from callout toward target center
 * 5. Clamps all positions to screen bounds to prevent overflow
 */
export default function TutorialOverlay({ visible, steps, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();

  const {
    currentStepIndex,
    nextStep,
    prevStep,
    setCurrentStepIndex,
    getTargetRect,
  } = useTutorial();

  const { settings } = useSettings();
  const { scale, fontBold } = useFontStyle();

  const [calloutHeight, setCalloutHeight] = useState(210);
  const [narrationEnabled, setNarrationEnabled] = useState(settings.ttsEnabled);

  // Animation values for highlight frame pulse and callout fade-in
  const pulseScale = useRef(new Animated.Value(1)).current;
  const calloutOpacity = useRef(new Animated.Value(0)).current;

  const currentStep = useMemo(
    () => steps[currentStepIndex],
    [steps, currentStepIndex]
  );
  const targetRect = getTargetRect(currentStep?.targetId);

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  /**
   * Helper: Check if current pathname matches expected route.
   * Handles query parameters by ignoring them in comparison.
   */
  const routeMatches = (current: string, expected?: string) => {
    if (!expected) return true;
    const expectedPath = expected.split("?")[0];
    return current === expectedPath || current.endsWith(expectedPath);
  };

  /**
   * Effect: Cross-page walkthrough navigation
   * Automatically navigates to the page containing the current step's target element.
   * This allows the walkthrough to work across multiple screens seamlessly.
   */
  useEffect(() => {
    if (!visible || !currentStep?.route) return;
    if (routeMatches(pathname, currentStep.route)) return;
    router.push(currentStep.route as any);
  }, [visible, currentStep?.route, pathname, router]);

  /**
   * Effect: Initialize tutorial and sync with settings
   * Resets to first step when tutorial is opened.
   */
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      setNarrationEnabled(settings.ttsEnabled);
    }
  }, [visible, settings.ttsEnabled, setCurrentStepIndex]);

  /**
   * Effect: Animate highlight frame pulse and callout fade-in
   * Creates a subtle visual feedback when step changes.
   */
  useEffect(() => {
    if (!visible) return;

    // Reset and start pulse animation on highlight border
    pulseScale.setValue(1);
    Animated.sequence([
      Animated.timing(pulseScale, {
        toValue: 1.12,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(pulseScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in callout
    calloutOpacity.setValue(0);
    Animated.timing(calloutOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStepIndex, visible, pulseScale, calloutOpacity]);

  /**
   * Effect: TTS Narration
   * Speaks the current step's text-to-speech when narration is enabled.
   * Automatically stops speech on step change, close, or when narration is disabled.
   *
   * Narration text: title + description + (optional) instruction
   * Or custom narration text if provided in step config.
   */
  useEffect(() => {
    if (!visible || !currentStep) {
      tts.stop();
      return;
    }

    if (!narrationEnabled) {
      tts.stop();
      return;
    }

    const textToSpeak =
      currentStep.narration ??
      `${currentStep.title}. ${currentStep.description}${
        currentStep.instruction ? ` ${currentStep.instruction}` : ""
      }`;

    tts.say(textToSpeak, {
      interrupt: true,
      rate: settings.ttsRate,
      pitch: settings.ttsPitch,
    });

    return () => {
      tts.stop();
    };
  }, [visible, currentStep, narrationEnabled, settings.ttsRate, settings.ttsPitch]);

  /**
   * Handlers: Tutorial navigation and control
   */
  const closeNow = () => {
    tts.stop();
    onClose();
  };

  const next = () => {
    tts.stop();
    if (isLast) {
      closeNow();
      return;
    }
    nextStep(steps.length);
  };

  const back = () => {
    tts.stop();
    prevStep();
  };

  if (!steps.length) return null;

  /**
   * Position calculations using utility functions
   *
   * 1. Calculate callout dimensions and position
   * 2. Calculate spotlight masks around target
   * 3. Determine if target is visible (for visibility indicator)
   */
  const calloutWidth = Math.min(360, width - 24);
  const calloutPosition: CalloutPosition = calculateCalloutPosition(
    targetRect,
    width,
    height,
    calloutWidth,
    calloutHeight,
    currentStep?.placement
  );

  const spotlightMasks = targetRect
    ? calculateSpotlightMasks(targetRect, width, height, 8)
    : null;

  const targetVisible = targetRect ? isTargetVisible(targetRect, width, height) : true;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={closeNow}
    >
      <SafeAreaView style={styles.overlay}>
        {/* Spotlight masks: Four-sided dim effect around target */}
        {spotlightMasks ? (
          <>
            {/* Top mask */}
            <View
              style={[
                styles.mask,
                {
                  left: spotlightMasks.top.x,
                  top: spotlightMasks.top.y,
                  width: spotlightMasks.top.width,
                  height: spotlightMasks.top.height,
                },
              ]}
            />
            {/* Left mask */}
            <View
              style={[
                styles.mask,
                {
                  left: spotlightMasks.left.x,
                  top: spotlightMasks.left.y,
                  width: spotlightMasks.left.width,
                  height: spotlightMasks.left.height,
                },
              ]}
            />
            {/* Right mask */}
            <View
              style={[
                styles.mask,
                {
                  left: spotlightMasks.right.x,
                  top: spotlightMasks.right.y,
                  width: spotlightMasks.right.width,
                  height: spotlightMasks.right.height,
                },
              ]}
            />
            {/* Bottom mask */}
            <View
              style={[
                styles.mask,
                {
                  left: spotlightMasks.bottom.x,
                  top: spotlightMasks.bottom.y,
                  width: spotlightMasks.bottom.width,
                  height: spotlightMasks.bottom.height,
                },
              ]}
            />

            {/* Highlight frame with glow effect around target element */}
            {targetRect && targetVisible && (
              <>
                {/* Glow shadow layer (subtle background) */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.highlightGlow,
                    {
                      left: targetRect.x - 12,
                      top: targetRect.y - 12,
                      width: targetRect.width + 24,
                      height: targetRect.height + 24,
                    },
                  ]}
                />
                {/* Main highlight frame with pulse animation */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.highlightFrame,
                    {
                      left: targetRect.x - 6,
                      top: targetRect.y - 6,
                      width: targetRect.width + 12,
                      height: targetRect.height + 12,
                      transform: [{ scale: pulseScale }],
                    },
                  ]}
                />
              </>
            )}
          </>
        ) : (
          // Fallback: Full screen dim with no target highlight
          <View style={styles.maskFallback} />
        )}

        {/* Callout sheet with arrow, content, and controls */}
        <Animated.View
          style={[
            styles.sheet,
            {
              width: calloutWidth,
              left: calloutPosition.left,
              top: calloutPosition.top,
              opacity: calloutOpacity,
            },
          ]}
          onLayout={(e) => setCalloutHeight(e.nativeEvent.layout.height)}
        >
          {/* Pointer arrow (up direction - callout is below target) */}
          {calloutPosition.arrowDirection === "up" && (
            <View
              style={[
                styles.arrowUp,
                {
                  left: calloutPosition.arrowLeft,
                },
              ]}
            />
          )}

          {/* Pointer arrow (down direction - callout is above target) */}
          {calloutPosition.arrowDirection === "down" && (
            <View
              style={[
                styles.arrowDown,
                {
                  left: calloutPosition.arrowLeft,
                },
              ]}
            />
          )}

          {/* Header: Title + Exit button */}
          <View style={styles.topRow}>
            <Text
              style={[
                styles.heading,
                { fontFamily: fontBold, fontSize: 18 * scale },
              ]}
            >
              App Tutorial
            </Text>
            <Pressable
              onPress={closeNow}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.closeBtnText,
                  { fontFamily: fontBold, fontSize: 13 * scale },
                ]}
              >
                Exit
              </Text>
            </Pressable>
          </View>

          {/* Narration toggle control */}
          <View style={styles.toggleRow}>
            <Text
              style={[
                styles.toggleLabel,
                { fontFamily: fontBold, fontSize: 14 * scale },
              ]}
            >
              Narration
            </Text>
            <Switch
              value={narrationEnabled}
              onValueChange={setNarrationEnabled}
            />
          </View>

          {/* Step content: Progress, title, feature pill, description, instruction */}
          <View style={styles.stepBox}>
            {/* Step progress indicator */}
            <Text
              style={[
                styles.progress,
                { fontFamily: fontBold, fontSize: 12 * scale },
              ]}
            >
              Step {currentStepIndex + 1} of {steps.length}
            </Text>

            {/* Step title */}
            <Text
              style={[
                styles.stepTitle,
                { fontFamily: fontBold, fontSize: 20 * scale },
              ]}
            >
              {currentStep.title}
            </Text>

            {/* Feature highlight pill - shows which UI element is being highlighted */}
            <View style={styles.featurePill}>
              <Text
                style={[
                  styles.featureText,
                  { fontFamily: fontBold, fontSize: 12 * scale },
                ]}
              >
                {currentStep.highlightLabel}
              </Text>
            </View>

            {/* Step description */}
            <Text
              style={[
                styles.stepDescription,
                { fontFamily: fontBold, fontSize: 14 * scale },
              ]}
            >
              {currentStep.description}
            </Text>

            {/* Optional instruction/tip */}
            {!!currentStep.instruction && (
              <Text
                style={[
                  styles.stepInstruction,
                  { fontFamily: fontBold, fontSize: 13 * scale },
                ]}
              >
                Tip: {currentStep.instruction}
              </Text>
            )}

            {/* Cross-page navigation indicator */}
            {!!currentStep.route &&
              !routeMatches(pathname, currentStep.route) && (
                <Text
                  style={[
                    styles.routeHint,
                    { fontFamily: fontBold, fontSize: 12 * scale },
                  ]}
                >
                  Navigating to the next screen...
                </Text>
              )}
          </View>

          {/* Footer: Navigation buttons (Skip, Back, Next/Finish) */}
          <View style={styles.footer}>
            <Pressable
              onPress={closeNow}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { fontFamily: fontBold, fontSize: 14 * scale },
                ]}
              >
                Skip
              </Text>
            </Pressable>

            <Pressable
              onPress={back}
              disabled={isFirst}
              style={({ pressed }) => [
                styles.secondaryBtn,
                isFirst && styles.disabledBtn,
                pressed && !isFirst && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { fontFamily: fontBold, fontSize: 14 * scale },
                ]}
              >
                Back
              </Text>
            </Pressable>

            <Pressable
              onPress={next}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { fontFamily: fontBold, fontSize: 14 * scale },
                ]}
              >
                {isLast ? "Finish" : "Next"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: "relative",
  },

  /**
   * SPOTLIGHT EFFECT STYLES
   * ========================
   * The mask creates a dim overlay covering the screen, with spotlight masks
   * positioned around the target element. This creates a "spotlight" effect
   * where the target is prominent and everything else is dimmed.
   */
  mask: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },
  maskFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
  },

  /**
   * HIGHLIGHT BORDER STYLES
   * =======================
   * Modern, clean border with soft color and subtle glow.
   * - Border color: Soft light green (#A8D8CF) - complements the brand
   * - Background: Very subtle highlight (light green at 8% opacity)
   * - Border radius: 16px for smooth, modern appearance
   * - Glow: Added as a separate layer for depth
   */
  highlightGlow: {
    position: "absolute",
    borderRadius: 20,
    // Subtle outer glow effect
    backgroundColor: "rgba(168, 216, 207, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 216, 207, 0.08)",
  },
  highlightFrame: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#A8D8CF",
    borderRadius: 16,
    backgroundColor: "rgba(168, 216, 207, 0.08)",
    // Shadow for emphasis (iOS)
    shadowColor: "#A8D8CF",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    // Shadow for emphasis (Android)
    elevation: 4,
  },

  /**
   * CALLOUT SHEET STYLES
   * ====================
   * Clean, modern card with shadow for depth.
   * Features:
   * - Warm background (#F6F3EE) for readability
   * - Dark green border matching brand
   * - Rounded corners (18px) for modern look
   * - Subtle shadow for depth and elevation
   * - Gap between child elements for spacious layout
   */
  sheet: {
    position: "absolute",
    backgroundColor: "#F6F3EE",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#1F4A44",
    padding: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  /**
   * ARROW POINTER STYLES
   * ====================
   * Directional triangular arrows connecting callout to target.
   * Positioned relative to callout and point toward highlighted element.
   *
   * Arrow styling:
   * - Size: 20px base width (10+10), 12px height
   * - Color: Matches callout background (#F6F3EE) for seamless appearance
   * - Positioning: Absolute, centered horizontally on target
   *
   * "up" arrow: Points upward (callout above target, arrow points down)
   * "down" arrow: Points downward (callout below target, arrow points up)
   */
  arrowUp: {
    position: "absolute",
    top: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F6F3EE",
  },
  arrowDown: {
    position: "absolute",
    bottom: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F6F3EE",
  },

  /**
   * HEADER ROW (Title + Exit button)
   */
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    color: "#193F3A",
    fontWeight: "900",
  },
  closeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F4A44",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeBtnText: {
    color: "#1F4A44",
    fontWeight: "800",
  },

  /**
   * NARRATION TOGGLE ROW
   */
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8DBD7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#EAF3F1",
  },
  toggleLabel: {
    color: "#1F4A44",
    fontWeight: "800",
  },

  /**
   * STEP CONTENT BOX
   * ================
   * Contains progress indicator, title, feature pill, description, and optional instruction.
   */
  stepBox: {
    gap: 10,
  },
  progress: {
    color: "#2B5751",
    fontWeight: "800",
    fontSize: 12,
  },
  stepTitle: {
    color: "#193F3A",
    fontWeight: "900",
  },
  featurePill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#1F4A44",
    backgroundColor: "#E3F1EE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featureText: {
    color: "#1F4A44",
    fontWeight: "800",
  },
  stepDescription: {
    color: "#21312F",
    fontWeight: "600",
    lineHeight: 22,
  },
  stepInstruction: {
    color: "#2B5C55",
    fontWeight: "600",
    lineHeight: 20,
  },
  routeHint: {
    color: "#355F58",
    opacity: 0.9,
    fontSize: 12,
  },

  /**
   * FOOTER BUTTON ROW
   * =================
   * Three-button layout: Skip, Back, Next/Finish
   * Primary action (Next/Finish) uses dark green background
   * Secondary actions (Skip, Back) use white with border
   */
  footer: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F4A44",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: {
    color: "#1F4A44",
    fontWeight: "800",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    backgroundColor: "#193F3A",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
});
