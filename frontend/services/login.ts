import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Invalid email or password");

  const data = await res.json();

  await SecureStore.setItemAsync("access_token", data.access_token);
  await SecureStore.setItemAsync("refresh_token", data.refresh_token);

  return data;
}