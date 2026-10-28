/** Post-processing of model output: enforce ranges and PRD invariants the prompt can only request. Pure. */

import type { z } from 'zod';
import type { analyzeMealRequestSchema, analyzedMealSchema, extractedRecipeSchema } from './schemas';

type AnalyzeInput = z.infer<typeof analyzeMealRequestSchema>;
type Analyzed = z.infer<typeof analyzedMealSchema>;
type Recipe = z.infer<typeof extractedRecipeSchema>;

const MAX_GRAMS = 20000;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function grams(n: number | null): number | null {
  return n !== null && Number.isFinite(n) && n > 0 && n <= MAX_GRAMS ? round1(n) : null;
}

function nonEmpty(s: string | null): string | null {
  const t = s?.trim();
  return t ? t : null;
}

const singular = (s: string) => s.trim().toLowerCase().replace(/(es|s)$/, '');

function findCalibration(
  calibrations: AnalyzeInput['calibrations'],
  unitLabel: string,
  itemName: string,
): AnalyzeInput['calibrations'][number] | undefined {
  const unit = singular(unitLabel);
  const name = itemName.toLowerCase();
  const matches = calibrations.filter((c) => singular(c.name) === unit);
  // Prefer a calibration for this specific food, then a generic one.
  return (
    matches.find((c) => c.foodName && (name.includes(c.foodName.toLowerCase()) || c.foodName.toLowerCase().includes(name))) ??
    matches.find((c) => !c.foodName)
  );
}

export function sanitizeAnalyzedMeal(meal: Analyzed, input: AnalyzeInput): Analyzed {
  const hasText = Boolean(input.text?.trim());
  const items = meal.items
    .filter((i) => i.name.trim())
    .map((i) => {
      const quantity = i.quantity !== null && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : null;
      const unitLabel = quantity !== null ? nonEmpty(i.unitLabel) : null;
      // Stated weights only ever come from the user's own words.
      const statedGrams = hasText ? grams(i.statedGrams) : null;
      let estimatedGrams = grams(i.estimatedGrams);
      if (statedGrams === null && estimatedGrams === null && quantity !== null && unitLabel !== null) {
        const cal = findCalibration(input.calibrations, unitLabel, i.name);
        if (cal) estimatedGrams = grams(quantity * cal.grams);
      }
      const p = i.estimatedPer100g;
      const per100 =
        p &&
        [p.calories, p.protein, p.carbs, p.fat].every((v) => Number.isFinite(v) && v >= 0) &&
        p.calories <= 900
          ? { calories: round1(p.calories), protein: round1(p.protein), carbs: round1(p.carbs), fat: round1(p.fat) }
          : null;
      return {
        name: i.name.trim(),
        estimatedGrams,
        statedGrams,
        quantity,
        unitLabel,
        recipeMatch: i.recipeMatch !== null && input.recipeNames.includes(i.recipeMatch) ? i.recipeMatch : null,
        confidence: clamp01(i.confidence),
        estimatedPer100g: per100,
      };
    });
  return {
    items,
    mealType: meal.mealType,
    clarification: nonEmpty(meal.clarification),
    notes: nonEmpty(meal.notes),
  };
}

export function sanitizeRecipe(recipe: Recipe): Recipe {
  return {
    name: recipe.name.trim() || 'Untitled recipe',
    ingredients: recipe.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        grams: grams(i.grams),
        quantityText: nonEmpty(i.quantityText),
        confidence: clamp01(i.confidence),
      })),
    cookedWeightG: grams(recipe.cookedWeightG),
    servings: recipe.servings !== null && Number.isFinite(recipe.servings) && recipe.servings > 0 ? recipe.servings : null,
    clarification: nonEmpty(recipe.clarification),
  };
}
