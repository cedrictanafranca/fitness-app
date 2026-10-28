import { inferMealType } from '@/core/nutrition/engine';
import { typicalGramsFor, typicalPortions } from '@/core/nutrition/portions';
import type { TypicalPortion } from '@/core/nutrition/portions';
import { calibrationsRepo, mealsRepo, recipesRepo } from '@/data/repos';
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
  const [recipes, calibrations, recentMeals] = await Promise.all([
    recipesRepo.list(),
    calibrationsRepo.list(),
    mealsRepo.listRecent(60),
  ]);
  const recentItems = recentMeals.flatMap((m) => m.items);
  const usual = typicalPortions(recentMeals);

  const analyzed = await analyzeMeal({
    imageBase64: c.photo?.base64,
    imageMimeType: c.photo?.mimeType,
    text: text || undefined,
    statedTotalGrams,
    recipeNames: recipes.map((r) => r.name),
    calibrations: calibrations.map((x) => ({ name: x.name, foodName: x.foodName, grams: x.grams })),
    localHour: now.getHours(),
    recentPortions: usual.map((u) => ({ name: u.name, grams: u.grams })),
  });

  if (analyzed.items.length === 0) {
    throw new Error(
      analyzed.clarification ?? "We couldn't identify any foods. Add more detail or log it manually."
    );
  }

  const items = await resolveAnalyzedMeal(analyzed, { recipes, calibrations, statedTotalGrams, recentItems });

  // "You usually log 180 g" hints for the review screen, keyed by draft item id.
  const portionHints: Record<string, TypicalPortion> = {};
  for (const item of items) {
    const t = typicalGramsFor(recentItems, item.name);
    if (t) portionHints[item.id] = t;
  }

  return emptyDraft({
    mealType: c.mealTypeTouched ? c.mealType : (analyzed.mealType ?? inferMealType(now)),
    photoUri: c.photo?.uri,
    inputText: text || undefined,
    statedTotalGrams,
    clarification: analyzed.clarification,
    notes: analyzed.notes,
    items,
    portionHints,
  });
}
