import { apiFetch } from "@/services/apiFetch";

export type ExploreRecipe = {
  id: number;
  user_id: number;
  title: string;
  ingredients_description: string;
  instructions_description: string;
  created_at: string;
  is_saved: boolean;
  save_count: number;
};

export async function getExploreRecipes(
  limit = 20,
  offset = 0,
  ingredients?: string[],
  excludeIngredients?: string[]
): Promise<ExploreRecipe[]> {
  const params = new URLSearchParams();

  params.set("limit", limit.toString());
  params.set("offset", offset.toString());

  if (ingredients && ingredients.length > 0) {
    ingredients.forEach((ingredient) => {
      params.append("ingredients", ingredient);
    });
  }

  if (excludeIngredients && excludeIngredients.length > 0) {
    excludeIngredients.forEach((ingredient) => {
      params.append("exclude_ingredients", ingredient);
    });
  }

  const res = await apiFetch(`/recipes/explore?${params.toString()}`, {
    method: "GET",
  });

  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to load explore recipes");
  }

  return data;
}
``

export async function getSavedRecipes(): Promise<ExploreRecipe[]> {
  const res = await apiFetch("/recipes/saved", {
    method: "GET",
  });

  const data = await res.json().catch(() => []);

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to load saved recipes");
  }

  return data;
}

export async function saveRecipe(recipeId: number) {
  const res = await apiFetch(`/recipes/${recipeId}/save`, {
    method: "POST",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to save recipe");
  }

  return data;
}

export async function unsaveRecipe(recipeId: number) {
  const res = await apiFetch(`/recipes/${recipeId}/save`, {
    method: "DELETE",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || "Failed to unsave recipe");
  }

  return data;
}
