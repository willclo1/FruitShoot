import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppSettings } from "./settings";
import { loadSettings, saveSettings } from "./settings";
import { tts } from "@/services/tts";

type SettingsContextValue = {
  settings: AppSettings;
  setSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  loaded: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, _setSettings] = useState<AppSettings>({
    ttsEnabled: false,
    ttsMode: "auto",
    ttsRate: 1.0,
    ttsPitch: 1.0,
    largeText: false,
    reduceMotion: false,
    largeTouchTargets: false,
    accessibleFont: false,
    splashMinDurationMs: 2200,
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      _setSettings(s);
      applyTtsSettings(s);
      setLoaded(true);
    })();
  }, []);

  const setSettings = (updater: (prev: AppSettings) => AppSettings) => {
    _setSettings((prev) => {
      const next = updater(prev);

      saveSettings(next);
      applyTtsSettings(next);

      return next;
    });
  };

  const value = useMemo(
    () => ({ settings, setSettings, loaded }),
    [settings, loaded]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function applyTtsSettings(s: AppSettings) {
  if (!s.ttsEnabled) {
    tts.setMode("off");
    tts.stop();
    return;
  }

  tts.setMode(s.ttsMode);
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function useFontStyle() {
  const { settings } = useSettings();

  const fontScale = settings.largeText ? 1.15 : 1.0;
  const accessibleFontBoost = settings.accessibleFont ? 1.08 : 1.0;
  const scale = fontScale * accessibleFontBoost;

  const fontRegular = settings.accessibleFont ? "Atkinson-Regular" : undefined;
  const fontBold = settings.accessibleFont ? "Atkinson-Bold" : undefined;

  return { scale, fontRegular, fontBold };
}

export function useTouchTarget() {
  const { settings } = useSettings();

  const large = settings.largeTouchTargets;

  return {
    minHeight: large ? 60 : 44,
    minWidth: large ? 60 : 44,
    paddingVertical: large ? 18 : 12,
    paddingHorizontal: large ? 24 : 16,
    borderRadius: large ? 16 : 12,
    iconSize: large ? 32 : 24,
    fontBoost: large ? 1.1 : 1.0,
  };
}