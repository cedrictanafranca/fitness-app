import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { averageOverDays } from '@/core/nutrition/engine';
import type { DailyTotals } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { parseDateKey } from '../dates';
import { Card } from './card';
import { ProteinBars, type DayBar } from './protein-bars';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeekCard({ week, proteinTarget }: { week: DailyTotals[]; proteinTarget: number }) {
  const theme = useTheme();
  const today = week[week.length - 1]?.date;

  // averageOverDays with includeEmpty=false counts only days with logged calories.
  const loggedDays = week.filter((t) => t.consumed.calories > 0).length;
  const avgCalories = averageOverDays(week, (t) => t.consumed.calories);
  const avgProtein = averageOverDays(week, (t) => t.consumed.protein);

  const bars: DayBar[] = week.map((t) => ({
    key: t.date,
    label: WEEKDAY_SHORT[parseDateKey(t.date).getDay()],
    value: t.consumed.protein,
    isToday: t.date === today,
  }));

  return (
    <Card title="This Week">
      <View style={styles.statRow}>
        <Stat label="Avg calories" value={loggedDays > 0 ? formatInt(avgCalories) : '—'} unit="cal" color={theme.text} />
        <Stat label="Avg protein" value={loggedDays > 0 ? String(Math.round(avgProtein)) : '—'} unit="g" color={theme.text} />
        <Stat label="Days logged" value={String(loggedDays)} unit={`of ${week.length}`} color={theme.text} />
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

function Stat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Text style={[styles.statValue, { color }]}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function formatInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: Spacing.three },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 20, fontWeight: 700 },
  statUnit: { fontSize: 12, fontWeight: 500, color: '#8E8E93' },
});
