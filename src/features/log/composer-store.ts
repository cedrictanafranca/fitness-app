import { inferMealType } from '@/core/nutrition/engine';
import type { MealType } from '@/core/types';
import type { CapturedPhoto } from '@/services/camera';

import { createStore } from './store';

/** State of the composer on the Log tab; kept at module level so the capture screen can fill it. */
export interface Composer {
  photo: CapturedPhoto | null;
  text: string;
  gramsText: string;
  mealType: MealType;
  mealTypeTouched: boolean;
}

export function emptyComposer(): Composer {
  return { photo: null, text: '', gramsText: '', mealType: inferMealType(new Date()), mealTypeTouched: false };
}

export const composerStore = createStore<Composer>(emptyComposer());
export const useComposer = () => composerStore.use();
export const updateComposer = (patch: Partial<Composer>) => composerStore.set((c) => ({ ...c, ...patch }));
export const resetComposer = () => composerStore.set(emptyComposer());

export function parseGrams(text: string): number | undefined {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
}
