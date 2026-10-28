import { ThemedText } from '@/components/themed-text';

import { StepperRow } from '../components/stepper-row';
import { SettingsSection } from '../components/settings-section';
import { SwitchRow } from '../components/switch-row';
import type { SetDraftField, SettingsDraft } from '../draft';

const CREDIT_STEP = 10;

export function ActivitySection({ draft, onField }: { draft: SettingsDraft; onField: SetDraftField }) {
  return (
    <SettingsSection title="Activity">
      <SwitchRow
        label="Add activity credit"
        helper="Add a share of Apple Health active calories back to your daily allowance. Baseline activity is already in your target, so 50% avoids double counting."
        value={draft.activityCreditEnabled}
        onValueChange={(v) => onField('activityCreditEnabled', v)}
      />
      <StepperRow
        label="Credit share"
        value={draft.activityCreditPercent}
        min={0}
        max={100}
        step={CREDIT_STEP}
        disabled={!draft.activityCreditEnabled}
        format={(v) => `${v}%`}
        onChange={(v) => onField('activityCreditPercent', v)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Apple Health sync arrives in a later phase.
      </ThemedText>
    </SettingsSection>
  );
}
