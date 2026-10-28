import { toDateKey } from '@/core/nutrition/engine';
import { loggingStreak } from '@/core/progress/stats';
import { mealsRepo } from '@/data/repos';
import { useLiveQuery } from '@/data/use-live-query';

/** Consecutive days with a logged meal, ending today or yesterday. */
export function useLoggingStreak(): number {
  const { data } = useLiveQuery(
    async () => {
      const recent = await mealsRepo.listRecent(400);
      return loggingStreak(recent.map((m) => m.date), toDateKey(new Date()));
    },
    ['meals']
  );
  return data ?? 0;
}
