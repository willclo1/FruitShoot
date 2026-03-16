import * as SecureStore from "expo-secure-store";

export type TtsMode = "onDemand" | "auto";

export type AppSettings = {
  ttsEnabled: boolean;
  ttsMode: TtsMode;

  ttsRate: number;
  ttsPitch: number;

  largeText: boolean;
  reduceMotion: boolean;
  largeTouchTargets: boolean;
  accessibleFont: boolean;
};

const KEY = "app_settings_v1";

const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: false,
  ttsMode: "auto",
  ttsRate: 1.0,
  ttsPitch: 1.0,
  largeText: false,
  reduceMotion: false,
  largeTouchTargets: false,
  accessibleFont: false,
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    const coercedMode =
      parsed.ttsMode === "auto" || parsed.ttsMode === "onDemand"
        ? parsed.ttsMode
        : DEFAULT_SETTINGS.ttsMode;

    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      ttsMode: coercedMode,
    };

    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: AppSettings): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}