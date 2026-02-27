import * as SecureStore from "expo-secure-store";

export type AppSettings = {
  ttsEnabled: boolean;
  ttsMode: "off" | "onDemand" | "auto";
  ttsRate: number;
  ttsPitch: number;
  largeText: boolean;
  reduceMotion: boolean;
  largeTouchTargets: boolean;
  highContrast: boolean;
};

const KEY = "app_settings_v1";

const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: true,
  ttsMode: "onDemand",
  ttsRate: 1.0,
  ttsPitch: 1.0,
  largeText: false,
  reduceMotion: false,
  largeTouchTargets: false,
  highContrast: false,
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: AppSettings): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}