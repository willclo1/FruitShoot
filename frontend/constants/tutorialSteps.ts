/**
 * Tutorial step definitions for react-native-copilot.
 *
 * Each step maps to a CopilotStep via `name` (display title) and `order`.
 * The `text` is shown in the tooltip. The `targetId` links to the
 * CopilotStep's `name` prop used in components.
 */
export type TutorialStepConfig = {
  /** Unique key & CopilotStep `name` prop */
  id: string;
  /** Display order (1-indexed, passed to CopilotStep `order`) */
  order: number;
  /** Title shown in tooltip header */
  title: string;
  /** Short description shown in tooltip body */
  text: string;
};

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: "Welcome",
    order: 1,
    title: "Welcome",
    text: "This is FruitShoot! Scan fruit, get ripeness results, and discover recipes.",
  },
  {
    id: "Scan Fruit",
    order: 2,
    title: "Scan Fruit",
    text: "Tap here to upload or take a photo of your fruit.",
  },
  {
    id: "Instructions",
    order: 3,
    title: "Instructions",
    text: "Read how scanning works and what results mean.",
  },
  {
    id: "Settings",
    order: 4,
    title: "Settings",
    text: "Adjust voice, text size, and accessibility options.",
  },
  {
    id: "Explore Tab",
    order: 5,
    title: "Explore",
    text: "Browse and save community recipes here.",
  },
  {
    id: "Profile Tab",
    order: 6,
    title: "Profile",
    text: "Create, import, and manage your recipes.",
  },
  {
    id: "Home Tab",
    order: 7,
    title: "Home",
    text: "Come back here anytime to scan more fruit.",
  },
  {
    id: "Sign Out",
    order: 8,
    title: "Sign Out",
    text: "Tap here when you're done to sign out.",
  },
];
