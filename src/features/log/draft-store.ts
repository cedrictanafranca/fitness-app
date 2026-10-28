/**
 * In-memory draft of the meal being reviewed/edited. The Log tab, search, and review
 * screens all read/write this so no meal data travels through route params.
 */

import { sumMacros, roundMacros, inferMealType } from '@/core/nutrition/engine';
import { withGrams } from '@/core/nutrition/build';
import { distributePlateWeight, scaleGrams, type TypicalPortion } from '@/core/nutrition/portions';
import type { Macros, Meal, MealItem, MealType } from '@/core/types';
import { ZERO_MACROS } from '@/core/types';
import { newId } from '@/data/ids';

import { createStore } from './store';

export interface LogDraft {
  /** Set only in EDIT mode (opened with `mealId`). */
  mealId?: string;
  /** Preserved from the original meal in EDIT mode. */
  date?: string;
  timestamp?: string;
  name: string;
  mealType: MealType;
  photoUri?: string;
  inputText?: string;
  /** Whole-plate weight the user measured (display only; never split across items). */
  statedTotalGrams?: number;
  /** AI follow-up question, shown as a notice. */
  clarification: string | null;
  notes: string | null;
  items: MealItem[];
  /** "You usually log 180 g" per draft item id, from measured history. Display only. */
  portionHints?: Record<string, TypicalPortion>;
}

export function emptyDraft(patch: Partial<LogDraft> = {}): LogDraft {
  return {
    name: '',
    mealType: inferMealType(new Date()),
    clarification: null,
    notes: null,
    items: [],
    ...patch,
  };
}

export const draftStore = createStore<LogDraft>(emptyDraft());

export const useDraft = () => draftStore.use();
export const getDraft = () => draftStore.get();

/** Replace the draft entirely (new flow). */
export function resetDraft(patch: Partial<LogDraft> = {}) {
  draftStore.set(emptyDraft(patch));
}

export function updateDraft(patch: Partial<LogDraft>) {
  draftStore.set((d) => ({ ...d, ...patch }));
}

export function addDraftItem(item: MealItem) {
  draftStore.set((d) => ({ ...d, items: [...d.items, item] }));
}

export function removeDraftItem(id: string) {
  draftStore.set((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
}

/**
 * User edited an item's weight. A typed weight counts as measured (unless the nutrition
 * itself is an AI estimate). `undefined`/invalid clears the weight so the user must fill it.
 */
export function setDraftItemGrams(id: string, grams: number | undefined) {
  draftStore.set((d) => ({
    ...d,
    items: d.items.map((i) => {
      if (i.id !== id) return i;
      if (grams == null || !Number.isFinite(grams) || grams < 0) {
        return { ...i, grams: undefined, quantity: undefined, unitLabel: undefined, totals: { ...ZERO_MACROS } };
      }
      const next = withGrams(i, grams);
      return {
        ...next,
        estimateStatus: i.source === 'ai_estimate' ? 'estimated' : 'measured',
        gramsRange: undefined,
        portionBasis: undefined,
      };
    }),
  }));
}

/**
 * The user adjusted an estimate without weighing ("more like 1½ of that", "my usual
 * portion"): the item stays estimated and its range moves with it.
 */
export function setDraftItemEstimate(id: string, grams: number, basis: string) {
  draftStore.set((d) => ({
    ...d,
    items: d.items.map((i) => {
      if (i.id !== id || !(grams > 0)) return i;
      const factor = i.grams && i.grams > 0 ? grams / i.grams : 1;
      const range = i.gramsRange
        ? { low: scaleGrams(i.gramsRange.low, factor), high: scaleGrams(i.gramsRange.high, factor) }
        : undefined;
      return { ...withGrams(i, grams), estimateStatus: 'estimated', gramsRange: range, portionBasis: basis };
    }),
  }));
}

export function scaleDraftItemGrams(id: string, factor: number) {
  const item = draftStore.get().items.find((i) => i.id === id);
  if (!item || item.grams == null || !(item.grams > 0)) return;
  setDraftItemEstimate(id, scaleGrams(item.grams, factor), `${item.portionBasis ?? 'estimate'}, adjusted`);
}

/**
 * Split the weighed plate across the items in proportion to their current estimates.
 * The parts are still estimates (PRD 3.2: a clearly-labeled approximate breakdown).
 */
export function applyPlateSplit() {
  const d = draftStore.get();
  const total = d.statedTotalGrams;
  if (total == null || !(total > 0) || d.items.length < 2) return;
  const parts = distributePlateWeight(d.items.map((i) => i.grams ?? null), total);
  draftStore.set((s) => ({
    ...s,
    items: s.items.map((i, idx) => ({
      ...withGrams(i, parts[idx]),
      estimateStatus: 'estimated',
      gramsRange: undefined,
      portionBasis: `share of the ${Math.round(total)} g plate`,
    })),
  }));
}

/** Load an existing meal for editing. */
export function loadMealIntoDraft(meal: Meal) {
  draftStore.set({
    mealId: meal.id,
    date: meal.date,
    timestamp: meal.timestamp,
    name: meal.name ?? '',
    mealType: meal.mealType,
    photoUri: meal.photoUri,
    inputText: meal.inputText,
    clarification: null,
    notes: null,
    items: meal.items,
  });
}

/** "Repeat a recent meal": copy items into a fresh draft with new ids. */
export function startDraftFromMeal(meal: Meal, mealType: MealType) {
  resetDraft({
    mealType,
    name: meal.name ?? '',
    items: meal.items.map((i) => ({ ...i, id: newId(), mealId: '' })),
  });
}

export function draftTotals(items: MealItem[]): Macros {
  return roundMacros(sumMacros(items.map((i) => i.totals)));
}

/** Items still lacking a usable weight. */
export function itemsMissingGrams(items: MealItem[]): MealItem[] {
  return items.filter((i) => i.grams == null || !(i.grams > 0));
}

export function defaultMealName(items: MealItem[]): string {
  return items.map((i) => i.name).join(', ');
}
