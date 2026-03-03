import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { getMe, type Me } from "@/services/me";
import { setAuthed } from "@/services/authState";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";

type TabKey = "uploads" | "saved";

export default function ProfileScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();

  const [tab, setTab] = useState<TabKey>("uploads");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

  const displayName = useMemo(() => {
    if (!me?.username) return "Insert Name Here";
    return me.username;
  }, [me?.username]);

  // Auto-announce screen on focus
  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay("Profile screen. View your uploads and saved recipes.");
    }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch])
  );

  // Load profile + avatar on screen open
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const data = await getMe();
        if (!mounted) return;

        setMe(data);

        const token = await SecureStore.getItemAsync("access_token");

        if (token && API_BASE) {
          const res = await fetch(`${API_BASE}/me/avatar/url`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const avatar = await res.json();
            if (avatar?.url) setAvatarUri(`${API_BASE}${avatar.url}`);
          }
        }
      } catch (e: any) {
        if (mounted) Alert.alert("Profile", e.message || "Could not load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onTabChange = (next: TabKey) => {
    setTab(next);
    tts.say(next === "uploads" ? "My uploads." : "Saved recipes.");
  };

  const onLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          setAuthed(false);
          router.replace("/login");
        },
      },
    ]);
  };

  const onPickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        tts.say("Permission needed. Please allow photo library access.");
        return;
      }

      tts.say("Opening photo library.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setAvatarUri(asset.uri);
      setUploadingAvatar(true);
      tts.say("Uploading profile photo. Please wait.");

      const token = await SecureStore.getItemAsync("access_token");
      if (!token || !API_BASE) {
        Alert.alert("Error", "Missing auth or API config.");
        return;
      }

      const userId = me?.id;
      if (!userId) {
        Alert.alert("Profile Photo", "Missing user id.");
        return;
      }

      const form = new FormData();
      form.append("user_id", String(userId));
      form.append("description", "");
      form.append(
        "file",
        {
          uri: asset.uri,
          name: asset.fileName || `avatar-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        } as any
      );

      const res = await fetch(`${API_BASE}/user/profile/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const data = await res.json();
      if (data?.url) setAvatarUri(`${API_BASE}${data.url}?cb=${Date.now()}`);

      tts.say("Profile picture updated.");
      Alert.alert("Success", "Profile picture updated.");
    } catch (e: any) {
      tts.say("Could not upload profile picture.");
      Alert.alert("Profile Photo", e?.message || "Could not upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandHeader}>
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.profileHeaderRow}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.profileTitle}>Profile</Text>
            {showReplay && (
              <Pressable
                style={styles.replayButton}
                onPress={() =>
                  tts.say(
                    `Profile screen. Logged in as ${displayName}. Tap avatar to change your photo.`
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Replay voice guidance"
                accessibilityHint="Repeats the profile screen instructions"
              >
                <Text style={styles.replayText}>Replay</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.profileUnderline} />
        </View>

        <View style={styles.identityRow}>
          <Pressable
            onPress={onPickProfilePhoto}
            style={({ pressed }) => [styles.avatarCircle, pressed && styles.avatarPressed]}
            accessibilityRole="button"
            accessibilityLabel="Profile photo"
            accessibilityHint="Tap to change your profile picture"
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={38} color={CREAM} />
            )}

            {uploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>

          <View style={styles.identityTextCol}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading profile…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.nameText}>{displayName}</Text>
                <Text style={styles.emailText}>{me?.email || ""}</Text>
                <Text style={styles.avatarHintText}>Tap avatar to change photo</Text>
              </>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => onTabChange("uploads")}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityLabel="My uploads"
            accessibilityState={{ selected: tab === "uploads" }}
          >
            <Text style={[styles.tabText, tab === "uploads" && styles.tabTextActive]}>
              My uploads
            </Text>
            {tab === "uploads" ? (
              <View style={styles.tabUnderline} />
            ) : (
              <View style={styles.tabUnderlineHidden} />
            )}
          </Pressable>

          <Pressable
            onPress={() => onTabChange("saved")}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityLabel="Saved recipes"
            accessibilityState={{ selected: tab === "saved" }}
          >
            <Text style={[styles.tabText, tab === "saved" && styles.tabTextActive]}>
              Saved Recipes
            </Text>
            {tab === "saved" ? (
              <View style={styles.tabUnderline} />
            ) : (
              <View style={styles.tabUnderlineHidden} />
            )}
          </Pressable>
        </View>

        {/* Content card */}
        <View style={styles.bigCard}>
          <Text style={styles.bigCardTitle}>
            {tab === "uploads" ? "Uploads/Recipes" : "Saved Recipes"}
          </Text>

          <View style={styles.bigCardBody}>
            <Text style={styles.placeholderText}>
              {tab === "uploads"
                ? "Your recent uploads will show here (coming soon)."
                : "Your saved recipes will show here (coming soon)."}
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <Pressable
          onPress={() => {
            tts.say("Upload Recipe.");
            router.push("/upload-recipe");
          }}
          style={({ pressed }) => [styles.sectionRow, pressed && styles.linkRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Upload Recipe"
          accessibilityHint="Navigate to the upload recipe screen"
        >
          <Text style={styles.sectionTitle}>Upload Recipe</Text>
          <Text style={styles.linkArrow}>→</Text>
        </Pressable>

        <View style={styles.sectionDivider} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <View />
        </View>

        <View style={styles.sectionDividerTight} />

        <Pressable
          onPress={onLogout}
          style={styles.logoutRow}
          accessibilityRole="button"
          accessibilityLabel="Logout"
          accessibilityHint="Signs you out of your account"
        >
          <Text style={styles.logoutArrow}>→</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const CAMERA_GREEN = "#1F4C47";
const APPLE_RED = "#E94B3C";
const LEAF_GREEN = "#7BC96F";
const LENS_DARK = "#0E1D1B";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

const PAGE_PAD = 22;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: PAGE_PAD, paddingTop: 20, paddingBottom: 110 },

  brandHeader: { alignItems: "center" },
  brandLogo: { width: 140, height: 140, marginBottom: 6 },

  profileHeaderRow: { alignSelf: "stretch", marginTop: 6, marginBottom: 12 },
  profileTitle: { fontSize: 22, fontWeight: "900", color: CAMERA_GREEN },
  profileUnderline: { height: 2, width: 88, backgroundColor: CAMERA_GREEN, marginTop: 4 },

  replayButton: {
    backgroundColor: "#3B3B3B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  replayText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },

  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: LEAF_GREEN,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPressed: { opacity: 0.9 },
  avatarImage: { width: "100%", height: "100%", borderRadius: 38 },

  avatarLoadingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  identityTextCol: { flex: 1 },
  nameText: { fontSize: 20, fontWeight: "900", color: CAMERA_GREEN },
  emailText: { marginTop: 2, fontSize: 13, color: LENS_DARK, opacity: 0.65 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: LENS_DARK, opacity: 0.65, fontWeight: "600" },

  tabsRow: {
    flexDirection: "row",
    gap: 26,
    marginTop: 18,
    borderBottomWidth: 2,
    borderBottomColor: COOL_GRAY,
  },

  tabButton: { paddingBottom: 6 },
  tabText: { fontSize: 14, fontWeight: "800", opacity: 0.7 },
  tabTextActive: { opacity: 1 },

  tabUnderline: { marginTop: 6, height: 3, backgroundColor: CAMERA_GREEN },
  tabUnderlineHidden: { marginTop: 6, height: 3, backgroundColor: "transparent" },

  bigCard: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: COOL_GRAY,
    padding: 16,
    minHeight: 180,
  },
  bigCardTitle: { color: CAMERA_GREEN, fontWeight: "900", fontSize: 16 },
  bigCardBody: { marginTop: 12 },

  placeholderText: { color: LENS_DARK, opacity: 0.5, fontWeight: "600", fontSize: 14 },

  sectionDivider: { height: 2, backgroundColor: COOL_GRAY },
  sectionDividerTight: { height: 2, backgroundColor: COOL_GRAY },

  sectionRow: {
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", opacity: 0.8 },

  linkRowPressed: { opacity: 0.75 },
  linkArrow: { fontSize: 18, fontWeight: "900" },

  logoutRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  logoutArrow: { color: APPLE_RED, fontWeight: "900" },
  logoutText: { color: APPLE_RED, fontWeight: "900" },

  avatarHintText: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "600",
  },
});