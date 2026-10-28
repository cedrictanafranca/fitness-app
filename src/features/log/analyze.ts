import { inferMealType } from '@/core/nutrition/engine';
import { calibrationsRepo, recipesRepo } from '@/data/repos';
import { analyzeMeal } from '@/services/ai';

import type { Composer } from './composer-store';
import { parseGrams } from './composer-store';
import type { LogDraft } from './draft-store';
import { emptyDraft } from './draft-store';
import { resolveAnalyzedMeal } from './resolve';

/** Run the AI on the composer inputs and resolve the result into a review draft. */
export async function analyzeComposer(c: Composer): Promise<LogDraft> {
  const now = new Date();
  const text = c.text.trim();
  const statedTotalGrams = parseGrams(c.gramsText);
  const [recipes, calibrations] = await Promise.all([recipesRepo.list(), calibrationsRepo.list()]);

  const analyzed = await analyzeMeal({
    imageBase64: c.photo?.base64,
    imageMimeType: c.photo?.mimeType,
    text: text || undefined,
    statedTotalGrams,
    recipeNames: recipes.map((r) => r.name),
    calibrations: calibrations.map((x) => ({ name: x.name, foodName: x.foodName, grams: x.grams })),
    localHour: now.getHours(),
  });

  if (analyzed.items.length === 0) {
    throw new Error(
      analyzed.clarification ?? "We couldn't identify any foods. Add more detail or log it manually."
    );
  }

  const items = await resolveAnalyzedMeal(analyzed, { recipes, calibrations, statedTotalGrams });

  return emptyDraft({
    mealType: c.mealTypeTouched ? c.mealType : (analyzed.mealType ?? inferMealType(now)),
    photoUri: c.photo?.uri,
    inputText: text || undefined,
    statedTotalGrams,
    clarification: analyzed.clarification,
    notes: analyzed.notes,
    items,
  });
}
