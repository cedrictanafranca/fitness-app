import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { weightRepo } from '@/data/repos';
import { formatWeight } from '@/features/settings/units';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfile, WeightRecord } from '@/core/types';

import { formatDateLabel } from '../dates';

const PREVIEW_ROWS = 3;

/** "Current Weight" card: big value, log button, black timeline bar with the start and 7-day average. */
export function WeightCard({
  profile,
  currentWeight,
  history,
  sevenDayAverageKg,
  sevenDayEntryCount,
  onLogWeight,
}: {
  profile: UserProfile;
  currentWeight: WeightRecord | undefined;
  history: WeightRecord[];
  sevenDayAverageKg: number | null;
  sevenDayEntryCount: number;
  onLogWeight: () => void;
}) {
  const theme = useTheme();
  const { units } = profile;
  const [showAll, setShowAll] = useState(false);
  const start = history[history.length - 1];
  const rows = showAll ? history : history.slice(0, PREVIEW_ROWS);

  return (
    <Card padding={Spacing.three + Spacing.one} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.summaryBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            Current Weight
          </ThemedText>
          <Text style={[styles.bigValue, { color: theme.text }]}>
            {currentWeight ? formatWeight(currentWeight.weightKg, units) : '—'}
          </Text>
          <ThemedText type="small" themeColor="textSecondary">
            {currentWeight ? formatDateLabel(currentWeight.date) : 'No entries yet'}
          </ThemedText>
        </View>
        <Button label="Log weight" small onPress={onLogWeight} />
      </View>

      <View style={[styles.bar, { backgroundColor: theme.text }]} />
      <View style={styles.barLabels}>
        <ThemedText type="small" themeColor="textSecondary">
          Start: <ThemedText type="smallBold">{start ? formatWeight(start.weightKg, units) : '—'}</ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          7-day avg:{' '}
          <ThemedText type="smallBold">{sevenDayAverageKg != null ? formatWeight(sevenDayAverageKg, units) : '—'}</ThemedText>
          {sevenDayEntryCount > 0 ? ` (${sevenDayEntryCount})` : ''}
        </ThemedText>
      </View>

      {history.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Log your weight to start tracking.
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {rows.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} units={units} />
          ))}
          {history.length > PREVIEW_ROWS ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} style={styles.toggle} hitSlop={6}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {showAll ? 'Show fewer' : `Show all ${history.length} entries`}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function HistoryRow({ entry, units }: { entry: WeightRecord; units: UserProfile['units'] }) {
  const theme = useTheme();
  const label = formatDateLabel(entry.date);
  const value = formatWeight(entry.weightKg, units);

  const confirmDelete = () => {
    Alert.alert('Delete entry?', `Remove ${value} on ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void weightRepo.remove(entry.id).catch((e: unknown) => {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.');
          });
        },
      },
    ]);
  };

  return (
    <View style={[styles.row, { borderTopColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rowDate}>
        {label}
      </ThemedText>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete weight entry for ${label}`}
        hitSlop={8}
        onPress={confirmDelete}>
        <Text style={[styles.deleteLabel, { color: theme.warning }]}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  summaryBlock: { flex: 1, gap: 2 },
  bigValue: { fontSize: 30, fontWeight: 700, lineHeight: 36, letterSpacing: -0.3 },
  bar: { height: 6, borderRadius: Radius.pill },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.two },
  list: { marginTop: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  rowDate: { flex: 1 },
  rowValue: { fontSize: 15, fontWeight: 600 },
  deleteLabel: { fontSize: 14, fontWeight: 600 },
  toggle: { paddingTop: Spacing.two, alignSelf: 'center' },
});
