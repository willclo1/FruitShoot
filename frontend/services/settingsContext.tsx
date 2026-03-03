// settingsContext.tsx
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
  // Keep this initial state aligned with DEFAULT_SETTINGS
  const [settings, _setSettings] = useState<AppSettings>({
    ttsEnabled: false,
    ttsMode: "auto",
    ttsRate: 1.0,
    ttsPitch: 1.0,
    largeText: false,
    reduceMotion: false,
    largeTouchTargets: false,
    highContrast: false,
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

      // Persist + apply
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
  // Single source of truth: enabled determines OFF/ON
  if (!s.ttsEnabled) {
    tts.setMode("off");
    tts.stop();
    return;
  }

  // When enabled, mode is either "auto" or "onDemand"
  tts.setMode(s.ttsMode);
}


export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
