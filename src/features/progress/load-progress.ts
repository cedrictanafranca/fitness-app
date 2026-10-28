import { dailyTotals } from '@/core/nutrition/engine';
import type { DailyTotals, UserProfile, WeightRecord } from '@/core/types';
import type { Table } from '@/data/events';
import { activityRepo, mealsRepo, profileRepo, weightRepo } from '@/data/repos';

import { lastSevenDayKeys, todayKey } from './dates';

/** Tables whose writes should refresh the Progress tab. */
export const PROGRESS_TABLES: Table[] = ['meals', 'profile', 'activity_records', 'weight_records'];

export const HISTORY_LENGTH = 30;

export interface ProgressData {
  profile: UserProfile;
  currentWeight: WeightRecord | undefined;
  /** Newest first, up to HISTORY_LENGTH entries. */
  history: WeightRecord[];
  /** Mean of weight entries dated within the last seven days, or null when there are none. */
  sevenDayAverageKg: number | null;
  sevenDayEntryCount: number;
  /** One entry per day, oldest first, ending today. */
  week: DailyTotals[];
}

export async function loadProgress(): Promise<ProgressData> {
  const keys = lastSevenDayKeys(todayKey());
  const from = keys[0];
  const to = keys[keys.length - 1];

  const [profile, latest, history, meals, activityByDay] = await Promise.all([
    profileRepo.get(),
    weightRepo.list(1),
    weightRepo.list(HISTORY_LENGTH),
    mealsRepo.listRange(from, to),
    Promise.all(keys.map((k) => activityRepo.caloriesForDate(k))),
  ]);

  const week = keys.map((date, i) => dailyTotals(date, meals, profile, activityByDay[i]));

  // Each date holds at most one weight record and the list is newest first, so any entry from
  // the last seven days is within the first HISTORY_LENGTH rows.
  const recent = history.filter((w) => w.date >= from && w.date <= to);
  const sevenDayAverageKg =
    recent.length === 0 ? null : recent.reduce((sum, w) => sum + w.weightKg, 0) / recent.length;

  return {
    profile,
    currentWeight: latest[0],
    history,
    sevenDayAverageKg,
    sevenDayEntryCount: recent.length,
    week,
  };
}
