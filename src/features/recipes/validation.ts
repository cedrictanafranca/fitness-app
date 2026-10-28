import type { Macros } from '@/core/types';

import { parseNum } from './format';

export interface Per100Fields {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const EMPTY_PER100: Per100Fields = { calories: '', protein: '', carbs: '', fat: '' };

export function per100ToFields(m: Macros | undefined): Per100Fields {
  if (!m) return EMPTY_PER100;
  const t = (n: number) => String(Math.round(n * 100) / 100);
  return { calories: t(m.calories), protein: t(m.protein), carbs: t(m.carbs), fat: t(m.fat) };
}

/**
 * Parse per-100 g text fields. Calories are required; blank protein/carbs/fat count as 0.
 * Rejects physically impossible values so a typo can't poison every log.
 */
export function parsePer100(f: Per100Fields): { value?: Macros; error?: string } {
  const calories = parseNum(f.calories);
  if (calories == null) return { error: 'Enter calories per 100 g.' };
  const protein = f.protein.trim() === '' ? 0 : parseNum(f.protein);
  const carbs = f.carbs.trim() === '' ? 0 : parseNum(f.carbs);
  const fat = f.fat.trim() === '' ? 0 : parseNum(f.fat);
  if (protein == null || carbs == null || fat == null) return { error: 'Macros must be numbers.' };
  if ([calories, protein, carbs, fat].some((n) => n < 0)) return { error: 'Values cannot be negative.' };
  if (calories > 902) return { error: 'Calories per 100 g cannot exceed 902 (pure fat). Check for a typo.' };
  if (protein + carbs + fat > 100.5) return { error: 'Protein + carbs + fat cannot exceed 100 g per 100 g.' };
  return { value: { calories, protein, carbs, fat } };
}
