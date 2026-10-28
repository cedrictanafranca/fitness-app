/**
 * Pure planners for assistant actions: given the affected Meal(s) they return the exact
 * repository writes plus before/after totals for the action card. No I/O.
 */

import { withGrams } from '../nutrition/build';
import { mealTotals, roundMacros, sumMacros, toDateKey } from '../nutrition/engine';
import type { DateKey, Macros, Meal, MealItem, MealType } from '../types';
import { ZERO_MACROS } from '../types';
import { parseDateKey } from './dates';
import { mealDisplayName } from './snapshot';

export interface ChangePreview {
  title: string;
  /** Item-level lines, e.g. "Chicken adobo · 200 g → 250 g". */
  lines: string[];
  before: Macros | null;
  after: Macros | null;
  /** Any affected item is an estimate. */
  estimated: boolean;
}

/** Typical local hour for a meal type, used when logging onto a past date. */
const MEAL_HOURS: Record<MealType, number> = { breakfast: 8, lunch: 12, dinner: 19, snack: 16 };

/** Timestamp for a meal logged on `date`: now for today, a typical hour for past days. */
export function timestampForDate(date: DateKey, mealType: MealType, now: Date): string {
  if (date === toDateKey(now)) return now.toISOString();
  const d = parseDateKey(date);
  d.setHours(MEAL_HOURS[mealType], 0, 0, 0);
  return d.toISOString();
}

export type NewMeal = Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>;

/** Copy a meal's items (fresh ids, snapshot nutrition kept) onto another date/meal type. */
export function repeatMealInput(source: Meal, date: DateKey, mealType: MealType, now: Date, newId: () => string): NewMeal {
  return {
    date,
    timestamp: timestampForDate(date, mealType, now),
    mealType,
    name: source.name,
    inputText: source.inputText,
    items: source.items.map((i) => ({ ...i, id: newId(), mealId: '' })),
  };
}

export interface ItemChange {
  items: MealItem[];
  item: MealItem;
  before: Macros;
  after: Macros;
}

/** "Actually it was 250 g": re-derive one item's totals; a typed weight counts as measured. */
export function updateItemGrams(meal: Meal, itemId: string, grams: number): ItemChange {
  const item = meal.items.find((i) => i.id === itemId);
  if (!item) throw new Error('That item is no longer in the meal.');
  if (!Number.isFinite(grams) || grams <= 0) throw new RangeError('Weight must be a positive number of grams.');
  const next = withGrams(item, grams);
  const updated: MealItem = { ...next, estimateStatus: item.source === 'ai_estimate' ? 'estimated' : 'measured' };
  const items = meal.items.map((i) => (i.id === itemId ? updated : i));
  return { items, item, before: mealTotals(meal), after: mealTotals({ items }) };
}

export function removeItem(meal: Meal, itemId: string): ItemChange {
  const item = meal.items.find((i) => i.id === itemId);
  if (!item) throw new Error('That item is no longer in the meal.');
  const items = meal.items.filter((i) => i.id !== itemId);
  return { items, item, before: mealTotals(meal), after: mealTotals({ items }) };
}

export function itemsTotals(items: MealItem[]): Macros {
  return roundMacros(sumMacros(items.map((i) => i.totals)));
}

export function formatAmount(item: Pick<MealItem, 'grams' | 'quantity' | 'unitLabel'>): string {
  if (item.grams != null) return `${Math.round(item.grams * 10) / 10} g`;
  if (item.quantity != null) return item.unitLabel ? `${item.quantity} ${item.unitLabel}` : String(item.quantity);
  return '';
}

export function previewRepeat(source: Meal, date: DateKey, mealType: MealType): ChangePreview {
  const totals = mealTotals(source);
  return {
    title: `Log "${mealDisplayName(source)}" as ${mealType} on ${date}`,
    lines: source.items.map((i) => `${i.name} · ${formatAmount(i)}`),
    before: null,
    after: totals,
    estimated: source.items.some((i) => i.estimateStatus === 'estimated'),
  };
}

export function previewLog(items: MealItem[], date: DateKey, mealType: MealType, name: string | null): ChangePreview {
  return {
    title: `Log ${name ? `"${name}"` : 'a meal'} as ${mealType} on ${date}`,
    lines: items.map((i) => `${i.name} · ${formatAmount(i) || 'weight needed'}`),
    before: null,
    after: itemsTotals(items),
    estimated: items.some((i) => i.estimateStatus === 'estimated'),
  };
}

export function previewUpdateGrams(meal: Meal, change: ItemChange, grams: number): ChangePreview {
  return {
    title: `Update ${meal.mealType} · ${mealDisplayName(meal)}`,
    lines: [`${change.item.name} · ${formatAmount(change.item) || '?'} → ${grams} g`],
    before: change.before,
    after: change.after,
    estimated: change.item.source === 'ai_estimate',
  };
}

export function previewDeleteItem(meal: Meal, change: ItemChange): ChangePreview {
  return {
    title: `Remove from ${meal.mealType} · ${mealDisplayName(meal)}`,
    lines: [`${change.item.name} · ${formatAmount(change.item)}`],
    before: change.before,
    after: change.items.length ? change.after : { ...ZERO_MACROS },
    estimated: change.item.estimateStatus === 'estimated',
  };
}

export function previewDeleteMeal(meal: Meal): ChangePreview {
  return {
    title: `Delete ${meal.mealType} · ${mealDisplayName(meal)}`,
    lines: meal.items.map((i) => `${i.name} · ${formatAmount(i)}`),
    before: mealTotals(meal),
    after: { ...ZERO_MACROS },
    estimated: meal.items.some((i) => i.estimateStatus === 'estimated'),
  };
}

/**
 * Idempotency guard: an action key (one per assistant turn) can be claimed exactly once.
 * `release` lets a failed commit be retried.
 */
export interface IdempotencyGuard {
  tryClaim(key: string): boolean;
  release(key: string): void;
  has(key: string): boolean;
}

export function createIdempotencyGuard(): IdempotencyGuard {
  const claimed = new Set<string>();
  return {
    tryClaim(key) {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    release(key) {
      claimed.delete(key);
    },
    has: (key) => claimed.has(key),
  };
}
