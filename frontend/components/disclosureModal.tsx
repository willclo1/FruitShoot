import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  BackHandler,
} from "react-native";
import { useFontStyle } from "@/services/settingsContext";

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export default function DisclosureModal({ visible, onAccept, onDecline }: Props) {
  const { scale, fontRegular, fontBold } = useFontStyle();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={[styles.title, { fontFamily: fontBold, fontSize: 18 * scale }]}>
            Before You Continue
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.body, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
              FruitShoot uses a trained image recognition model to analyze photos of fruit and estimate ripeness and usability. When you take or upload a photo, the image is sent to our system for processing so the model can evaluate it and generate a prediction. By using this feature, you acknowledge and consent to your photo being used for identification purposes.
            </Text>

            <Text style={[styles.body, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
              The model was trained on labeled fruit images and works by comparing patterns in your photo such as color, shape, and texture to what it learned during training. Based on those patterns, it provides an estimate and recommendations.
            </Text>

            <Text style={[styles.body, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
              Although we work to make the model as accurate as possible, it cannot guarantee one hundred percent correct results. Lighting conditions, camera quality, fruit variety, natural imperfections, and image angles may affect predictions. Because the model evaluates only visual features from a photo, it cannot detect internal spoilage, contamination, or harmful bacteria.
            </Text>

            <Text style={[styles.body, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
              FruitShoot is intended to provide guidance and informational support, not a guarantee of food safety. Always use your own judgment before consuming any food. If a fruit shows visible mold, an unusual smell, leaking fluids, or other clear signs of spoilage, it should be discarded even if the app indicates it may be safe.
            </Text>

            <Text style={[styles.body, { fontFamily: fontRegular, fontSize: 14 * scale }]}>
              By using this app, you understand that final decisions regarding food consumption are your responsibility. FruitShoot and its developers are not responsible for illness, allergic reactions, or other outcomes resulting from the consumption of food assessed by the app.
            </Text>
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.declineBtn, pressed && styles.pressed]}
              onPress={onDecline}
              accessibilityRole="button"
              accessibilityLabel="Decline"
              accessibilityHint="Closes the app"
            >
              <Text style={[styles.declineText, { fontFamily: fontBold, fontSize: 15 * scale }]}>
                Decline
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]}
              onPress={onAccept}
              accessibilityRole="button"
              accessibilityLabel="Accept"
              accessibilityHint="Accepts the terms and continues to the app"
            >
              <Text style={[styles.acceptText, { fontFamily: fontBold, fontSize: 15 * scale }]}>
                Accept
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BRAND = "#1F4C47";
const BG = "#FAF7F2";
const BORDER = "#1F4A44";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  sheet: {
    backgroundColor: BG,
    borderRadius: 20,
    width: "100%",
    maxHeight: "80%",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  title: {
    color: BRAND,
    fontWeight: "900",
    marginBottom: 16,
    textAlign: "center",
  },

  scroll: { flexGrow: 0 },
  scrollContent: { gap: 12, paddingBottom: 4 },

  body: {
    color: "#2E2E2E",
    lineHeight: 22,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  declineBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: "transparent",
  },
  declineText: { color: BRAND, fontWeight: "800" },

  acceptBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: BRAND,
  },
  acceptText: { color: "white", fontWeight: "800" },

  pressed: { opacity: 0.85 },
});