/**
 * Food database lookup. Searches local saved foods first, then the remote route
 * (/api/foods/search → USDA FoodData Central + Open Food Facts).
 * CONTRACT — screens depend on these signatures. The AI-service agent implements the bodies.
 */

import type { Food } from '@/core/types';

/** A remote match that has not been saved locally yet (no id until `cacheFood`). */
export type FoodCandidate = Omit<Food, 'id' | 'createdAt' | 'saved'> & { sourceRef: string };

export interface FoodSearchResult {
  local: Food[];
  remote: FoodCandidate[];
}

export async function searchFoods(_query: string): Promise<FoodSearchResult> {
  throw new Error('searchFoods not implemented yet');
}

/**
 * Persist a remote candidate locally (idempotent on sourceRef) and return the stored Food,
 * so MealItems can reference a stable id.
 */
export async function cacheFood(_candidate: FoodCandidate, _saved = false): Promise<Food> {
  throw new Error('cacheFood not implemented yet');
}
