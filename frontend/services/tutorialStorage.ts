import * as SecureStore from "expo-secure-store";

const TUTORIAL_SEEN_PREFIX = "tutorial_seen_v2";
const TUTORIAL_PENDING_PREFIX = "tutorial_pending_v1";
const CURRENT_USER_ID_KEY = "current_user_id";

function normalizeUserId(userId: string | number): string {
  return String(userId).trim();
}

function tutorialSeenKey(userId: string | number): string {
  return `${TUTORIAL_SEEN_PREFIX}_${normalizeUserId(userId)}`;
}

function tutorialPendingKey(userId: string | number): string {
  return `${TUTORIAL_PENDING_PREFIX}_${normalizeUserId(userId)}`;
}

export async function setCurrentUserId(userId: string | number): Promise<void> {
  await SecureStore.setItemAsync(CURRENT_USER_ID_KEY, normalizeUserId(userId));
}

export async function getCurrentUserId(): Promise<string | null> {
  const value = await SecureStore.getItemAsync(CURRENT_USER_ID_KEY);
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

export async function clearCurrentUserId(): Promise<void> {
  await SecureStore.deleteItemAsync(CURRENT_USER_ID_KEY);
}

/**
 * Reads whether the first-run tutorial has already been shown.
 * Uses SecureStore so the value persists across app restarts.
 */
export async function getTutorialSeen(userId: string | number): Promise<boolean> {
  const value = await SecureStore.getItemAsync(tutorialSeenKey(userId));
  return value === "1";
}

/**
 * Marks the tutorial as shown so it won't auto-open again.
 */
export async function setTutorialSeen(userId: string | number, seen: boolean): Promise<void> {
  await SecureStore.setItemAsync(tutorialSeenKey(userId), seen ? "1" : "0");
}

/**
 * Queue tutorial auto-start for the next authenticated app session.
 * Used after successful account creation.
 */
export async function queueTutorialForUser(userId: string | number): Promise<void> {
  await SecureStore.setItemAsync(tutorialPendingKey(userId), "1");
}

/**
 * Returns and clears the pending tutorial flag for a user.
 */
export async function consumeQueuedTutorialForUser(userId: string | number): Promise<boolean> {
  const key = tutorialPendingKey(userId);
  const value = await SecureStore.getItemAsync(key);
  if (value === "1") {
    await SecureStore.deleteItemAsync(key);
    return true;
  }
  return false;
}
