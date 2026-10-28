import { describe, expect, it } from 'vitest';

import { mockAssistant } from '../../server/assistant-mock';
import type { Macros, Meal, MealItem, PortionCalibration, Recipe, UserProfile } from '../types';
import { resolveDatePhrase, weekdayName } from './dates';
import {
  createIdempotencyGuard,
  previewDeleteItem,
  previewUpdateGrams,
  removeItem,
  repeatMealInput,
  timestampForDate,
  updateItemGrams,
} from './plan';
import { toProposal, withCandidate } from './proposal';
import { buildSnapshot, snapshotRange } from './snapshot';
import type { ModelAction } from './types';

const chicken: Macros = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };
const rice: Macros = { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
const shake: Macros = { calories: 120, protein: 24, carbs: 3, fat: 1.5 };

let seq = 0;
const id = () => `id-${++seq}`;

function item(mealId: string, name: string, per100g: Macros, grams: number, extra: Partial<MealItem> = {}): MealItem {
  const f = grams / 100;
  return {
    id: id(),
    mealId,
    name,
    ref: { kind: 'none' },
    grams,
    per100g,
    totals: {
      calories: Math.round(per100g.calories * f),
      protein: Math.round(per100g.protein * f * 10) / 10,
      carbs: Math.round(per100g.carbs * f * 10) / 10,
      fat: Math.round(per100g.fat * f * 10) / 10,
    },
    source: 'usda',
    estimateStatus: 'measured',
    ...extra,
  };
}

function meal(date: string, mealType: Meal['mealType'], items: (m: string) => MealItem[], name?: string): Meal {
  const mealId = id();
  return {
    id: mealId,
    date,
    timestamp: `${date}T12:00:00.000Z`,
    mealType,
    name,
    items: items(mealId),
    createdAt: '',
    updatedAt: '',
  };
}

const profile: UserProfile = {
  id: 'me',
  heightCm: 175,
  weightKg: 70,
  goal: 'recomposition',
  calorieTarget: 2500,
  proteinTarget: 145,
  units: 'metric',
  activityCreditEnabled: true,
  activityCreditPercent: 50,
  updatedAt: '',
};

// Today is Tuesday 2026-10-27 at 13:00 local.
const now = new Date(2026, 9, 27, 13, 0, 0);
const TODAY = '2026-10-27';
const YESTERDAY = '2026-10-26';
const LAST_TUESDAY = '2026-10-20';

const yesterdayLunch = meal(YESTERDAY, 'lunch', (m) => [item(m, 'chicken adobo', chicken, 200), item(m, 'white rice, cooked', rice, 150)], 'Adobo lunch');
const todayBreakfast = meal(TODAY, 'breakfast', (m) => [item(m, 'oatmeal', rice, 250), item(m, 'protein shake', shake, 300)]);
const todayDinner = meal(TODAY, 'dinner', (m) => [item(m, 'chicken breast, grilled', chicken, 200, { estimateStatus: 'estimated' }), item(m, 'white rice, cooked', rice, 180)]);
const lastTuesdayDinner = meal(LAST_TUESDAY, 'dinner', (m) => [item(m, 'salmon', chicken, 150)]);
const ancient = meal('2026-10-01', 'lunch', (m) => [item(m, 'pizza', rice, 300)]);
const meals = [yesterdayLunch, todayBreakfast, todayDinner, lastTuesdayDinner, ancient];

const adobo: Recipe = {
  id: 'r-adobo',
  name: "Mom's chicken adobo",
  ingredients: [
    { id: 'i1', name: 'chicken thigh', grams: 1000, per100g: chicken, source: 'usda', estimateStatus: 'measured' },
    { id: 'i2', name: 'soy sauce', grams: 100, per100g: { calories: 53, protein: 8, carbs: 5, fat: 0 }, source: 'usda', estimateStatus: 'measured' },
  ],
  cookedWeightG: 900,
  servings: 4,
  createdAt: '',
  updatedAt: '',
};
const scoop: PortionCalibration = { id: 'c1', name: 'scoop', foodName: 'rice', grams: 145, history: [], createdAt: '', updatedAt: '' };

const snapshot = buildSnapshot({ now, meals, profile, recipes: [adobo], calibrations: [scoop], activityByDate: { [TODAY]: 400 } });

const baseAction = (type: ModelAction['type']): ModelAction => ({
  type,
  date: null,
  mealType: null,
  name: null,
  items: null,
  sourceMealId: null,
  mealId: null,
  itemId: null,
  grams: null,
  candidates: null,
  needsConfirmation: false,
  summary: 'test',
});

describe('resolveDatePhrase', () => {
  it('handles today, yesterday and N days ago', () => {
    expect(resolveDatePhrase('what did I eat today', TODAY)).toBe(TODAY);
    expect(resolveDatePhrase('same lunch as yesterday', TODAY)).toBe(YESTERDAY);
    expect(resolveDatePhrase('3 days ago', TODAY)).toBe('2026-10-24');
  });

  it('resolves "last Tuesday" to a week ago when today is Tuesday', () => {
    expect(weekdayName(TODAY)).toBe('Tuesday');
    expect(resolveDatePhrase('What did I eat last Tuesday?', TODAY)).toBe(LAST_TUESDAY);
    expect(resolveDatePhrase('last monday', TODAY)).toBe(YESTERDAY);
    expect(resolveDatePhrase('on sunday', TODAY)).toBe('2026-10-25');
    expect(resolveDatePhrase('tuesday', TODAY)).toBe(TODAY);
  });

  it('returns null without a date phrase', () => {
    expect(resolveDatePhrase('how much protein do I still need', TODAY)).toBeNull();
  });
});

describe('buildSnapshot', () => {
  it('covers 14 days of meals, 7 days of totals and recipe nutrition', () => {
    expect(snapshotRange(now)).toEqual({ from: '2026-10-14', to: TODAY });
    expect(snapshot.meals.map((m) => m.id)).not.toContain(ancient.id);
    expect(snapshot.meals).toHaveLength(4);
    expect(snapshot.meals[0].date).toBe(TODAY); // newest first
    expect(snapshot.days).toHaveLength(7);
    expect(snapshot.days[0].date).toBe(TODAY);
    expect(snapshot.weekday).toBe('Tuesday');
    expect(snapshot.meals.find((m) => m.id === lastTuesdayDinner.id)?.weekday).toBe('Tuesday');
  });

  it('computes remaining protein/calories with the engine, including activity credit', () => {
    const today = snapshot.days[0];
    // breakfast: oatmeal 325 + shake 360 = 685; dinner: chicken 330 + rice 234 = 564 → 1249 kcal
    expect(today.consumed.calories).toBe(1249);
    expect(today.remainingCalories).toBe(2500 + 200 - 1249);
    // protein: 6.8 + 72 + 62 + 4.9 = 145.7
    expect(today.remainingProtein).toBeCloseTo(145 - 145.7, 5);
  });

  it('exposes recipe totals, per 100 g and per serving', () => {
    const r = snapshot.recipes[0];
    expect(r.name).toBe("Mom's chicken adobo");
    expect(r.totals.calories).toBe(1703);
    expect(r.per100g.calories).toBe(189);
    expect(r.perServing?.calories).toBe(426);
    expect(snapshot.calibrations).toEqual([{ name: 'scoop', foodName: 'rice', grams: 145 }]);
  });
});

describe('toProposal', () => {
  it('builds repeat_meal from a snapshot meal id and defaults date/mealType', () => {
    const r = toProposal({ ...baseAction('repeat_meal'), sourceMealId: yesterdayLunch.id }, snapshot);
    expect(r.ok && r.proposal.action).toEqual({ type: 'repeat_meal', sourceMealId: yesterdayLunch.id, date: TODAY, mealType: 'lunch' });
    expect(r.ok && r.proposal.needsConfirmation).toBe(false);
  });

  it('rejects unknown ids and future dates are clamped to today', () => {
    expect(toProposal({ ...baseAction('repeat_meal'), sourceMealId: 'nope' }, snapshot).ok).toBe(false);
    const r = toProposal({ ...baseAction('repeat_meal'), sourceMealId: yesterdayLunch.id, date: '2030-01-01' }, snapshot);
    expect(r.ok && r.proposal.action.type === 'repeat_meal' && r.proposal.action.date).toBe(TODAY);
  });

  it('validates update_item_grams and infers the item of a single-item meal', () => {
    const r = toProposal({ ...baseAction('update_item_grams'), mealId: lastTuesdayDinner.id, grams: 250 }, snapshot);
    expect(r.ok && r.proposal.action).toEqual({
      type: 'update_item_grams',
      mealId: lastTuesdayDinner.id,
      itemId: lastTuesdayDinner.items[0].id,
      grams: 250,
    });
    expect(toProposal({ ...baseAction('update_item_grams'), mealId: todayDinner.id, grams: 250 }, snapshot).ok).toBe(false);
    expect(toProposal({ ...baseAction('update_item_grams'), mealId: todayDinner.id, itemId: todayDinner.items[0].id, grams: -5 }, snapshot).ok).toBe(false);
  });

  it('always confirms deletions and surfaces multiple candidates', () => {
    const one = toProposal({ ...baseAction('delete_item'), mealId: todayBreakfast.id, itemId: todayBreakfast.items[1].id }, snapshot);
    expect(one.ok && one.proposal.needsConfirmation).toBe(true);
    expect(one.ok && one.proposal.candidates).toEqual([]);

    const many = toProposal(
      {
        ...baseAction('delete_item'),
        candidates: [
          { mealId: todayDinner.id, itemId: todayDinner.items[1].id },
          { mealId: yesterdayLunch.id, itemId: yesterdayLunch.items[1].id },
          { mealId: 'ghost', itemId: 'x' },
          { mealId: todayDinner.id, itemId: todayDinner.items[1].id },
        ],
      },
      snapshot
    );
    expect(many.ok && many.proposal.candidates).toHaveLength(2);
    expect(many.ok && many.proposal.needsConfirmation).toBe(true);
    // Picking a candidate re-targets the action and clears the choice.
    const picked = many.ok ? withCandidate(many.proposal, { mealId: yesterdayLunch.id, itemId: yesterdayLunch.items[1].id }) : null;
    expect(picked?.action).toEqual({ type: 'delete_item', mealId: yesterdayLunch.id, itemId: yesterdayLunch.items[1].id });
    expect(picked?.candidates).toEqual([]);
  });

  it('cleans log_meal items and only keeps real recipe matches', () => {
    const r = toProposal(
      {
        ...baseAction('log_meal'),
        mealType: 'lunch',
        items: [
          { name: ' adobo ', grams: 200, quantity: null, unitLabel: null, recipeMatch: "Mom's chicken adobo", estimatedPer100g: null },
          { name: 'rice', grams: null, quantity: 2, unitLabel: 'scoops', recipeMatch: 'Imaginary', estimatedPer100g: { calories: 5000, protein: 0, carbs: 0, fat: 0 } },
          { name: '', grams: 10, quantity: null, unitLabel: null, recipeMatch: null, estimatedPer100g: null },
        ],
      },
      snapshot
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.proposal.action.type !== 'log_meal') throw new Error('expected log_meal');
    expect(r.proposal.action.items).toEqual([
      { name: 'adobo', grams: 200, quantity: null, unitLabel: null, recipeMatch: "Mom's chicken adobo", estimatedPer100g: null },
      { name: 'rice', grams: null, quantity: 2, unitLabel: 'scoops', recipeMatch: null, estimatedPer100g: null },
    ]);
    expect(toProposal({ ...baseAction('log_meal'), mealType: 'lunch', items: [] }, snapshot).ok).toBe(false);
  });
});

describe('planners', () => {
  it('repeatMealInput copies items with fresh ids onto the target day', () => {
    const input = repeatMealInput(yesterdayLunch, TODAY, 'lunch', now, id);
    expect(input.date).toBe(TODAY);
    expect(input.timestamp).toBe(now.toISOString());
    expect(input.items).toHaveLength(2);
    expect(input.items.map((i) => i.id)).not.toContain(yesterdayLunch.items[0].id);
    expect(input.items[0].totals).toEqual(yesterdayLunch.items[0].totals);
    expect(input.name).toBe('Adobo lunch');
  });

  it('timestampForDate uses a typical hour for past days', () => {
    const ts = new Date(timestampForDate(YESTERDAY, 'dinner', now));
    expect(ts.getDate()).toBe(26);
    expect(ts.getHours()).toBe(19);
  });

  it('updateItemGrams recomputes totals and reports before/after', () => {
    const chickenItem = todayDinner.items[0];
    const change = updateItemGrams(todayDinner, chickenItem.id, 250);
    expect(change.before.calories).toBe(564);
    expect(change.after.calories).toBe(413 + 234);
    const updated = change.items.find((i) => i.id === chickenItem.id)!;
    expect(updated.grams).toBe(250);
    expect(updated.totals.protein).toBe(77.5);
    expect(updated.estimateStatus).toBe('measured'); // typed weight counts as measured
    const preview = previewUpdateGrams(todayDinner, change, 250);
    expect(preview.lines[0]).toBe('chicken breast, grilled · 200 g → 250 g');
    expect(preview.before?.calories).toBe(564);
    expect(preview.after?.calories).toBe(647);
    expect(() => updateItemGrams(todayDinner, 'missing', 10)).toThrow();
    expect(() => updateItemGrams(todayDinner, chickenItem.id, 0)).toThrow(RangeError);
  });

  it('removeItem drops the item and the preview zeroes when the meal becomes empty', () => {
    const shakeItem = todayBreakfast.items[1];
    const change = removeItem(todayBreakfast, shakeItem.id);
    expect(change.items).toHaveLength(1);
    expect(change.after.calories).toBe(325);
    expect(previewDeleteItem(todayBreakfast, change).after?.calories).toBe(325);
    const last = removeItem(lastTuesdayDinner, lastTuesdayDinner.items[0].id);
    expect(last.items).toHaveLength(0);
    expect(previewDeleteItem(lastTuesdayDinner, last).after).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('idempotency guard claims a key once and can release it after a failure', () => {
    const g = createIdempotencyGuard();
    expect(g.tryClaim('turn-1')).toBe(true);
    expect(g.tryClaim('turn-1')).toBe(false);
    expect(g.has('turn-1')).toBe(true);
    g.release('turn-1');
    expect(g.tryClaim('turn-1')).toBe(true);
  });
});

describe('offline mock assistant (the six PRD commands)', () => {
  const ask = (content: string) => mockAssistant([{ role: 'user', content }], snapshot);

  it('answers remaining protein from the snapshot', () => {
    const r = ask('How much protein do I still need?');
    expect(r.action).toBeNull();
    expect(r.reply).toMatch(/protein target/);
  });

  it('proposes repeating yesterday lunch', () => {
    const r = ask('Log the same lunch as yesterday');
    expect(r.action?.type).toBe('repeat_meal');
    expect(r.action?.sourceMealId).toBe(yesterdayLunch.id);
    expect(toProposal(r.action!, snapshot).ok).toBe(true);
  });

  it('proposes removing the protein shake (confirmed)', () => {
    const r = ask('Remove the protein shake I logged earlier');
    expect(r.action?.type).toBe('delete_item');
    expect(r.action?.mealId).toBe(todayBreakfast.id);
    expect(r.action?.itemId).toBe(todayBreakfast.items[1].id);
    const p = toProposal(r.action!, snapshot);
    expect(p.ok && p.proposal.needsConfirmation).toBe(true);
  });

  it('proposes changing dinner from 200 g to 250 g', () => {
    const r = ask('Change my dinner from 200 g to 250 g');
    expect(r.action?.type).toBe('update_item_grams');
    expect(r.action?.mealId).toBe(todayDinner.id);
    expect(r.action?.itemId).toBe(todayDinner.items[0].id);
    expect(r.action?.grams).toBe(250);
  });

  it('lists last Tuesday meals', () => {
    const r = ask('What did I eat last Tuesday?');
    expect(r.action).toBeNull();
    expect(r.reply).toContain(LAST_TUESDAY);
    expect(r.reply).toContain('salmon');
  });

  it('reports recipe calories', () => {
    const r = ask("How many calories were in Mom's chicken adobo?");
    expect(r.action).toBeNull();
    expect(r.reply).toContain('1703 kcal');
    expect(r.reply).toContain('Per serving: 426 kcal');
  });
});
