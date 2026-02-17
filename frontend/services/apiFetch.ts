import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function apiFetch(path: string, options: any = {}) {
  const access = await SecureStore.getItemAsync("access_token");

  const doFetch = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

  let res = await doFetch(access || undefined);

  if (res.status === 401) {
    const refresh = await SecureStore.getItemAsync("refresh_token");
    if (!refresh) throw new Error("Session expired");

    const refreshRes = await fetch(`${API_URL}/users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    const refreshData = await refreshRes.json().catch(() => ({}));

    if (!refreshRes.ok) {
      throw new Error(refreshData?.detail || "Session expired");
    }

    await SecureStore.setItemAsync("access_token", refreshData.access_token);
    await SecureStore.setItemAsync("refresh_token", refreshData.refresh_token);

    res = await doFetch(refreshData.access_token);
  }

  return res;
}