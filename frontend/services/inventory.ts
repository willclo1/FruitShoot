import * as SecureStore from "expo-secure-store";

import { isLikelyFruit, normalizeFruit } from "@/services/recipeFormat";

const INVENTORY_KEY = "fruit_inventory";

function parseStoredInventory(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item))
      .map(normalizeFruit)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getFruitInventory(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INVENTORY_KEY);
  return parseStoredInventory(raw);
}

export async function addFruitToInventory(fruit: string): Promise<void> {
  if (!isLikelyFruit(fruit)) return;

  const normalizedFruit = normalizeFruit(fruit);
  const existing = await getFruitInventory();

  if (existing.includes(normalizedFruit)) return;

  await SecureStore.setItemAsync(
    INVENTORY_KEY,
    JSON.stringify([...existing, normalizedFruit])
  );
}