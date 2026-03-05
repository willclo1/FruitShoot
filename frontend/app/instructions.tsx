import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function InstructionsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar with Back */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={22} color={BORDER} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.topTitle} accessibilityRole="header">
          Instructions
        </Text>

        {/* Filler to center the title visually */}
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={{ width: "100%", maxWidth: 360 }}>
            <AccordionItem title="Uploading Fruit" initiallyExpanded>
              <UploadingFruitImage />
            </AccordionItem>

            <View style={{ height: 12 }} />

            <AccordionItem title="Uploading a Recipe">
              <UploadingRecipe />
            </AccordionItem>

            <View style={{ height: 12 }} />

            <AccordionItem title="Edit Profile Picture">
              <EditProfilePicture />
            </AccordionItem>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


function AccordionItem({
  title,
  children,
  initiallyExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [measured, setMeasured] = useState(false);
  const contentHeightRef = useRef(0);

  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  useEffect(() => {
    const toH = expanded ? contentHeightRef.current : 0;
    const toR = expanded ? 1 : 0;

    Animated.timing(heightAnim, {
      toValue: toH,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.timing(rotateAnim, {
      toValue: toR,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, heightAnim, rotateAnim]);

  const onMeasure = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h > 0) {
      contentHeightRef.current = h;
      setMeasured(true);
      if (expanded) heightAnim.setValue(h);
    }
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const toggle = () => {
    setExpanded((prev) => !prev);
    AccessibilityInfo.announceForAccessibility?.(
      !expanded ? `${title} expanded` : `${title} collapsed`
    );
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.95 }]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color="#1F4A44" />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.collapsible,
          {
            height: measured ? heightAnim : undefined,
            overflow: "hidden",
          },
        ]}
      >
        {}
        <View
          onLayout={!measured ? onMeasure : undefined}
          style={[styles.inner, !measured && styles.measureGhost]}
        >
          {children}
        </View>

        {}
        {measured && <View style={styles.inner}>{children}</View>}
      </Animated.View>
    </View>
  );
}

function UploadingFruitImage() {
  return (
    <View>
      <P>1. From the home screen, select Upload Picture</P>
      <P>2. To upload an existing picture, select Library</P>
      <P>  • Select the image you want to submit from your phones library </P>
      <P>3. To take a new picture, select Camera</P>
      <P>  • Use your phones camera to take a picture. </P>
      <P>4. Add relevant information to the description box</P>
      <P>5. Tap Upload, and the app will give your results. </P>
    </View>
  );
}

function UploadingRecipe() {
  return (
    <View>
      <P>1. From the home screen, select the Profile tab</P>
      <P>2. Select Upload Recipe</P>
      <P>3. Enter a title for your recipe </P>
      <P>4. In the ingredients box, enter each ingredient on its own line</P>
      <P>5. In the steps section, enter each step on its own line</P>
      <P>6. When you are finished entering your recipe, tap Submit.</P>
    </View>
  );
}

function EditProfilePicture() {
  return (
    <View>
      <P>1. From the home screen, select the Profile tab</P>
      <P>2. Tap on your current profile picture to open your photo library</P>
      <P>3. Select the photo you would like to use, then tap choose </P>
    </View>
  );
}

function SectionTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}
function P({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[styles.p, style]}>{children}</Text>;
}

const BRAND = "#193F3A";
const BG = "#F6F3EE";
const INPUT_BG = "#D7D7D7";
const BORDER = "#1F4A44";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 60, 
    paddingVertical: 6,
  },
  backText: {
    color: BORDER,
    fontSize: 16,
    fontWeight: "600",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  card: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 2,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "transparent",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    color: "#111",
    textDecorationLine: "underline",
  },

  collapsible: {
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: BORDER,
  },

  inner: {
    paddingTop: 12,
  },

  measureGhost: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },

  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#111",
    textDecorationLine: "none",
    marginTop: 14,
  },

  p: {
    fontSize: 15,
    lineHeight: 22,
    color: "#111",
    marginTop: 6,
  },
});