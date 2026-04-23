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

  let data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    if (res.status === 422 && Array.isArray(data.detail)) {
      const rawMessage = data.detail[0]?.msg ?? "Invalid input"
      const message = rawMessage == "value is not a valid email address: An email address must have an @-sign." ? "Please enter a valid email address" : rawMessage
      throw new Error(message)
      
    }

    if (typeof data.detail === "string") {
      throw new Error(data.detail);
    }

    throw new Error("Login failed");
  }

  await SecureStore.setItemAsync("access_token", data.access_token);
  await SecureStore.setItemAsync("refresh_token", data.refresh_token);

  if (data?.user_id !== undefined && data?.user_id !== null) {
    await setCurrentUserId(data.user_id);
  }

  setAuthed(true);

  return data;
}