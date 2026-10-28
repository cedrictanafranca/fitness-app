/**
 * Helpers that assemble domain objects with their nutrition already computed,
 * so UI code never does macro math by hand.
 */

import type { EstimateStatus, Macros, MealItem, MealItemRef, NutritionSource } from '../types';
import { itemTotals, resolveGrams } from './engine';

export interface MealItemInput {
  id: string;
  mealId: string;
  name: string;
  ref?: MealItemRef;
  per100g: Macros;
  source: NutritionSource;
  estimateStatus: EstimateStatus;
  grams?: number;
  quantity?: number;
  unitLabel?: string;
  /** Grams per unit when quantity/unitLabel are used (from a ServingSize or PortionCalibration). */
  unitGrams?: number;
  confidence?: number;
}

/**
 * Build a MealItem with totals computed from per-100 g values and the resolved grams.
 * Throws when no quantity basis exists — callers must ask the user or supply an estimate first.
 */
export function buildMealItem(input: MealItemInput): MealItem {
  const grams = resolveGrams(input, input.unitGrams);
  if (grams == null) {
    throw new Error(`Cannot build meal item "${input.name}": no grams or quantity×unit basis`);
  }
  return {
    id: input.id,
    mealId: input.mealId,
    name: input.name,
    ref: input.ref ?? { kind: 'none' },
    grams,
    quantity: input.quantity,
    unitLabel: input.unitLabel,
    per100g: input.per100g,
    totals: itemTotals(input.per100g, grams),
    source: input.source,
    estimateStatus: input.estimateStatus,
    confidence: input.confidence,
  };
}

/** Recompute an item's totals after its grams changed (e.g. "actually it was 300 g"). */
export function withGrams(item: MealItem, grams: number): MealItem {
  return { ...item, grams, quantity: undefined, unitLabel: undefined, totals: itemTotals(item.per100g, grams) };
}
