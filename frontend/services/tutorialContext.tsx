import React, { createContext, useContext, useEffect, useState } from "react";
import { getTutorialSeen, setTutorialSeen } from "@/services/tutorialStorage";
import { useCopilot } from "react-native-copilot";

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

  useEffect(() => {
    (async () => {
      const alreadySeen = await getTutorialSeen();
      setSeen(alreadySeen);
      setChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!checked || seen || !autoStartEnabled) return;

    // Small delay to let CopilotSteps mount before starting
    const timer = setTimeout(() => {
      start();
      setSeen(true);
      setTutorialSeen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [checked, seen, autoStartEnabled, start]);

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
