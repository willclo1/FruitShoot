import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function apiFetch(path: string, options: any = {}) {
  let access = await SecureStore.getItemAsync("access_token");

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: access ? `Bearer ${access}` : "",
      ...(options.headers || {}),
    },
  });

  // If access token expired → refresh
  if (res.status === 401) {
    const refresh = await SecureStore.getItemAsync("refresh_token");

    const refreshRes = await fetch(`${API_URL}/users/refresh`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!refreshRes.ok) throw new Error("Session expired");

    const tokens = await refreshRes.json();

    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);

    // retry original request
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
        ...(options.headers || {}),
      },
    });
  }

  return res;
}