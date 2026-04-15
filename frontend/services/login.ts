import * as SecureStore from "expo-secure-store";
import { setAuthed } from "@/services/authState";
import { setCurrentUserId } from "@/services/tutorialStorage";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Invalid email or password");

  await SecureStore.setItemAsync("access_token", data.access_token);
  await SecureStore.setItemAsync("refresh_token", data.refresh_token);

  if (data?.user_id !== undefined && data?.user_id !== null) {
    await setCurrentUserId(data.user_id);
  }

  setAuthed(true);

  return data;
}