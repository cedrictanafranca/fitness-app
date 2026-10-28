import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { averageOverDays } from '@/core/nutrition/engine';
import type { DailyTotals } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { CALORIE_COLOR, PROTEIN_COLOR } from '../palette';
import { weekdayInitial } from '../dates';
import { Card } from './card';
import { ProteinBars, type DayBar } from './protein-bars';

export function WeekCard({ week, proteinTarget }: { week: DailyTotals[]; proteinTarget: number }) {
  const theme = useTheme();
  const today = week[week.length - 1]?.date;

  // averageOverDays with includeEmpty=false counts only days with logged calories.
  const loggedDays = week.filter((t) => t.consumed.calories > 0).length;
  const avgCalories = averageOverDays(week, (t) => t.consumed.calories);
  const avgProtein = averageOverDays(week, (t) => t.consumed.protein);

  const bars: DayBar[] = week.map((t) => ({
    key: t.date,
    label: weekdayInitial(t.date),
    value: t.consumed.protein,
    isToday: t.date === today,
  }));

  return (
    <Card title="This week" caption="Last 7 days">
      <View style={styles.statRow}>
        <Stat label="Avg calories" value={loggedDays > 0 ? `${formatInt(avgCalories)} kcal` : '—'} color={CALORIE_COLOR} />
        <Stat label="Avg protein" value={loggedDays > 0 ? `${Math.round(avgProtein)} g` : '—'} color={PROTEIN_COLOR} />
        <Stat label="Days logged" value={`${loggedDays} of ${week.length}`} color={theme.text} />
      </View>

      {loggedDays === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing logged this week yet.
        </ThemedText>
      ) : null}

      <ProteinBars days={bars} target={proteinTarget} />
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function formatInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
});
