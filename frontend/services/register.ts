import * as SecureStore from "expo-secure-store";
import { setAuthed } from "@/services/authState";
import { queueTutorialForUser, setCurrentUserId } from "@/services/tutorialStorage";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function formatRegisterError(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const first = detail[0] as any;
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : "field";
    const message = first?.msg || "Invalid value";
    return `${field}: ${message}`;
  }

  return "Registration failed";
}

export async function register(email: string, password: string, username: string) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(formatRegisterError(data?.detail));

  await SecureStore.setItemAsync("access_token", data.access_token);
  await SecureStore.setItemAsync("refresh_token", data.refresh_token);

  if (data?.user_id !== undefined && data?.user_id !== null) {
    await setCurrentUserId(data.user_id);
    await queueTutorialForUser(data.user_id);
  }

  setAuthed(true);

  return data;
  
}