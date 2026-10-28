import { recipeNutrition } from '@/core/nutrition/engine';
import type { Food, Macros, MealItem, MealItemRef, NutritionSource, Recipe, ServingSize } from '@/core/types';
import type { FoodCandidate } from '@/services/foods';

import { recipeBasis } from './resolve';

/** Anything the user can pick in search and add to a meal. */
export interface Pickable {
  key: string;
  name: string;
  brand?: string;
  per100g: Macros;
  source: NutritionSource;
  servings: ServingSize[];
  ref: MealItemRef;
  /** Remote result that must be cached (cacheFood) on confirm. */
  candidate?: FoodCandidate;
}

export const fromFood = (f: Food): Pickable => ({
  key: `food:${f.id}`,
  name: f.name,
  brand: f.brand,
  per100g: f.per100g,
  source: f.source,
  servings: f.servings,
  ref: { kind: 'food', id: f.id },
});

export const fromCandidate = (c: FoodCandidate): Pickable => ({
  key: `cand:${c.sourceRef}`,
  name: c.name,
  brand: c.brand,
  per100g: c.per100g,
  source: c.source,
  servings: c.servings,
  ref: { kind: 'none' },
  candidate: c,
});

export function fromRecipe(r: Recipe): Pickable {
  const b = recipeBasis(r);
  return {
    key: `recipe:${r.id}`,
    name: r.name,
    per100g: recipeNutrition(r.ingredients, r.cookedWeightG).per100g,
    source: 'recipe',
    servings: b.servings,
    ref: b.ref,
  };
}

/** Recently logged item reused as a suggestion (uses its stored per-100 g snapshot). */
export const fromMealItem = (i: MealItem): Pickable => ({
  key: `item:${i.ref.kind === 'none' ? i.name : `${i.ref.kind}:${'id' in i.ref ? i.ref.id : ''}`}`,
  name: i.name,
  per100g: i.per100g,
  source: i.source,
  servings: [],
  ref: i.ref,
});
