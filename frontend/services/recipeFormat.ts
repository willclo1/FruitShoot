export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseIngredients(value: string): string[] {
  return splitLines(value).map((line) => line.replace(/^[-*]\s*/, "").trim());
}

export function parseInstructions(value: string): string[] {
  return splitLines(value)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export function ingredientsToDescription(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

export function instructionsToDescription(steps: string[]): string {
  return steps
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step, idx) => `${idx + 1}. ${step}`)
    .join("\n");
}

export function normalizeFruit(value: string): string {
  return value.trim().toLowerCase();
}

export function isLikelyFruit(value: string): boolean {
  const normalized = normalizeFruit(value);
  return !!normalized && !normalized.includes("non") && !normalized.includes("background");
}

export function recipeMatchesAnyFruit(
  ingredientsDescription: string,
  fruits: string[]
): boolean {
  const source = ingredientsDescription.toLowerCase();
  return fruits.some((fruit) => source.includes(normalizeFruit(fruit)));
}

export function pickRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.max(0, count));
}