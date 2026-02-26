import { apiFetch } from "./apiFetch";

export interface Recipe {
  id: number;
  user_id: number;
  title: string;
  ingredients_description: string;
  instructions_description: string;
  created_at: string;
}

export async function getUserRecipes(): Promise<Recipe[]> {
  const res = await apiFetch("/recipes/");

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to fetch recipes");
  }

  return res.json();
}

export async function createRecipe(
  title: string,
  ingredients_description: string,
  instructions_description: string
): Promise<Recipe> {
  const res = await apiFetch("/recipes/", {
    method: "POST",
    body: JSON.stringify({
      title,
      ingredients_description,
      instructions_description,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to create recipe");
  }

  return res.json();
}

export async function updateRecipe(
  id: number,
  title: string,
  ingredients_description: string,
  instructions_description: string
): Promise<Recipe> {
  const res = await apiFetch(`/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      title,
      ingredients_description,
      instructions_description,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to update recipe");
  }

  return res.json();
}

export async function deleteRecipe(id: number): Promise<void> {
  const res = await apiFetch(`/recipes/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to delete recipe");
  }
}
