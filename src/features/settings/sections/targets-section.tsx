import { FieldInput } from '../components/field-input';
import { SettingsSection } from '../components/settings-section';
import type { DraftErrors, SetDraftField, SettingsDraft } from '../draft';

export function TargetsSection({
  draft,
  errors,
  onField,
}: {
  draft: SettingsDraft;
  errors: DraftErrors;
  onField: SetDraftField;
}) {
  return (
    <SettingsSection title="Nutrition goals">
      <FieldInput
        label="Calories"
        suffix="kcal"
        value={draft.calorieTarget}
        onChangeText={(t) => onField('calorieTarget', t)}
        error={errors.calorieTarget}
      />
      <FieldInput
        label="Protein"
        suffix="g"
        value={draft.proteinTarget}
        onChangeText={(t) => onField('proteinTarget', t)}
        error={errors.proteinTarget}
      />
      <FieldInput
        label="Carbs (optional)"
        suffix="g"
        value={draft.carbTarget}
        onChangeText={(t) => onField('carbTarget', t)}
        error={errors.carbTarget}
      />
      <FieldInput
        label="Fat (optional)"
        suffix="g"
        value={draft.fatTarget}
        onChangeText={(t) => onField('fatTarget', t)}
        error={errors.fatTarget}
      />
    </SettingsSection>
  );
}
