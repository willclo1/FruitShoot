import React, { createContext, useContext, useEffect, useState } from "react";
import {
  consumeQueuedTutorialForUser,
  getCurrentUserId,
  getTutorialSeen,
  setTutorialSeen,
} from "@/services/tutorialStorage";
import { useCopilot } from "react-native-copilot";
import * as SecureStore from "expo-secure-store";
import { subscribeAuthed } from "@/services/authState";

type TutorialContextValue = {
  /** Start (or restart) the copilot walkthrough */
  startTutorial: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

/**
 * TutorialProvider handles first-run auto-start and exposes startTutorial().
 * The actual step rendering is handled by CopilotProvider (in _layout.tsx).
 */
export function TutorialProvider({
  children,
  autoStartEnabled,
}: {
  children: React.ReactNode;
  autoStartEnabled: boolean;
}) {
  const { start } = useCopilot();
  const [checked, setChecked] = useState(false);
  const [seen, setSeen] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeAuthed(() => {
      setAuthTick((v) => v + 1);
    });
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        setActiveUserId(null);
        setSeen(true);
        setChecked(true);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        setActiveUserId(null);
        setSeen(true);
        setChecked(true);
        return;
      }

      const [alreadySeen, queuedForAutoStart] = await Promise.all([
        getTutorialSeen(userId),
        consumeQueuedTutorialForUser(userId),
      ]);

      setActiveUserId(userId);
      setSeen(alreadySeen && !queuedForAutoStart);
      setChecked(true);
    })();
  }, [authTick]);

  useEffect(() => {
    if (!checked || seen || !autoStartEnabled || !activeUserId) return;

    // Small delay to let CopilotSteps mount before starting
    const timer = setTimeout(() => {
      start();
      setSeen(true);
      setTutorialSeen(activeUserId, true);
    }, 600);

    return () => clearTimeout(timer);
  }, [checked, seen, autoStartEnabled, start, activeUserId]);

  const startTutorial = () => {
    start();
  };

  return (
    <TutorialContext.Provider value={{ startTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
