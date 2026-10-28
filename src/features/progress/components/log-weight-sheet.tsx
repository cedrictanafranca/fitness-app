import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import type { Units } from '@/core/types';
import { toDateKey } from '@/core/nutrition/engine';
import { weightRepo } from '@/data/repos';
import { FieldInput } from '@/features/settings/components/field-input';
import { DANGER_COLOR } from '@/features/settings/components/colors';
import { parseNumber, unitsToKg, weightUnitLabel } from '@/features/settings/units';
import { useTheme } from '@/hooks/use-theme';

import { isValidDateKey, parseDateKey, todayKey } from '../dates';

export function LogWeightSheet({
  visible,
  units,
  onClose,
}: {
  visible: boolean;
  units: Units;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      {/* Mounted only while open so every opening starts with a fresh form. */}
      {visible ? <LogWeightForm units={units} onDone={onClose} /> : null}
    </Modal>
  );
}

function LogWeightForm({ units, onDone }: { units: Units; onDone: () => void }) {
  const theme = useTheme();
  const label = weightUnitLabel(units);
  const [weightText, setWeightText] = useState('');
  const [dateText, setDateText] = useState(() => todayKey());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weightError = weightText.trim() !== '' && !isPositive(weightText) ? 'Enter a number greater than 0' : undefined;
  const dateError = dateText.trim() === '' || !isValidDateKey(dateText) ? 'Use the format YYYY-MM-DD' : undefined;
  const futureError = !dateError && dateText > todayKey() ? 'Date cannot be in the future' : undefined;

  const save = async () => {
    const value = parseNumber(weightText);
    if (value == null || value <= 0) {
      setError(`Enter your weight in ${label}`);
      return;
    }
    if (dateError || futureError) {
      setError(dateError ?? futureError ?? 'Check the date');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const date = parseDateKey(dateText);
      await weightRepo.logForDate(toDateKey(date), unitsToKg(value, units));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save weight');
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && weightText.trim() !== '' && !weightError && !dateError && !futureError;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
          <Text style={[styles.headerAction, { color: theme.textSecondary }]}>Cancel</Text>
        </Pressable>
        <ThemedText type="smallBold">Log weight</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={() => void save()}
          hitSlop={8}>
          <Text style={[styles.headerAction, { color: canSave ? theme.text : theme.textSecondary }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <FieldInput
          label={`Weight (${label})`}
          suffix={label}
          placeholder={units === 'imperial' ? 'e.g. 149' : 'e.g. 67.6'}
          value={weightText}
          onChangeText={setWeightText}
          error={weightError}
        />
        <FieldInput
          label="Date"
          numeric={false}
          placeholder="YYYY-MM-DD"
          value={dateText}
          onChangeText={setDateText}
          error={dateError ?? futureError}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function isPositive(text: string): boolean {
  const n = parseNumber(text);
  return n != null && n > 0;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  error: {
    color: DANGER_COLOR,
    fontSize: 14,
    lineHeight: 20,
  },
});
