/** Pure progress statistics: logging streak, BMI, weight change over windows. */

import { shiftDateKey } from '../nutrition/engine';
import type { DateKey, WeightRecord } from '../types';

/**
 * Consecutive days with at least one logged meal, counting back from today. A streak is
 * still alive when today has nothing yet but yesterday does (the day is not over).
 */
export function loggingStreak(datesWithMeals: Iterable<DateKey>, today: DateKey): number {
  const days = new Set(datesWithMeals);
  let cursor = days.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export function bmi(weightKg: number, heightCm: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new RangeError(`weightKg must be positive, got ${weightKg}`);
  if (!Number.isFinite(heightCm) || heightCm <= 0) throw new RangeError(`heightCm must be positive, got ${heightCm}`);
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export const BMI_BANDS: readonly { category: BmiCategory; label: string; min: number; max: number }[] = [
  { category: 'underweight', label: 'Underweight', min: 0, max: 18.5 },
  { category: 'healthy', label: 'Healthy', min: 18.5, max: 25 },
  { category: 'overweight', label: 'Overweight', min: 25, max: 30 },
  { category: 'obese', label: 'Obese', min: 30, max: 40 },
];

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}

export interface WeightChange {
  days: number;
  /** kg now minus kg at the start of the window; null when no entry exists at or before the window start. */
  deltaKg: number | null;
}

/**
 * Change in weight over the last N days: latest entry minus the most recent entry dated at or
 * before `today - days`. History may be in any order.
 */
export function weightChanges(history: WeightRecord[], today: DateKey, windows: readonly number[] = [7, 30, 90]): WeightChange[] {
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = sorted[sorted.length - 1];
  return windows.map((days) => {
    if (!latest) return { days, deltaKg: null };
    const start = shiftDateKey(today, -days);
    const base = [...sorted].reverse().find((w) => w.date <= start);
    if (!base || base.id === latest.id) return { days, deltaKg: null };
    return { days, deltaKg: Math.round((latest.weightKg - base.weightKg) * 10) / 10 };
  });
}

/** Trend points for a chart: entries within the last `days` (null = all), oldest first. */
export function weightTrend(history: WeightRecord[], today: DateKey, days: number | null): WeightRecord[] {
  const from = days == null ? null : shiftDateKey(today, -days);
  return [...history]
    .filter((w) => from == null || w.date >= from)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
