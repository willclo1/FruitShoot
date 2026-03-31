import * as SecureStore from "expo-secure-store";

const TUTORIAL_SEEN_KEY = "tutorial_seen_v1";

/**
 * Reads whether the first-run tutorial has already been shown.
 * Uses SecureStore so the value persists across app restarts.
 */
export async function getTutorialSeen(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(TUTORIAL_SEEN_KEY);
  return value === "1";
}

/**
 * Marks the tutorial as shown so it won't auto-open again.
 */
export async function setTutorialSeen(seen: boolean): Promise<void> {
  await SecureStore.setItemAsync(TUTORIAL_SEEN_KEY, seen ? "1" : "0");
}
