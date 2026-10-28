import { useMemo } from 'react';

import { dailyTotals } from '@/core/nutrition/engine';
import type { DailyTotals, DateKey, Meal, UserProfile } from '@/core/types';
import { DEFAULT_PROFILE, activityRepo, mealsRepo, profileRepo } from '@/data/repos';
import { useLiveQuery } from '@/data/use-live-query';

export interface DailySummary {
  meals: Meal[];
  profile: UserProfile;
  totals: DailyTotals;
  /** True until the first read for this date has completed. */
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

interface Snapshot {
  date: DateKey;
  meals: Meal[];
  profile: UserProfile;
  activityCalories: number;
}

/** Meals, profile and activity credit for one day, re-read whenever those tables change. */
export function useDailySummary(date: DateKey): DailySummary {
  const { data, error, refresh } = useLiveQuery<Snapshot>(
    async () => {
      const [meals, profile, activityCalories] = await Promise.all([
        mealsRepo.listByDate(date),
        profileRepo.get(),
        activityRepo.caloriesForDate(date),
      ]);
      return { date, meals, profile, activityCalories };
    },
    ['meals', 'profile', 'activity_records'],
    [date]
  );

  // Ignore a snapshot that belongs to a previously selected day while the new one loads.
  const current = data?.date === date ? data : undefined;
  const meals = current?.meals;
  const profile = current?.profile ?? DEFAULT_PROFILE;
  const activityCalories = current?.activityCalories ?? 0;

  const totals = useMemo(
    () => dailyTotals(date, meals ?? [], profile, activityCalories),
    [date, meals, profile, activityCalories]
  );

  return {
    meals: meals ?? EMPTY_MEALS,
    profile,
    totals,
    loading: current == null && error == null,
    error: current == null ? error : null,
    refresh,
  };
}

const EMPTY_MEALS: Meal[] = [];
