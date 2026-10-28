import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { mealTotals } from '@/core/nutrition/engine';
import type { Meal } from '@/core/types';
import { mealsRepo } from '@/data/repos';

import { MEAL_TYPE_LABELS, errorMessage } from '../format';
import { Sheet, SheetRow } from './Sheet';
import { Notice } from './ui';

export function RecentMealsSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (meal: Meal) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Repeat a recent meal">
      {visible ? <RecentList onPick={onPick} /> : null}
    </Sheet>
  );
}

function RecentList({ onPick }: { onPick: (meal: Meal) => void }) {
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mealsRepo
      .listRecent(10)
      .then((m) => !cancelled && setMeals(m))
      .catch((e) => !cancelled && setError(errorMessage(e, 'Could not load recent meals.')));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {error ? <Notice tone="bad">{error}</Notice> : null}
      {meals == null && !error ? <ThemedText type="small" themeColor="textSecondary">Loading…</ThemedText> : null}
      {meals?.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No meals logged yet.
        </ThemedText>
      ) : null}
      {meals?.map((m) => {
        const t = mealTotals(m);
        const title = m.name || m.items.map((i) => i.name).join(', ') || 'Meal';
        return (
          <SheetRow
            key={m.id}
            title={title}
            subtitle={`${m.date} · ${MEAL_TYPE_LABELS[m.mealType]} · ${Math.round(t.calories)} kcal · ${Math.round(t.protein)} g protein`}
            onPress={() => onPick(m)}
          />
        );
      })}
    </>
  );
}
