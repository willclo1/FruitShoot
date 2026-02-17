import * as SecureStore from "expo-secure-store";
import { setAuthed } from "@/services/authState";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function register(email: string, password: string, username: string) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Registration failed");

  await SecureStore.setItemAsync("access_token", data.access_token);
  await SecureStore.setItemAsync("refresh_token", data.refresh_token);

  setAuthed(true);

  return data;
}