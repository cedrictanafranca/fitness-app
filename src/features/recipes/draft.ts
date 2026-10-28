import type { EstimateStatus, Macros, NutritionSource, RecipeIngredient } from '@/core/types';
import { newId } from '@/data/ids';

/** An ingredient while it is being edited: grams and nutrition may not be known yet (e.g. after AI prefill). */
export interface DraftIngredient {
  id: string;
  name: string;
  foodId?: string;
  grams?: number;
  per100g?: Macros;
  source: NutritionSource;
  estimateStatus: EstimateStatus;
  /** What the user said, e.g. "2 cloves" — shown as a reminder when grams was converted by the AI. */
  hint?: string;
}

export type CompleteIngredient = DraftIngredient & { grams: number; per100g: Macros };

export function isComplete(d: DraftIngredient): d is CompleteIngredient {
  return d.grams != null && d.grams > 0 && d.per100g != null;
}

export function toRecipeIngredient(d: CompleteIngredient): RecipeIngredient {
  return {
    id: d.id,
    name: d.name,
    foodId: d.foodId,
    grams: d.grams,
    per100g: d.per100g,
    source: d.source,
    estimateStatus: d.estimateStatus,
  };
}

export function fromRecipeIngredient(i: RecipeIngredient): DraftIngredient {
  return { ...i };
}

export function blankDraft(name = ''): DraftIngredient {
  return { id: newId(), name, source: 'custom', estimateStatus: 'measured' };
}
