/**
 * Turns the AI's AnalyzedMeal into draft MealItems with real nutrition.
 * Nutrition priority (PRD 3.2): saved recipe → food database → AI estimate.
 * Quantity priority: stated grams → calibrated unit → known serving → AI estimate → ask user.
 */

import { buildMealItem } from '@/core/nutrition/build';
import { findCalibration, normalizeUnit, recipeNutrition } from '@/core/nutrition/engine';
import { choosePortion, typicalGramsFor } from '@/core/nutrition/portions';
import type {
  AnalyzedMeal,
  AnalyzedMealItem,
  EstimateStatus,
  Macros,
  MealItem,
  MealItemRef,
  NutritionSource,
  PortionCalibration,
  Recipe,
  ServingSize,
} from '@/core/types';
import { ZERO_MACROS } from '@/core/types';
import { newId } from '@/data/ids';
import { searchTermsFor } from '@/core/foods/search-terms';
import { isRelevantMatch } from '@/server/normalize';
import { cacheFood, searchFoods, type FoodCandidate } from '@/services/foods';

export interface ResolveContext {
  recipes: Recipe[];
  calibrations: PortionCalibration[];
  /** Whole-plate weight the user measured. Only assigned when there is exactly one item. */
  statedTotalGrams?: number;
  /** Existing meal id (edit mode); drafts for new meals use ''. */
  mealId?: string;
  /** Recently logged items; measured ones supply the user's usual portion for each food. */
  recentItems?: MealItem[];
}

interface Basis {
  per100g: Macros;
  source: NutritionSource;
  ref: MealItemRef;
  servings: ServingSize[];
}

export function findRecipeByName(recipes: Recipe[], name: string): Recipe | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return (
    recipes.find((r) => r.name.trim().toLowerCase() === n) ??
    recipes.find((r) => r.name.toLowerCase().includes(n) || n.includes(r.name.toLowerCase()))
  );
}

export function recipeBasis(recipe: Recipe): Basis {
  const n = recipeNutrition(recipe.ingredients, recipe.cookedWeightG);
  const servings: ServingSize[] = [];
  const total = recipe.cookedWeightG ?? n.rawWeightG;
  if (recipe.servings && recipe.servings > 0 && total > 0) {
    servings.push({ label: 'serving', grams: total / recipe.servings });
  }
  return { per100g: n.per100g, source: 'recipe', ref: { kind: 'recipe', id: recipe.id }, servings };
}

async function cachedBasis(candidate: FoodCandidate): Promise<Basis> {
  try {
    const food = await cacheFood(candidate);
    return { per100g: food.per100g, source: food.source, ref: { kind: 'food', id: food.id }, servings: food.servings };
  } catch {
    return { per100g: candidate.per100g, source: candidate.source, ref: { kind: 'none' }, servings: candidate.servings };
  }
}

/**
 * Nutrition for a food name. A saved food wins; otherwise the first database entry that is the
 * food the user named (not merely one that shares a word), trying simpler search terms when the
 * exact name finds nothing. Returns `fallback` (an unrelated top hit) separately so the caller can
 * prefer the AI's own estimate over it.
 */
async function foodBasis(name: string): Promise<{ basis: Basis | null; fallback: FoodCandidate | null }> {
  let fallback: FoodCandidate | null = null;
  let anyLocal: Basis | null = null;
  for (const [i, term] of searchTermsFor(name).entries()) {
    let res;
    try {
      res = await searchFoods(term);
    } catch {
      continue;
    }
    if (i === 0) {
      const saved = res.local.find((f) => f.saved);
      if (saved) return { basis: { per100g: saved.per100g, source: saved.source, ref: { kind: 'food', id: saved.id }, servings: saved.servings }, fallback };
      const local = res.local[0];
      if (local) anyLocal = { per100g: local.per100g, source: local.source, ref: { kind: 'food', id: local.id }, servings: local.servings };
    }
    const match = res.remote.find((c) => isRelevantMatch(term, c.name));
    if (match) return { basis: await cachedBasis(match), fallback };
    fallback ??= res.remote[0] ?? null;
  }
  return { basis: anyLocal, fallback };
}

/** Grams for one unit of a serving, e.g. "2 cups" with servings [{label:'1 cup', grams:240}] → 240. */
function servingUnitGrams(servings: ServingSize[], unitLabel: string): number | undefined {
  const u = normalizeUnit(unitLabel);
  for (const s of servings) {
    const words = s.label.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(normalizeUnit);
    if (normalizeUnit(s.label) === u || words.includes(u)) {
      const lead = s.label.match(/^\s*(\d+(?:\.\d+)?)/);
      const count = lead ? Number(lead[1]) : 1;
      return count > 0 ? s.grams / count : s.grams;
    }
  }
  return undefined;
}

async function resolveItem(
  item: AnalyzedMealItem,
  ctx: ResolveContext,
  singleTotal: number | undefined
): Promise<MealItem> {
  // ---- Nutrition basis ----
  let basis: Basis | null = null;
  const recipe = item.recipeMatch ? findRecipeByName(ctx.recipes, item.recipeMatch) : undefined;
  if (recipe) basis = recipeBasis(recipe);
  let fallback: FoodCandidate | null = null;
  if (!basis) ({ basis, fallback } = await foodBasis(item.name));
  if (!basis && item.estimatedPer100g) {
    basis = { per100g: item.estimatedPer100g, source: 'ai_estimate', ref: { kind: 'none' }, servings: [] };
  }
  // Last resort: the closest database entry, even if it is not clearly the same food.
  if (!basis && fallback) basis = await cachedBasis(fallback);
  const resolved: Basis = basis ?? { per100g: { ...ZERO_MACROS }, source: 'ai_estimate', ref: { kind: 'none' }, servings: [] };

  // ---- Quantity ----
  let grams: number | undefined;
  let quantity: number | undefined;
  let unitLabel: string | undefined;
  let unitGrams: number | undefined;
  let status: EstimateStatus = 'estimated';

  if (singleTotal != null) {
    grams = singleTotal;
    status = 'measured';
  } else if (item.statedGrams != null && item.statedGrams > 0) {
    grams = item.statedGrams;
    status = 'measured';
  } else if (item.quantity != null && item.unitLabel) {
    const cal = findCalibration(ctx.calibrations, item.unitLabel, item.name);
    const serving = cal ? undefined : servingUnitGrams(resolved.servings, item.unitLabel);
    const per = cal?.grams ?? serving;
    if (per != null) {
      quantity = item.quantity;
      unitLabel = item.unitLabel;
      unitGrams = per;
      status = 'measured';
    }
  }
  let gramsRange: MealItem['gramsRange'];
  let portionBasis: string | undefined;
  if (grams == null && unitGrams == null) {
    // No measured basis: the user's own history or the AI's visual estimate, with a range.
    const chosen = choosePortion({
      aiGrams: item.estimatedGrams,
      aiConfidence: item.confidence,
      aiRange: item.gramsRange,
      aiBasis: item.portionBasis,
      typical: ctx.recentItems ? typicalGramsFor(ctx.recentItems, item.name) : null,
    });
    if (chosen) {
      grams = chosen.grams;
      gramsRange = chosen.range;
      portionBasis = chosen.label;
      status = 'estimated';
    }
  }
  // An AI-estimated nutrition source is never "measured", whatever the quantity basis.
  if (resolved.source === 'ai_estimate') status = 'estimated';

  const base = {
    id: newId(),
    mealId: ctx.mealId ?? '',
    name: item.name,
    ref: resolved.ref,
    per100g: resolved.per100g,
    source: resolved.source,
    confidence: item.confidence,
  };

  if (grams == null && unitGrams == null) {
    // No quantity basis: the user must fill in grams on the review screen.
    return {
      ...base,
      grams: undefined,
      totals: { ...ZERO_MACROS },
      estimateStatus: 'estimated',
    };
  }
  const built = buildMealItem({ ...base, estimateStatus: status, grams, quantity, unitLabel, unitGrams });
  return status === 'estimated' && gramsRange ? { ...built, gramsRange, portionBasis } : built;
}

export async function resolveAnalyzedMeal(analyzed: AnalyzedMeal, ctx: ResolveContext): Promise<MealItem[]> {
  const singleTotal =
    analyzed.items.length === 1 && ctx.statedTotalGrams != null && ctx.statedTotalGrams > 0
      ? ctx.statedTotalGrams
      : undefined;
  // Multiple items + a plate weight: never split it silently; the review screen shows the total.
  return Promise.all(analyzed.items.map((it) => resolveItem(it, ctx, singleTotal)));
}
