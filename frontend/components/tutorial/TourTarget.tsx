import React from "react";
import { View, type ViewStyle, StyleProp } from "react-native";
import { CopilotStep, walkthroughable } from "react-native-copilot";

const WalkthroughView = walkthroughable(View);

type Props = {
  /** CopilotStep name — must match a tutorial step id */
  id: string;
  /** Step order (1-indexed) for copilot sequencing */
  order: number;
  /** Tooltip text shown for this step */
  text: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function TourTarget({ id, order, text, children, style }: Props) {
  return (
    <CopilotStep name={id} order={order} text={text}>
      <WalkthroughView style={style}>
        {children}
      </WalkthroughView>
    </CopilotStep>
  );
}
