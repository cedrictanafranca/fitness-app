/**
 * Deterministic nutrition engine. Pure functions only.
 * The AI identifies foods and quantities; this module does every calculation.
 */

import type {
  DailyTotals,
  DateKey,
  Macros,
  Meal,
  MealItem,
  PortionCalibration,
  RecipeIngredient,
  UserProfile,
} from '../types';
import { ZERO_MACROS } from '../types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function roundMacros(m: Macros): Macros {
  return {
    calories: Math.round(m.calories),
    protein: round1(m.protein),
    carbs: round1(m.carbs),
    fat: round1(m.fat),
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(addMacros, { ...ZERO_MACROS });
}

/** Scale per-100 g values to an arbitrary gram weight. */
export function scaleMacros(per100g: Macros, grams: number): Macros {
  if (!Number.isFinite(grams) || grams < 0) {
    throw new RangeError(`grams must be a non-negative number, got ${grams}`);
  }
  const f = grams / 100;
  return {
    calories: per100g.calories * f,
    protein: per100g.protein * f,
    carbs: per100g.carbs * f,
    fat: per100g.fat * f,
  };
}

/** Per-100 g values from a known total and the weight it represents. */
export function per100gFromTotals(totals: Macros, totalGrams: number): Macros {
  if (!Number.isFinite(totalGrams) || totalGrams <= 0) {
    throw new RangeError(`totalGrams must be positive, got ${totalGrams}`);
  }
  const f = 100 / totalGrams;
  return {
    calories: totals.calories * f,
    protein: totals.protein * f,
    carbs: totals.carbs * f,
    fat: totals.fat * f,
  };
}

/**
 * Resolve the grams for a meal item. Priority: explicit grams → quantity × unit grams.
 * Returns null when neither is available.
 */
export function resolveGrams(
  item: Pick<MealItem, 'grams' | 'quantity' | 'unitLabel'>,
  unitGrams?: number
): number | null {
  if (item.grams != null && item.grams >= 0) return item.grams;
  if (item.quantity != null && unitGrams != null) return item.quantity * unitGrams;
  return null;
}

/** Totals for a meal item given its resolved grams. */
export function itemTotals(per100g: Macros, grams: number): Macros {
  return roundMacros(scaleMacros(per100g, grams));
}

// ---------- Recipes ----------

export interface RecipeNutrition {
  rawWeightG: number;
  totals: Macros;
  /** Per 100 g of cooked food when cookedWeightG is known, else per 100 g raw. */
  per100g: Macros;
  basis: 'cooked' | 'raw';
  hasEstimates: boolean;
}

export function recipeNutrition(
  ingredients: RecipeIngredient[],
  cookedWeightG?: number
): RecipeNutrition {
  const rawWeightG = ingredients.reduce((s, i) => s + i.grams, 0);
  const totals = sumMacros(ingredients.map((i) => scaleMacros(i.per100g, i.grams)));
  const useCooked = cookedWeightG != null && cookedWeightG > 0;
  const basisWeight = useCooked ? cookedWeightG : rawWeightG;
  const per100g = basisWeight > 0 ? per100gFromTotals(totals, basisWeight) : { ...ZERO_MACROS };
  return {
    rawWeightG,
    totals: roundMacros(totals),
    per100g,
    basis: useCooked ? 'cooked' : 'raw',
    hasEstimates: ingredients.some((i) => i.estimateStatus === 'estimated'),
  };
}

/** Nutrition for one serving when the recipe declares a servings count. */
export function recipePerServing(nutrition: RecipeNutrition, servings: number): Macros {
  if (!Number.isFinite(servings) || servings <= 0) {
    throw new RangeError(`servings must be positive, got ${servings}`);
  }
  return roundMacros({
    calories: nutrition.totals.calories / servings,
    protein: nutrition.totals.protein / servings,
    carbs: nutrition.totals.carbs / servings,
    fat: nutrition.totals.fat / servings,
  });
}

// ---------- Portion calibration ----------

/** "2 scoops" with a 145 g scoop → 290 g. */
export function gramsFromCalibration(quantity: number, calibration: PortionCalibration): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError(`quantity must be non-negative, got ${quantity}`);
  }
  return quantity * calibration.grams;
}

/**
 * Pick the best calibration for a unit name + food. Food-specific wins over generic;
 * never share a "scoop" between different foods unless no food-specific one exists.
 */
export function findCalibration(
  calibrations: PortionCalibration[],
  unitLabel: string,
  foodName?: string
): PortionCalibration | undefined {
  const unit = normalizeUnit(unitLabel);
  const matches = calibrations.filter((c) => normalizeUnit(c.name) === unit);
  if (foodName) {
    const food = foodName.toLowerCase();
    const specific = matches.find((c) => c.foodName && food.includes(c.foodName.toLowerCase()));
    if (specific) return specific;
  }
  return matches.find((c) => !c.foodName);
}

export function normalizeUnit(label: string): string {
  return label.trim().toLowerCase().replace(/s$/, '');
}

/** Rolling average of calibration samples, newest weighted equally. */
export function calibrationAverage(samples: { grams: number }[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((s, x) => s + x.grams, 0) / samples.length;
}

// ---------- Daily aggregation ----------

export function mealTotals(meal: Pick<Meal, 'items'>): Macros {
  return roundMacros(sumMacros(meal.items.map((i) => i.totals)));
}

/**
 * Remaining = base target + credited activity − consumed.
 * Activity credit is applied as a percentage so baseline expenditure is not double-counted.
 */
export function dailyTotals(
  date: DateKey,
  meals: Meal[],
  profile: Pick<
    UserProfile,
    | 'calorieTarget'
    | 'proteinTarget'
    | 'carbTarget'
    | 'fatTarget'
    | 'activityCreditEnabled'
    | 'activityCreditPercent'
  >,
  activityCalories = 0
): DailyTotals {
  const dayMeals = meals.filter((m) => m.date === date);
  const consumed = roundMacros(sumMacros(dayMeals.map(mealTotals)));
  const credited = profile.activityCreditEnabled
    ? Math.round((activityCalories * clampPercent(profile.activityCreditPercent)) / 100)
    : 0;
  return {
    date,
    consumed,
    targets: {
      calories: profile.calorieTarget,
      protein: profile.proteinTarget,
      carbs: profile.carbTarget,
      fat: profile.fatTarget,
    },
    activityCalories,
    creditedActivityCalories: credited,
    remainingCalories: profile.calorieTarget + credited - consumed.calories,
    remainingProtein: round1(profile.proteinTarget - consumed.protein),
    hasEstimates: dayMeals.some((m) => m.items.some((i) => i.estimateStatus === 'estimated')),
  };
}

function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

/** Average of a metric over the given days; days with no meals count as zero when includeEmpty is true. */
export function averageOverDays(
  totalsByDay: DailyTotals[],
  pick: (t: DailyTotals) => number,
  includeEmpty = false
): number {
  const rows = includeEmpty ? totalsByDay : totalsByDay.filter((t) => t.consumed.calories > 0);
  if (rows.length === 0) return 0;
  return round1(rows.reduce((s, t) => s + pick(t), 0) / rows.length);
}

// ---------- Meal type inference ----------

/** Default meal type from local hour; the user can override. */
export function inferMealType(date: Date): Meal['mealType'] {
  const h = date.getHours();
  if (h < 10.5) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

/** Local-timezone YYYY-MM-DD. */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toDateKey(dt);
}
