import { apiFetch } from "@/services/apiFetch";

export async function getAllergies(): Promise<string> {
  const res = await apiFetch("/users/me/allergies", { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Failed to load allergies");
  return data.allergies ?? "";
}

export async function updateAllergies(allergies: string): Promise<string> {
  const res = await apiFetch("/users/me/allergies", {
    method: "PUT",
    body: JSON.stringify({ allergies }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || "Failed to update allergies");
  return data.allergies ?? "";
}
