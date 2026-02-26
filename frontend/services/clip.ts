import { apiFetch } from "@/services/apiFetch";

export type ClipRequest = {
  url: string;
  ml_disable?: boolean;
  ml_classify_endpoint?: string | null;
};

export type ClippedRecipe = {
  title: string;
  ingredients_description: string;
  instructions_description: string;
};

export type ClipResponse = {
  ok: boolean;
  recipe: ClippedRecipe;
  // raw?: any; // only if you decide to return raw for debugging
};

export async function clipFromUrl(data: ClipRequest): Promise<ClipResponse> {
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
      `Failed to import recipe (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return json as ClipResponse;
}