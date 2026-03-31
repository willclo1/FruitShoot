import React, { useEffect, useRef } from "react";
import { LayoutChangeEvent, View, type ViewStyle, StyleProp } from "react-native";
import { useTutorial } from "@/services/tutorialContext";

type Props = {
  id: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * TourTarget registers screen element bounds for walkthrough highlighting.
 * The overlay uses these window-relative coordinates to dim the rest of the UI
 * and visually emphasize the active feature.
 */
export default function TourTarget({ id, children, style }: Props) {
  const ref = useRef<View | null>(null);
  const { registerTarget, unregisterTarget } = useTutorial();

  const measure = () => {
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.measureInWindow((x, y, width, height) => {
        if (!width || !height) return;
        registerTarget(id, { x, y, width, height });
      });
    });
  };

  const onLayout = (_e: LayoutChangeEvent) => {
    measure();
  };

  useEffect(() => {
    measure();
    return () => unregisterTarget(id);
  }, [id]);

  return (
    <View ref={ref} onLayout={onLayout} style={style} collapsable={false}>
      {children}
    </View>
  );
}
