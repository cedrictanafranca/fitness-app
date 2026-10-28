import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { weightRepo } from '@/data/repos';
import { formatWeight } from '@/features/settings/units';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfile, WeightRecord } from '@/core/types';

import { formatDateLabel } from '../dates';
import { Card } from './card';

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

  return (
    <Card title="Weight" caption={`Last ${history.length} entries`}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            Current
          </ThemedText>
          <Text style={[styles.bigValue, { color: theme.text }]}>
            {currentWeight ? formatWeight(currentWeight.weightKg, units) : '—'}
          </Text>
          <ThemedText type="small" themeColor="textSecondary">
            {currentWeight ? formatDateLabel(currentWeight.date) : 'No entries yet'}
          </ThemedText>
        </View>
        <View style={styles.summaryBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            7-day avg
          </ThemedText>
          <Text style={[styles.bigValue, { color: theme.text }]}>
            {sevenDayAverageKg != null ? formatWeight(sevenDayAverageKg, units) : '—'}
          </Text>
          <ThemedText type="small" themeColor="textSecondary">
            {sevenDayEntryCount === 0
              ? 'No entries this week'
              : `${sevenDayEntryCount} ${sevenDayEntryCount === 1 ? 'entry' : 'entries'}`}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onLogWeight}
        style={[styles.primaryButton, { backgroundColor: theme.text }]}>
        <Text style={[styles.primaryLabel, { color: theme.background }]}>Log weight</Text>
      </Pressable>

      {history.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Log your weight to start tracking.
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {history.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} units={units} />
          ))}
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
    <View style={[styles.row, { borderTopColor: theme.backgroundSelected }]}>
      <ThemedText type="default" style={styles.rowDate}>
        {label}
      </ThemedText>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete weight entry for ${label}`}
        hitSlop={8}
        onPress={confirmDelete}>
        <Text style={styles.deleteLabel}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryBlock: {
    flex: 1,
    gap: 4,
  },
  bigValue: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  primaryButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowDate: {
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteLabel: {
    color: '#D92D20',
    fontSize: 14,
    fontWeight: '600',
  },
});
