import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  SafeAreaView,
} from "react-native";

/**
 * SplashScreen Component
 *
 * Displays a centered splash screen with the FruitShoot logo and loading spinner
 * on initial app load. Fades out smoothly when the app is ready, or instantly
 * if the user has motion reduction enabled.
 *
 * Props:
 *   - isVisible: boolean - Controls whether the splash should be shown/hidden
 *   - onHide: () => void - Callback invoked when fade animation completes,
 *             allowing parent to remove component from render tree
 *   - reduceMotion: boolean - If true, splash hides instantly without fade animation
 *
 * Animation Flow:
 *   1. Component mounts with opacity = 1 (fully visible)
 *   2. When isVisible becomes false:
 *      - If reduceMotion: Set opacity to 0 immediately, call onHide()
 *      - Otherwise: Animate opacity 1→0 over 600ms, then call onHide()
 *   3. onHide() callback signals parent to remove splash from render tree
 *
 * Accessibility:
 *   - Non-interactive (pointerEvents: "none") to prevent user interaction
 *   - Respects system motion reduction preferences
 *   - Uses system ActivityIndicator for consistent platform styling
 */

interface SplashScreenProps {
  isVisible: boolean;
  onHide: () => void;
  reduceMotion: boolean;
}

// Brand colors from theme
const BRAND_COLOR = "#193F3A"; // Primary brand green
const BG_COLOR = "#F6F3EE"; // Cream background

export default function SplashScreen({
  isVisible,
  onHide,
  reduceMotion,
}: SplashScreenProps) {
  // Animated value for opacity, starts at 1 (fully visible)
  const opacityAnim = useRef(new Animated.Value(1)).current;

  /**
   * Handle visibility changes:
   * - When isVisible becomes false, trigger fade-out (or instant hide if reduceMotion)
   */
  useEffect(() => {
    if (!isVisible) {
      if (reduceMotion) {
        // Respect motion reduction: instantly hide without animation
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }).start(() => {
          onHide();
        });
      } else {
        // Smooth fade-out over 600ms
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          onHide();
        });
      }
    }
  }, [isVisible, reduceMotion, opacityAnim, onHide]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* FruitShoot Logo */}
          <Image
            source={require("../assets/images/FruitShoot Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Loading Spinner */}
          <ActivityIndicator
            size="large"
            color={BRAND_COLOR}
            style={styles.spinner}
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /**
   * Container: Full-screen overlay positioned absolutely
   * Covers entire viewport
   */
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },

  /**
   * SafeArea: Ensures content respects device notches/safe areas
   */
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  /**
   * ContentContainer: Centered column layout for logo and spinner
   */
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
  },

  /**
   * Logo: FruitShoot app logo
   * ~120px responsive size, scales based on screen width if needed
   */
  logo: {
    width: 120,
    height: 120,
  },

  /**
   * Spinner: ActivityIndicator margin to position below logo
   */
  spinner: {
    marginTop: 8,
  },
});
