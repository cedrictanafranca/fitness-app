import { describe, expect, it } from 'vitest';

import type { Macros, Meal, MealItem, PortionCalibration, RecipeIngredient } from '../types';
import {
  averageOverDays,
  dailyTotals,
  findCalibration,
  gramsFromCalibration,
  inferMealType,
  itemTotals,
  per100gFromTotals,
  recipeNutrition,
  recipePerServing,
  resolveGrams,
  scaleMacros,
  shiftDateKey,
  toDateKey,
} from './engine';

const chicken: Macros = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };
const rice: Macros = { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
const oil: Macros = { calories: 884, protein: 0, carbs: 0, fat: 100 };

function item(partial: Partial<MealItem> & { totals: Macros }): MealItem {
  return {
    id: 'i',
    mealId: 'm',
    name: 'x',
    ref: { kind: 'none' },
    per100g: partial.totals,
    source: 'custom',
    estimateStatus: 'measured',
    ...partial,
  };
}

function meal(date: string, items: MealItem[]): Meal {
  return {
    id: `m-${date}-${Math.random()}`,
    date,
    timestamp: `${date}T12:00:00`,
    mealType: 'lunch',
    items,
    createdAt: '',
    updatedAt: '',
  };
}

const profile = {
  calorieTarget: 2500,
  proteinTarget: 145,
  activityCreditEnabled: true,
  activityCreditPercent: 50,
};

describe('scaleMacros / itemTotals', () => {
  it('scales per-100g values linearly', () => {
    expect(scaleMacros(chicken, 200)).toEqual({ calories: 330, protein: 62, carbs: 0, fat: 7.2 });
  });

  it('rounds item totals for display', () => {
    expect(itemTotals(rice, 145)).toEqual({ calories: 189, protein: 3.9, carbs: 40.6, fat: 0.4 });
  });

  it('rejects negative grams', () => {
    expect(() => scaleMacros(rice, -1)).toThrow(RangeError);
  });
});

describe('resolveGrams', () => {
  it('prefers explicit grams over quantity', () => {
    expect(resolveGrams({ grams: 300, quantity: 2 }, 145)).toBe(300);
  });
  it('falls back to quantity × unit grams', () => {
    expect(resolveGrams({ quantity: 2 }, 145)).toBe(290);
  });
  it('returns null with no basis', () => {
    expect(resolveGrams({ quantity: 2 })).toBeNull();
  });
});

describe('recipeNutrition', () => {
  const ingredients: RecipeIngredient[] = [
    { id: '1', name: 'chicken', grams: 1000, per100g: chicken, source: 'usda', estimateStatus: 'measured' },
    { id: '2', name: 'oil', grams: 30, per100g: oil, source: 'usda', estimateStatus: 'estimated' },
  ];

  it('sums raw ingredient totals', () => {
    const n = recipeNutrition(ingredients);
    expect(n.rawWeightG).toBe(1030);
    expect(n.totals).toEqual({ calories: 1915, protein: 310, carbs: 0, fat: 66 });
    expect(n.hasEstimates).toBe(true);
  });

  it('uses cooked weight for per-100g when provided', () => {
    const n = recipeNutrition(ingredients, 800);
    expect(n.basis).toBe('cooked');
    expect(n.per100g.calories).toBeCloseTo(239.4, 1);
    expect(n.per100g.protein).toBeCloseTo(38.75, 2);
  });

  it('uses raw weight when cooked weight is unknown', () => {
    const n = recipeNutrition(ingredients);
    expect(n.basis).toBe('raw');
    expect(n.per100g.calories).toBeCloseTo(185.9, 1);
  });

  it('scales a logged portion from cooked per-100g', () => {
    const n = recipeNutrition(ingredients, 800);
    expect(itemTotals(n.per100g, 250)).toEqual({ calories: 599, protein: 96.9, carbs: 0, fat: 20.6 });
  });

  it('computes per serving', () => {
    const n = recipeNutrition(ingredients, 800);
    expect(recipePerServing(n, 4)).toEqual({ calories: 479, protein: 77.5, carbs: 0, fat: 16.5 });
  });

  it('per100gFromTotals rejects zero weight', () => {
    expect(() => per100gFromTotals(chicken, 0)).toThrow(RangeError);
  });
});

describe('portion calibration', () => {
  const scoopRice: PortionCalibration = {
    id: 'a', name: 'scoop', foodName: 'rice', grams: 145, history: [], createdAt: '', updatedAt: '',
  };
  const scoopGeneric: PortionCalibration = {
    id: 'b', name: 'scoop', grams: 60, history: [], createdAt: '', updatedAt: '',
  };

  it('multiplies quantity by calibrated grams', () => {
    expect(gramsFromCalibration(2, scoopRice)).toBe(290);
  });

  it('prefers food-specific calibration and handles plurals', () => {
    const c = findCalibration([scoopGeneric, scoopRice], 'scoops', 'white rice');
    expect(c?.id).toBe('a');
  });

  it('falls back to generic when the food has no calibration', () => {
    const c = findCalibration([scoopGeneric, scoopRice], 'scoop', 'protein powder');
    expect(c?.id).toBe('b');
  });

  it('returns undefined when the only match belongs to another food', () => {
    expect(findCalibration([scoopRice], 'scoop', 'protein powder')).toBeUndefined();
  });
});

describe('dailyTotals', () => {
  const day = '2026-10-27';
  const meals = [
    meal(day, [item({ totals: { calories: 1000, protein: 60, carbs: 100, fat: 30 } })]),
    meal(day, [item({ totals: { calories: 750, protein: 35, carbs: 80, fat: 25 }, estimateStatus: 'estimated' })]),
    meal('2026-10-26', [item({ totals: { calories: 999, protein: 99, carbs: 0, fat: 0 } })]),
  ];

  it('aggregates only the requested day', () => {
    const t = dailyTotals(day, meals, profile, 0);
    expect(t.consumed).toEqual({ calories: 1750, protein: 95, carbs: 180, fat: 55 });
    expect(t.remainingCalories).toBe(750);
    expect(t.remainingProtein).toBe(50);
    expect(t.hasEstimates).toBe(true);
  });

  it('credits a percentage of activity calories', () => {
    const t = dailyTotals(day, meals, profile, 600);
    expect(t.activityCalories).toBe(600);
    expect(t.creditedActivityCalories).toBe(300);
    expect(t.remainingCalories).toBe(1050);
  });

  it('ignores activity when credit is disabled', () => {
    const t = dailyTotals(day, meals, { ...profile, activityCreditEnabled: false }, 600);
    expect(t.creditedActivityCalories).toBe(0);
    expect(t.remainingCalories).toBe(750);
  });

  it('clamps the credit percentage', () => {
    const t = dailyTotals(day, meals, { ...profile, activityCreditPercent: 250 }, 100);
    expect(t.creditedActivityCalories).toBe(100);
  });

  it('reflects updates to a meal item', () => {
    const edited = meals.map((m, i) =>
      i === 0 ? { ...m, items: [item({ totals: { calories: 1200, protein: 70, carbs: 100, fat: 30 } })] } : m
    );
    expect(dailyTotals(day, edited, profile).consumed.calories).toBe(1950);
  });

  it('averages across logged days only by default', () => {
    const a = dailyTotals(day, meals, profile);
    const b = dailyTotals('2026-10-26', meals, profile);
    const empty = dailyTotals('2026-10-25', meals, profile);
    expect(averageOverDays([a, b, empty], (t) => t.consumed.protein)).toBe(97);
    expect(averageOverDays([a, b, empty], (t) => t.consumed.protein, true)).toBeCloseTo(64.7, 1);
  });
});

describe('dates', () => {
  it('infers meal type by hour', () => {
    expect(inferMealType(new Date(2026, 0, 1, 8))).toBe('breakfast');
    expect(inferMealType(new Date(2026, 0, 1, 13))).toBe('lunch');
    expect(inferMealType(new Date(2026, 0, 1, 19))).toBe('dinner');
    expect(inferMealType(new Date(2026, 0, 1, 23))).toBe('snack');
  });

  it('formats and shifts local date keys', () => {
    expect(toDateKey(new Date(2026, 9, 27))).toBe('2026-10-27');
    expect(shiftDateKey('2026-10-27', -1)).toBe('2026-10-26');
    expect(shiftDateKey('2026-10-31', 1)).toBe('2026-11-01');
  });
});
