import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { FitnessGoal, Units } from '@/core/types';
import type { DraftErrors, SetDraftField, SettingsDraft } from '../draft';
import { FieldInput } from '../components/field-input';
import { OptionChips, SegmentedControl, type Option } from '../components/option-pickers';
import { SettingsSection } from '../components/settings-section';
import { weightUnitLabel } from '../units';

const UNIT_OPTIONS: Option<Units>[] = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
];

const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { value: 'muscle_gain', label: 'Build muscle' },
  { value: 'fat_loss', label: 'Lose fat' },
  { value: 'recomposition', label: 'Body recomposition' },
  { value: 'maintenance', label: 'Maintain' },
];

export function ProfileSection({
  draft,
  errors,
  onField,
  onUnits,
}: {
  draft: SettingsDraft;
  errors: DraftErrors;
  onField: SetDraftField;
  onUnits: (units: Units) => void;
}) {
  return (
    <SettingsSection title="Profile">
      <SegmentedControl options={UNIT_OPTIONS} value={draft.units} onChange={onUnits} />

      {draft.units === 'metric' ? (
        <FieldInput
          label="Height"
          suffix="cm"
          value={draft.heightCm}
          onChangeText={(t) => onField('heightCm', t)}
          error={errors.heightCm}
        />
      ) : (
        <View style={styles.pair}>
          <FieldInput
            label="Height, feet"
            suffix="ft"
            flex={1}
            value={draft.heightFt}
            onChangeText={(t) => onField('heightFt', t)}
            error={errors.heightFt}
          />
          <FieldInput
            label="Inches"
            suffix="in"
            flex={1}
            value={draft.heightIn}
            onChangeText={(t) => onField('heightIn', t)}
            error={errors.heightIn}
          />
        </View>
      )}

      <FieldInput
        label={`Weight (${weightUnitLabel(draft.units)})`}
        suffix={weightUnitLabel(draft.units)}
        value={draft.weight}
        onChangeText={(t) => onField('weight', t)}
        error={errors.weight}
      />

      <FieldInput
        label="Age (optional)"
        suffix="yrs"
        value={draft.age}
        onChangeText={(t) => onField('age', t)}
        error={errors.age}
      />

      <View style={styles.stack}>
        <ThemedText type="small" themeColor="textSecondary">
          Goal
        </ThemedText>
        <OptionChips options={GOAL_OPTIONS} value={draft.goal} onChange={(g) => onField('goal', g)} />
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    gap: 12,
  },
  stack: {
    gap: 8,
  },
});
