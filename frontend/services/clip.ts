import { apiFetch } from "@/services/apiFetch";

export type ClipRequest = {
  url: string;
  ml_disable?: boolean;
  ml_classify_endpoint?: string | null;
};

export type SavedRecipe = {
  id: number;
  user_id: number;
  title: string;
  ingredients_description: string;
  instructions_description: string;
  created_at: string;
};

export type ClipResponse = {
  ok: boolean;
  recipe: SavedRecipe;
};

export async function clipRecipe(data: ClipRequest): Promise<ClipResponse> {
  const res = await apiFetch("/clip/", {
    method: "POST",
    body: JSON.stringify({
      url: data.url,
      ml_disable: data.ml_disable ?? true,
      ml_classify_endpoint: data.ml_classify_endpoint ?? null,
    }),
  });


  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (json && (json.detail || json.message)) ||
      `Failed to clip recipe (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return json as ClipResponse;
}