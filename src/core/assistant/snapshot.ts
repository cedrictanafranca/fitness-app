/**
 * Builds the compact database snapshot the model reasons over. Pure: the caller reads
 * the repositories and passes plain arrays in.
 */

import { dailyTotals, mealTotals, recipeNutrition, recipePerServing, shiftDateKey, toDateKey } from '../nutrition/engine';
import type { DateKey, Meal, PortionCalibration, Recipe, UserProfile } from '../types';
import { weekdayName } from './dates';
import type { AssistantSnapshot, SnapshotDay, SnapshotMeal, SnapshotRecipe } from './types';

/** Meals included in the snapshot (covers "last Tuesday" from any weekday). */
export const SNAPSHOT_MEAL_DAYS = 14;
/** Days with precomputed totals ("average protein this week"). */
export const SNAPSHOT_TOTAL_DAYS = 7;
/** Safety cap so a very busy fortnight cannot blow up the prompt. */
export const SNAPSHOT_MAX_MEALS = 120;

export interface SnapshotSource {
  now: Date;
  /** Meals within snapshotRange(); anything outside is ignored. */
  meals: Meal[];
  profile: UserProfile;
  recipes: Recipe[];
  calibrations: PortionCalibration[];
  /** Raw active calories per date, for the activity credit. Missing dates count as 0. */
  activityByDate: Record<DateKey, number>;
}

export function snapshotRange(now: Date): { from: DateKey; to: DateKey } {
  const to = toDateKey(now);
  return { from: shiftDateKey(to, -(SNAPSHOT_MEAL_DAYS - 1)), to };
}

export function mealDisplayName(meal: Pick<Meal, 'name' | 'items'>): string {
  if (meal.name?.trim()) return meal.name.trim();
  const names = meal.items.map((i) => i.name).filter(Boolean);
  return names.length ? names.join(', ') : 'Meal';
}

export function toSnapshotMeal(meal: Meal): SnapshotMeal {
  return {
    id: meal.id,
    date: meal.date,
    weekday: weekdayName(meal.date),
    mealType: meal.mealType,
    name: mealDisplayName(meal),
    items: meal.items.map((i) => ({
      id: i.id,
      name: i.name,
      grams: i.grams ?? null,
      quantity: i.quantity ?? null,
      unitLabel: i.unitLabel ?? null,
      calories: Math.round(i.totals.calories),
      protein: Math.round(i.totals.protein * 10) / 10,
      carbs: Math.round(i.totals.carbs * 10) / 10,
      fat: Math.round(i.totals.fat * 10) / 10,
      estimated: i.estimateStatus === 'estimated',
      source: i.source,
    })),
    totals: mealTotals(meal),
  };
}

export function toSnapshotRecipe(recipe: Recipe): SnapshotRecipe {
  const n = recipeNutrition(recipe.ingredients, recipe.cookedWeightG);
  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  return {
    id: recipe.id,
    name: recipe.name,
    totals: n.totals,
    per100g: {
      calories: Math.round(n.per100g.calories),
      protein: Math.round(n.per100g.protein * 10) / 10,
      carbs: Math.round(n.per100g.carbs * 10) / 10,
      fat: Math.round(n.per100g.fat * 10) / 10,
    },
    cookedWeightG: recipe.cookedWeightG ?? null,
    servings,
    perServing: servings ? recipePerServing(n, servings) : null,
  };
}

export function buildSnapshot(src: SnapshotSource): AssistantSnapshot {
  const today = toDateKey(src.now);
  const { from } = snapshotRange(src.now);
  const inRange = src.meals.filter((m) => m.date >= from && m.date <= today);
  const sorted = [...inRange].sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));

  const days: SnapshotDay[] = [];
  for (let i = 0; i < SNAPSHOT_TOTAL_DAYS; i++) {
    const date = shiftDateKey(today, -i);
    const t = dailyTotals(date, inRange, src.profile, src.activityByDate[date] ?? 0);
    days.push({
      date,
      weekday: weekdayName(date),
      consumed: t.consumed,
      remainingCalories: t.remainingCalories,
      remainingProtein: t.remainingProtein,
      mealCount: inRange.filter((m) => m.date === date).length,
    });
  }

  return {
    today,
    yesterday: shiftDateKey(today, -1),
    weekday: weekdayName(today),
    localHour: src.now.getHours(),
    units: src.profile.units,
    targets: {
      calories: src.profile.calorieTarget,
      protein: src.profile.proteinTarget,
      carbs: src.profile.carbTarget ?? null,
      fat: src.profile.fatTarget ?? null,
    },
    days,
    meals: sorted.slice(0, SNAPSHOT_MAX_MEALS).map(toSnapshotMeal),
    recipes: src.recipes.map(toSnapshotRecipe),
    calibrations: src.calibrations.map((c) => ({ name: c.name, foodName: c.foodName ?? null, grams: c.grams })),
  };
}
