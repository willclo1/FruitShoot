import React, { createContext, useContext, useEffect, useState } from "react";
import { getTutorialSeen, setTutorialSeen } from "@/services/tutorialStorage";

export type TutorialTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TutorialContextValue = {
  visible: boolean;
  currentStepIndex: number;
  startTutorial: (fromStepIndex?: number) => void;
  closeTutorial: () => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
  setCurrentStepIndex: (index: number) => void;
  registerTarget: (id: string, rect: TutorialTargetRect) => void;
  unregisterTarget: (id: string) => void;
  getTargetRect: (id?: string) => TutorialTargetRect | null;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

/**
 * TutorialProvider controls first-run tutorial behavior and manual re-launch.
 *
 * First-time logic:
 * - Reads persisted tutorial flag from SecureStore.
 * - Auto-opens only if not seen before and autoStartEnabled is true.
 * - Marks tutorial as seen when auto-open starts so future app launches skip auto mode.
 */
export function TutorialProvider({
  children,
  autoStartEnabled,
}: {
  children: React.ReactNode;
  autoStartEnabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  const [seen, setSeen] = useState(true);
  const [targets, setTargets] = useState<Record<string, TutorialTargetRect>>({});

  useEffect(() => {
    (async () => {
      const alreadySeen = await getTutorialSeen();
      setSeen(alreadySeen);
      setChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!checked || seen || !autoStartEnabled) return;

    (async () => {
      setVisible(true);
      setSeen(true);
      await setTutorialSeen(true);
    })();
  }, [checked, seen, autoStartEnabled]);

  const startTutorial = (fromStepIndex = 0) => {
    setCurrentStepIndex(Math.max(0, fromStepIndex));
    setVisible(true);
  };

  const closeTutorial = () => {
    setVisible(false);
  };

  const nextStep = (totalSteps: number) => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(0, totalSteps - 1)));
  };

  const prevStep = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const registerTarget = (id: string, rect: TutorialTargetRect) => {
    setTargets((prev) => ({ ...prev, [id]: rect }));
  };

  const unregisterTarget = (id: string) => {
    setTargets((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getTargetRect = (id?: string) => {
    if (!id) return null;
    return targets[id] ?? null;
  };

  const value: TutorialContextValue = {
    visible,
    currentStepIndex,
    startTutorial,
    closeTutorial,
    nextStep,
    prevStep,
    setCurrentStepIndex,
    registerTarget,
    unregisterTarget,
    getTargetRect,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}
