import { StyleSheet, View } from 'react-native';

import type { MealType } from '@/core/types';
import { Spacing } from '@/constants/theme';

import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../format';
import { Chip } from './ui';

export function MealTypeChips({ value, onChange }: { value: MealType; onChange: (m: MealType) => void }) {
  return (
    <View style={styles.row}>
      {MEAL_TYPES.map((m) => (
        <Chip key={m} label={MEAL_TYPE_LABELS[m]} selected={value === m} onPress={() => onChange(m)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two } });
