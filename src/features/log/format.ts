import type { Macros, NutritionSource } from '@/core/types';

export const SOURCE_LABELS: Record<NutritionSource, string> = {
  usda: 'USDA',
  openfoodfacts: 'Open Food Facts',
  recipe: 'Recipe',
  custom: 'Custom',
  ai_estimate: 'AI estimate',
};

export const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
} as const;

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export function macroLine(m: Macros): string {
  return `${Math.round(m.calories)} kcal · P ${round1(m.protein)} · C ${round1(m.carbs)} · F ${round1(m.fat)}`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatGrams(g: number | undefined): string {
  if (g == null) return '';
  return String(round1(g));
}

export function errorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}
