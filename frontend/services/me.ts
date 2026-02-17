import { apiFetch } from "@/services/apiFetch";

export type Me = {
  id: number;
  username: string;
  email: string;
};

export async function getMe(): Promise<Me> {
  const res = await apiFetch("/users/me", { method: "GET" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to load profile");
  }

  return data as Me;
}