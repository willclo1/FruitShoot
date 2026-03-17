import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { getMe, type Me } from "@/services/me";
import { setAuthed } from "@/services/authState";
import { tts } from "@/services/tts";
import {
  useSettings,
  useFontStyle,
  useTouchTarget,
} from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const APPLE_RED = "#E94B3C";
const LEAF_GREEN = "#7BC96F";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

function ActionTile({
  title,
  subtitle,
  onPress,
  fontBold,
  fontRegular,
  finalScale,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  fontBold: string;
  fontRegular: string;
  finalScale: number;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}>
      <Text
        style={[
          styles.actionTileTitle,
          { fontFamily: fontBold, fontSize: 15 * finalScale },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.actionTileText,
          { fontFamily: fontRegular, fontSize: 12 * finalScale },
        ]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

  const displayName = useMemo(() => me?.username || "Your Profile", [me?.username]);

  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay("Profile screen. Open your recipes, create a recipe, or import one.");
    }, [
      loaded,
      settings.ttsEnabled,
      settings.ttsMode,
      settings.ttsRate,
      settings.ttsPitch,
    ])
  );

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
        if (mounted) Alert.alert("Profile", e?.message || "Could not load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [API_BASE]);

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
        return;
      }

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

      Alert.alert("Success", "Profile picture updated.");
    } catch (e: any) {
      Alert.alert("Profile Photo", e?.message || "Could not upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Image
            source={require("../../assets/images/FruitShoot Logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text
              style={[
                styles.heroTitle,
                { fontFamily: fontBold, fontSize: 24 * finalScale },
              ]}
            >
              Profile
            </Text>

            {showReplay && (
              <Pressable
                style={[
                  styles.replayButton,
                  {
                    minHeight: tt.minHeight,
                    paddingHorizontal: tt.paddingHorizontal,
                    borderRadius: tt.borderRadius,
                  },
                ]}
                onPress={() => tts.say(`Profile screen. Logged in as ${displayName}.`)}
              >
                <Text
                  style={[
                    styles.replayText,
                    { fontFamily: fontBold, fontSize: 13 * finalScale },
                  ]}
                >
                  Replay
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.heroUnderline} />

          <View style={styles.identityRow}>
            <Pressable onPress={onPickProfilePhoto} style={({ pressed }) => [styles.avatarCircle, pressed && styles.pressed]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={tt.iconSize} color={CREAM} />
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
                  <Text
                    style={[
                      styles.loadingText,
                      { fontFamily: fontRegular, fontSize: 14 * finalScale },
                    ]}
                  >
                    Loading profile...
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.nameText,
                      { fontFamily: fontBold, fontSize: 20 * finalScale },
                    ]}
                  >
                    {displayName}
                  </Text>

                  {!!me?.email && (
                    <Text
                      style={[
                        styles.emailText,
                        { fontFamily: fontRegular, fontSize: 13 * finalScale },
                      ]}
                    >
                      {me.email}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.avatarHintText,
                      { fontFamily: fontRegular, fontSize: 12 * finalScale },
                    ]}
                  >
                    Tap your avatar to change your photo
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            style={[
              styles.cardTitle,
              { fontFamily: fontBold, fontSize: 16 * finalScale },
            ]}
          >
            Recipes
          </Text>

          <Text
            style={[
              styles.cardSubtitle,
              { fontFamily: fontRegular, fontSize: 12 * finalScale },
            ]}
          >
            Open your recipe library or jump straight into creating something new.
          </Text>

          <View style={styles.actionsGrid}>
            <ActionTile
              title="My Recipes"
              subtitle="Browse your uploaded recipes"
              onPress={() => router.push("/recipes?tab=uploads")}
              fontBold={fontBold}
              fontRegular={fontRegular}
              finalScale={finalScale}
            />
            <ActionTile
              title="Saved Recipes"
              subtitle="Browse saved recipes"
              onPress={() => router.push("/recipes?tab=saved")}
              fontBold={fontBold}
              fontRegular={fontRegular}
              finalScale={finalScale}
            />
          </View>

          <View style={styles.actionsGrid}>
            <ActionTile
              title="Create Recipe"
              subtitle="Write one from scratch"
              onPress={() => router.push("/create-recipe")}
              fontBold={fontBold}
              fontRegular={fontRegular}
              finalScale={finalScale}
            />
            <ActionTile
              title="Import Recipe"
              subtitle="Paste a URL and review it"
              onPress={() => router.push("/upload-recipe")}
              fontBold={fontBold}
              fontRegular={fontRegular}
              finalScale={finalScale}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text
            style={[
              styles.cardTitle,
              { fontFamily: fontBold, fontSize: 16 * finalScale },
            ]}
          >
            More
          </Text>

          <Pressable onPress={() => router.push("/about-us")} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
            <Text
              style={[
                styles.linkLabel,
                { fontFamily: fontBold, fontSize: 15 * finalScale },
              ]}
            >
              About FruitShoot
            </Text>
            <Text style={[styles.linkArrow, { fontSize: 18 * finalScale }]}>→</Text>
          </Pressable>
        </View>

        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
          <Text
            style={[
              styles.logoutText,
              { fontFamily: fontBold, fontSize: 16 * finalScale },
            ]}
          >
            Logout
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  brandHeader: { alignItems: "center" },
  brandLogo: { width: 120, height: 120, marginBottom: 4 },

  heroCard: {
    borderRadius: 24,
    backgroundColor: "#FFFDF9",
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroTitle: { fontWeight: "900", color: CAMERA_GREEN, flexShrink: 1 },
  heroUnderline: {
    height: 3,
    width: 86,
    borderRadius: 999,
    backgroundColor: CAMERA_GREEN,
    marginTop: 8,
    marginBottom: 16,
  },

  replayButton: { backgroundColor: "#2F3D39", paddingVertical: 8, justifyContent: "center", alignItems: "center" },
  replayText: { color: "#fff", fontWeight: "800" },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: LEAF_GREEN,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarLoadingOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  identityTextCol: { flex: 1 },
  nameText: { color: TEXT_DARK, fontWeight: "900" },
  emailText: { marginTop: 2, color: MUTED },
  avatarHintText: { marginTop: 6, color: MUTED, lineHeight: 18 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: MUTED },

  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  cardTitle: { color: TEXT_DARK, fontWeight: "900" },
  cardSubtitle: { marginTop: 4, color: MUTED, lineHeight: 18 },

  actionsGrid: { flexDirection: "row", gap: 12, marginTop: 14 },
  actionTile: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F7F8F4",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    padding: 14,
    minHeight: 108,
    justifyContent: "space-between",
  },
  actionTileTitle: { color: CAMERA_GREEN, fontWeight: "900" },
  actionTileText: { marginTop: 8, color: MUTED, lineHeight: 18 },

  linkRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  linkLabel: { color: TEXT_DARK, fontWeight: "800" },
  linkArrow: { color: CAMERA_GREEN, fontWeight: "900" },

  logoutButton: {
    borderRadius: 16,
    backgroundColor: "#FFF1EE",
    borderWidth: 1,
    borderColor: "rgba(233,75,60,0.18)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  logoutText: { color: APPLE_RED, fontWeight: "900" },
  pressed: { opacity: 0.86 },
});