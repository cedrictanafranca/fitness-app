import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { resetDatabase } from '@/data/db';
import { notify, type Table } from '@/data/events';

import { DANGER_COLOR } from '../components/colors';
import { SettingsSection } from '../components/settings-section';

/** Every table a live query might depend on. resetDatabase() does not notify, so we do it here. */
const ALL_TABLES: Table[] = [
  'profile',
  'foods',
  'recipes',
  'recipe_batches',
  'meals',
  'calibrations',
  'weight_records',
  'activity_records',
];

async function runReset() {
  try {
    await resetDatabase();
    ALL_TABLES.forEach(notify);
  } catch (e) {
    Alert.alert('Reset failed', e instanceof Error ? e.message : 'Something went wrong. Please try again.');
  }
}

function confirmReset() {
  Alert.alert(
    'Reset all data?',
    'This permanently deletes every meal, recipe, food, weight and activity record, and restores default settings. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void runReset() },
    ]
  );
}

export function DataSection() {
  return (
    <SettingsSection title="Data">
      <ThemedText type="small" themeColor="textSecondary">
        Everything is stored on this device.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={confirmReset} style={styles.button}>
        <Text style={styles.buttonLabel}>Reset all data</Text>
      </Pressable>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 4,
  },
  buttonLabel: {
    color: DANGER_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});
