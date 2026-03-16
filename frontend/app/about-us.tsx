import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { tts } from "@/services/tts";
import { useSettings, useFontStyle, useTouchTarget } from "@/services/settingsContext";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  major: string;
  bio?: string;
  avatarLocal?: any;
  avatarUri?: string;
};

const TEAM: TeamMember[] = [
  {
    id: "1",
    name: "Taylor Allen",
    role: "Team Lead",
    major: "Data Science",
    bio: "Coordinates team meetings, develops identification model",
  },
  {
    id: "2",
    name: "Will Clore",
    role: "Backend Developer",
    major: "Computer Science",
    bio: "Implements model integration and accessibility features",
  },
  {
    id: "3",
    name: "John Lubisich",
    role: "Model Developer",
    major: "Data Science",
    bio: "Develops identification model",
  },
  {
    id: "4",
    name: "Karina Garza",
    role: "Frontend Developer",
    major: "Computer Science",
    bio: "Develops frontend pages and styling",
  },
  {
    id: "5",
    name: "William Waweru",
    role: "Backend Developer",
    major: "Computer Science",
    bio: "Manages database, develops recipe features",
  },
  { 
    id: "6",
    name: "Chris Thompson",
    role: "Backend Developer",
    major: "Computer Science",
    bio: "Provides support across tasks",
  },
];

export default function AboutUsScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const showReplay = loaded && settings.ttsEnabled;

  useEffect(() => {
    if (!loaded) return;
    tts.autoSay(
      "About screen."
    );
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]);

  const onOpenLink = async (url: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        tts.say("Opening link.");
        await Linking.openURL(url);
      } else {
        tts.say("Cannot open the link.");
      }
    } catch {
      tts.say("Cannot open the link.");
    }
  };

  const onEmail = (email: string) => {
    const url = `mailto:${email}`;
    onOpenLink(url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
                      onPress={() => router.back()}
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                      style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Ionicons name="chevron-back" size={22} color={BORDER} />
                      <Text style={[styles.backText, { fontFamily: fontBold, fontSize: 16 * scale }]}>
                        Back
                      </Text>
            </Pressable>
        <View style={styles.brandHeader}>
          <Image source={require("../assets/images/FruitShoot Logo.png")} style={styles.brandLogo} resizeMode="contain" />
        </View>
        <View style={styles.headerRow}>
            <Text style={[styles.title, { fontFamily: fontBold, fontSize: 22 * finalScale }]}>
              About Fruitshoot
            </Text>

            {showReplay && (
              <Pressable
                style={[styles.replayButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
                onPress={() =>
                  tts.say("About screen.")
                }
                accessibilityRole="button"
                accessibilityLabel="Replay voice guidance"
              >
                <Text style={[styles.replayText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>
                  Replay
                </Text>
              </Pressable>
            )}
          <View style={styles.headerUnderline} />
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
            Our Mission
          </Text>
          <View style={styles.cardBody}>
            <Text style={[styles.bodyText, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>
              Fruitshoot aims to help reduce wasted produce by helping people identify when fruit is good to eat, and provide recipes that make the best use of their produce.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
            What We Do
          </Text>
          <View style={styles.cardBody}>
            <Text style={[styles.bodyText, { fontFamily: fontRegular, fontSize: 14 * finalScale }]}>
              • Help identify fruit ripeness.{"\n"}
              • Connect users with recipes for the fruit they have.{"\n"}
              • Make cooking more accessible for the visually impaired.{"\n"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>
            Meet the Team
          </Text>
          <View style={[styles.cardBody, { gap: 12 }]}>
            {TEAM.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  {m.avatarLocal ? (
                    <Image source={m.avatarLocal} style={styles.memberAvatarImg} />
                  ) : m.avatarUri ? (
                    <Image source={{ uri: m.avatarUri }} style={styles.memberAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={20 * tt.iconSize / 24} color={CREAM} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>
                    {m.name}
                  </Text>
                  <Text style={[styles.memberRole, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}>
                    {m.role}
                  </Text>
                  {!!m.bio && (
                    <Text style={[styles.memberBio, { fontFamily: fontRegular, fontSize: 12 * finalScale }]}>
                      {m.bio}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CAMERA_GREEN = "#1F4C47";
const APPLE_RED = "#E94B3C";
const LEAF_GREEN = "#7BC96F";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";
const BORDER = "1F4A44";
const PAGE_PAD = 22;


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: PAGE_PAD, paddingTop: 20, paddingBottom: 110 },

  brandHeader: { alignItems: "center" },
  brandLogo: { width: 140, height: 140, marginBottom: 6 },

  headerRow: { alignSelf: "stretch", marginTop: 6, marginBottom: 12 },
  title: { fontWeight: "900", color: CAMERA_GREEN },
  headerUnderline: {
    height: 2,
    width: 140,
    backgroundColor: CAMERA_GREEN,
    marginTop: 4,
  },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  replayText: { color: "#fff", fontWeight: "700" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 60,
    paddingVertical: 6,
  },
  backText: { color: BORDER, fontWeight: "600" },

  card: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: COOL_GRAY,
    padding: 16,
  },
  cardTitle: { color: CAMERA_GREEN, fontWeight: "900" },
  cardBody: { marginTop: 10 },

  bodyText: { color: "#222", lineHeight: 20, opacity: 0.9 },
  boldInk: { fontWeight: "900", color: CAMERA_GREEN },

  sectionRow: {
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontWeight: "900", opacity: 0.8 },
  sectionDividerTight: { height: 2, backgroundColor: COOL_GRAY },

  linkRow: {
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkRowPressed: { opacity: 0.75 },
  linkText: { color: CAMERA_GREEN },
  linkArrow: { fontWeight: "900", color: CAMERA_GREEN },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COOL_GRAY,
    borderRadius: 12,
    padding: 10,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LEAF_GREEN,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImg: { width: "100%", height: "100%" },
  memberName: { color: CAMERA_GREEN, fontWeight: "900" },
  memberRole: { opacity: 0.8, marginTop: 2 },
  memberBio: { opacity: 0.7, marginTop: 4 },
  memberActions: { flexDirection: "row", gap: 8, marginLeft: 8 },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COOL_GRAY,
    backgroundColor: "#fff",
  },
  iconPressed: { opacity: 0.7 },
});
