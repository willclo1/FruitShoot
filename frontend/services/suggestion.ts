import { apiFetch } from "@/services/apiFetch";

export type RecipeSuggestion = {
  id: number;
  title: string;
  ingredients_description: string;
  instructions_description: string;
  created_at: string;
  score: number;
  reason: string;
};

export type RecipeSuggestionResponse = {
  fruit: string;
  ripeness: string;
  suggestions: RecipeSuggestion[];
};

export async function getRecipeSuggestions({
  fruit,
  ripeness,
  fruitConfidence,
  ripenessConfidence,
  limit,
}: {
  fruit: string;
  ripeness: string;
  fruitConfidence?: number;
  ripenessConfidence?: number;
  limit?: number;
}): Promise<RecipeSuggestionResponse> {
  const res = await apiFetch("/recipes/suggestions", {
    method: "POST",
    body: JSON.stringify({
      fruit,
      ripeness,
      fruit_confidence: fruitConfidence ?? 1,
      ripeness_confidence: ripenessConfidence ?? 1,
      limit: limit ?? 5,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to fetch suggestions");
  }

  return data;
}