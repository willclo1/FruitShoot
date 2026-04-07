import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { tts } from "@/services/tts";
import {
  useSettings,
  useFontStyle,
  useTouchTarget,
} from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#17302C";
const MUTED = "rgba(23,48,44,0.62)";

type UserImageItem = {
  id: number;
  filename: string;
  url: string;
  uploaded_at: string;
};

function formatFriendlyTitle(index: number) {
  return `Fruit Scan ${index + 1}`;
}

function formatFriendlyDate(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown date";

  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MyImagesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [images, setImages] = useState<UserImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UserImageItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "";

  const fetchImages = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await SecureStore.getItemAsync("access_token");
      if (!token || !API_BASE) {
        throw new Error("Missing auth or API config.");
      }

      const res = await fetch(`${API_BASE}/images`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        setImages([]);
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not load images");
      }

      const data = await res.json();
      setImages(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert("My Images", e?.message || "Could not load images.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_BASE]);

  useFocusEffect(
    React.useCallback(() => {
      tts.autoSay("My images screen. Browse your uploaded fruit images.");
      fetchImages();
    }, [
      loaded,
      settings.ttsEnabled,
      settings.ttsMode,
      settings.ttsRate,
      settings.ttsPitch,
      fetchImages,
    ])
  );

  const showReplay = loaded && settings.ttsEnabled;

  const imageCountText = useMemo(() => {
    if (loading) return "Loading...";
    if (!images.length) return "No images yet";
    return `${images.length} image${images.length === 1 ? "" : "s"}`;
  }, [images.length, loading]);

  const numColumns = 2;
  const horizontalPagePadding = 20 * 2;
  const cardContainerPadding = 16 * 2;
  const columnGap = 12;
  const availableWidth =
    width - horizontalPagePadding - cardContainerPadding - columnGap;
  const cardSize = availableWidth / numColumns;

  const selectedIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return images.findIndex((x) => x.id === selectedImage.id);
  }, [selectedImage, images]);

  const renderHeader = () => (
    <>
      <View style={styles.heroCard}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.backButtonText,
                { fontFamily: fontBold, fontSize: 15 * finalScale },
              ]}
            >
              ← Back
            </Text>
          </Pressable>

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
              onPress={() => tts.say("My images screen.")}
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

        <Text
          style={[
            styles.heroTitle,
            { fontFamily: fontBold, fontSize: 24 * finalScale },
          ]}
        >
          My Images
        </Text>

        <View style={styles.heroUnderline} />

        <Text
          style={[
            styles.heroSubtitle,
            { fontFamily: fontRegular, fontSize: 13 * finalScale },
          ]}
        >
          Browse your fruit scans. Tap any image to view it larger.
        </Text>

        <Text
          style={[
            styles.countText,
            { fontFamily: fontBold, fontSize: 14 * finalScale },
          ]}
        >
          {imageCountText}
        </Text>
      </View>

      <View style={styles.card}>
        {!loading && images.length > 0 && (
          <Text
            style={[
              styles.galleryIntro,
              { fontFamily: fontRegular, fontSize: 13 * finalScale },
            ]}
          >
            Showing your most recent uploads first.
          </Text>
        )}

        {!loading && images.length === 0 && (
          <View style={styles.centerState}>
            <Text
              style={[
                styles.emptyTitle,
                { fontFamily: fontBold, fontSize: 18 * finalScale },
              ]}
            >
              No images yet
            </Text>
            <Text
              style={[
                styles.stateText,
                { fontFamily: fontRegular, fontSize: 14 * finalScale },
              ]}
            >
              Once you scan or upload fruit images, they will appear here.
            </Text>
          </View>
        )}
      </View>
    </>
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: UserImageItem;
    index: number;
  }) => {
    const fullUrl = item.url.startsWith("http")
      ? item.url
      : `${API_BASE}${item.url}`;

    return (
      <Pressable
        onPress={() => setSelectedImage(item)}
        style={({ pressed }) => [
          styles.imageCard,
          {
            width: cardSize,
            marginBottom: 12,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Image
          source={{ uri: fullUrl }}
          style={[
            styles.imageThumb,
            {
              width: cardSize,
              height: cardSize * 1.08,
            },
          ]}
          resizeMode="cover"
        />

        <View style={styles.imageMeta}>
          <Text
            numberOfLines={1}
            style={[
              styles.imageTitle,
              { fontFamily: fontBold, fontSize: 13 * finalScale },
            ]}
          >
            {formatFriendlyTitle(index)}
          </Text>

          <Text
            numberOfLines={2}
            style={[
              styles.imageDate,
              { fontFamily: fontRegular, fontSize: 11.5 * finalScale },
            ]}
          >
            {formatFriendlyDate(item.uploaded_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator />
          <Text
            style={[
              styles.stateText,
              { fontFamily: fontRegular, fontSize: 14 * finalScale, marginTop: 12 },
            ]}
          >
            Loading your images...
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={images.length ? styles.columnWrapper : undefined}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => fetchImages(true)}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews
        />
      )}

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPress}
            onPress={() => setSelectedImage(null)}
          />

          {selectedImage && (
            <View style={[styles.modalCard, { maxHeight: height * 0.86 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { fontFamily: fontBold, fontSize: 18 * finalScale },
                    ]}
                    numberOfLines={1}
                  >
                    {formatFriendlyTitle(selectedIndex >= 0 ? selectedIndex : 0)}
                  </Text>

                  <Text
                    style={[
                      styles.modalDate,
                      { fontFamily: fontRegular, fontSize: 13 * finalScale },
                    ]}
                  >
                    {formatFriendlyDate(selectedImage.uploaded_at)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedImage(null)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.closeButtonText,
                      { fontFamily: fontBold, fontSize: 16 * finalScale },
                    ]}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

             <Image
                source={{
                    uri: selectedImage.url.startsWith("http")
                    ? selectedImage.url
                    : `${API_BASE}${selectedImage.url}`,
                }}
                style={[
                    styles.modalImage,
                    {
                    height: Math.min(height * 0.7, width * 1.1),
                    },
                ]}
                resizeMode="contain"
                />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },

  page: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  heroCard: {
    borderRadius: 24,
    backgroundColor: "#FFFDF9",
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
  replayButton: {
    backgroundColor: "#2F3D39",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  replayText: {
    color: "#fff",
    fontWeight: "800",
  },
  heroTitle: {
    marginTop: 14,
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
  heroUnderline: {
    height: 3,
    width: 104,
    borderRadius: 999,
    backgroundColor: CAMERA_GREEN,
    marginTop: 8,
    marginBottom: 14,
  },
  heroSubtitle: {
    color: MUTED,
    lineHeight: 18,
  },
  countText: {
    marginTop: 12,
    color: TEXT_DARK,
    fontWeight: "900",
  },

  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    marginBottom: 16,
  },

  galleryIntro: {
    color: MUTED,
    lineHeight: 18,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  emptyTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  stateText: {
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },

  columnWrapper: {
    justifyContent: "space-between",
  },
  imageCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F7F8F4",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
  },
  imageThumb: {
    backgroundColor: "#EDEAE4",
  },
  imageMeta: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  imageTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  imageDate: {
    marginTop: 4,
    color: MUTED,
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    padding: 18,
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31,76,71,0.08)",
  },
  modalTitle: {
    color: TEXT_DARK,
    fontWeight: "900",
  },
  modalDate: {
    color: MUTED,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2EE",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: CAMERA_GREEN,
    fontWeight: "900",
  },
 modalImage: {
  width: "100%",
  backgroundColor: "#F4F1EB",
},

  pressed: {
    opacity: 0.86,
  },
});