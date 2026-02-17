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
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { getMe, type Me } from "@/services/me";
import { setAuthed } from "@/services/authState";

type TabKey = "uploads" | "saved";

export default function ProfileScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("uploads");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = useMemo(() => {
    if (!me?.username) return "Insert Name Here";
    return me.username;
  }, [me?.username]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await getMe();
        if (mounted) setMe(data);
      } catch (e: any) {
        if (mounted) {
          // If token truly expired and refresh failed, apiFetch may throw.
          Alert.alert("Profile", e.message || "Could not load profile");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
        <Text style={styles.brandText}>FruitShoot</Text>
      </View>


      <View style={styles.profileHeaderRow}>
        <Text style={styles.profileTitle}>Profile</Text>
        <View style={styles.profileUnderline} />
      </View>


      <View style={styles.identityRow}>
        <View style={styles.avatarCircle}>
          <View style={styles.avatarInner} />
        </View>

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
            </>
          )}
        </View>
      </View>

  
      <View style={styles.tabsRow}>
        <Pressable onPress={() => setTab("uploads")} style={styles.tabButton}>
          <Text style={[styles.tabText, tab === "uploads" && styles.tabTextActive]}>
            My uploads
          </Text>
          {tab === "uploads" ? (
            <View style={styles.tabUnderline} />
          ) : (
            <View style={styles.tabUnderlineHidden} />
          )}
        </Pressable>

        <Pressable onPress={() => setTab("saved")} style={styles.tabButton}>
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

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>
          {tab === "uploads" ? "Uploads/Recipes" : "Saved Recipes"}
        </Text>

        <View style={styles.bigCardBody}>
          <Text style={styles.placeholderText}>
            {tab === "uploads"
              ? "Your recent uploads will show here."
              : "Your saved recipes will show here."}
          </Text>
        </View>
      </View>

      <View style={styles.sectionDivider} />
      <Text style={styles.sectionTitle}>Accessibility</Text>
      <View style={styles.sectionDividerTight} />


      <Pressable onPress={onLogout} style={styles.logoutRow}>
        <Text style={styles.logoutArrow}>→</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>
);
}

/**
 * Brand palette (from your doc):  [oai_citation:1‡FruitShoot Brand Color Scheme.docx](sediment://file_000000007a8c71fd8fb1a2a619532e7a)
 */
const CAMERA_GREEN = "#1F4C47";
const APPLE_RED = "#E94B3C";
const LEAF_GREEN = "#7BC96F";
const LENS_DARK = "#0E1D1B";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

const PAGE_PAD = 16;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CREAM,
  },

  // ⭐ Main page padding (prevents edge clipping)
  page: {
    paddingHorizontal: PAGE_PAD,
    paddingTop: 6,
    paddingBottom: 28,
  },

  brandHeader: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  brandLogo: {
    width: 70,
    height: 70,
  },
  brandText: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "800",
    color: CAMERA_GREEN,
  },

  profileHeaderRow: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: CAMERA_GREEN,
  },
  profileUnderline: {
    height: 2,
    width: 88,
    backgroundColor: CAMERA_GREEN,
    marginTop: 4,
    borderRadius: 2,
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 14,
  },

  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: LEAF_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CREAM,
    opacity: 0.95,
  },

  identityTextCol: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: "900",
    color: CAMERA_GREEN,
  },
  emailText: {
    marginTop: 2,
    fontSize: 13,
    color: LENS_DARK,
    opacity: 0.65,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: LENS_DARK,
    opacity: 0.65,
    fontWeight: "600",
  },

  // ⭐ Tabs row — full-width divider without clipping
  tabsRow: {
    flexDirection: "row",
    gap: 26,
    marginTop: 18,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: COOL_GRAY,

    marginHorizontal: -PAGE_PAD,
    paddingHorizontal: PAGE_PAD,
  },

  tabButton: {
    paddingBottom: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "800",
    color: LENS_DARK,
    opacity: 0.7,
  },
  tabTextActive: {
    opacity: 1,
    color: LENS_DARK,
  },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    backgroundColor: CAMERA_GREEN,
    borderRadius: 2,
  },
  tabUnderlineHidden: {
    marginTop: 6,
    height: 3,
    backgroundColor: "transparent",
  },

  // ⭐ Big content card — stays safely inside edges
  bigCard: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: CAMERA_GREEN,
    padding: 18,
    minHeight: 180,
    overflow: "hidden",
  },
  bigCardTitle: {
    color: CREAM,
    fontWeight: "900",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  bigCardBody: {
    marginTop: 12,
    flex: 1,
    justifyContent: "center",
  },
  placeholderText: {
    color: CREAM,
    opacity: 0.9,
    fontWeight: "600",
  },

  // ⭐ Section dividers full width (no clipping)
  sectionDivider: {
    marginTop: 22,
    height: 2,
    backgroundColor: COOL_GRAY,
    marginHorizontal: -PAGE_PAD,
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: LENS_DARK,
    opacity: 0.8,
  },
  sectionDividerTight: {
    marginTop: 8,
    height: 2,
    backgroundColor: COOL_GRAY,
    marginHorizontal: -PAGE_PAD,
  },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  logoutArrow: {
    color: APPLE_RED,
    fontSize: 16,
    fontWeight: "900",
  },
  logoutText: {
    color: APPLE_RED,
    fontSize: 14,
    fontWeight: "900",
  },
});