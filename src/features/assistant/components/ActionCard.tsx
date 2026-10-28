import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, EstimateBadge } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { ActionCandidate } from '@/core/assistant';
import type { Macros } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import type { ProposalState } from '../store';

interface ActionCardProps {
  state: ProposalState;
  onConfirm: () => void;
  onDismiss: () => void;
  onChoose: (candidate: ActionCandidate) => void;
}

const STATUS_LABEL: Record<ProposalState['status'], string> = {
  choose: 'Which one?',
  preparing: 'Checking your log…',
  pending: 'Confirm this change',
  applying: 'Applying…',
  applied: 'Applied',
  dismissed: 'Not applied',
  failed: 'Could not apply',
};

function fmt(m: Macros): string {
  return `${Math.round(m.calories)} kcal · ${Math.round(m.protein * 10) / 10} g protein`;
}

/** Shows what an assistant action will change (or changed) with before/after totals. */
export function ActionCard({ state, onConfirm, onDismiss, onChoose }: ActionCardProps) {
  const theme = useTheme();
  const { status, prepared, proposal, error, candidateLabels } = state;
  const preview = prepared?.preview;
  const tone =
    status === 'applied' ? '#2F9E5B' : status === 'failed' ? theme.warning : status === 'dismissed' ? theme.textSecondary : theme.text;
  const busy = status === 'preparing' || status === 'applying';

  return (
    <View
      accessibilityLabel={`${STATUS_LABEL[status]}: ${proposal.summary}`}
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: status === 'pending' || status === 'choose' ? theme.text : 'transparent' }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={{ color: tone }}>
          {STATUS_LABEL[status]}
        </ThemedText>
        {busy ? <ActivityIndicator size="small" color={theme.textSecondary} /> : null}
      </View>
      <ThemedText style={styles.title}>{preview?.title ?? proposal.summary}</ThemedText>

      {status === 'choose' ? (
        <View style={styles.options}>
          {candidateLabels.map(({ candidate, label }) => (
            <Pressable
              key={`${candidate.mealId}:${candidate.itemId ?? ''}`}
              accessibilityRole="button"
              onPress={() => onChoose(candidate)}
              style={({ pressed }) => [styles.option, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
              <ThemedText type="small">{label}</ThemedText>
            </Pressable>
          ))}
          <Button label="Never mind" variant="ghost" small onPress={onDismiss} />
        </View>
      ) : null}

      {preview ? (
        <View style={styles.body}>
          {preview.lines.map((line, i) => (
            <ThemedText key={i} type="small" themeColor="textSecondary">
              {line}
            </ThemedText>
          ))}
          <View style={styles.totals}>
            {preview.before ? (
              <ThemedText type="small" themeColor="textSecondary">
                {`Before: ${fmt(preview.before)}`}
              </ThemedText>
            ) : null}
            {preview.after ? (
              <ThemedText type="small">{`${preview.before ? 'After' : 'Adds'}: ${fmt(preview.after)}`}</ThemedText>
            ) : null}
          </View>
          {preview.estimated ? <EstimateBadge status="estimated" label="Includes estimates" /> : null}
          {prepared && prepared.blockers.length > 0 ? (
            <ThemedText type="small" style={{ color: theme.warning }}>
              {`No weight for ${prepared.blockers.join(', ')} — tell me the grams and I'll log it.`}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {error}
        </ThemedText>
      ) : null}

      {status === 'pending' ? (
        <View style={styles.actions}>
          <Button
            label={proposal.action.type.startsWith('delete') ? 'Delete' : 'Apply'}
            small
            onPress={onConfirm}
            disabled={!prepared || prepared.blockers.length > 0}
          />
          <Button label="Cancel" variant="ghost" small onPress={onDismiss} />
        </View>
      ) : null}
      {status === 'failed' && prepared ? (
        <View style={styles.actions}>
          <Button label="Try again" variant="secondary" small onPress={onConfirm} />
          <Button label="Dismiss" variant="ghost" small onPress={onDismiss} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.three, gap: Spacing.two, marginRight: Spacing.five },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 700 },
  body: { gap: Spacing.one },
  totals: { marginTop: Spacing.one, gap: Spacing.half },
  options: { gap: Spacing.two },
  option: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + Spacing.half, borderRadius: Radius.md },
  pressed: { opacity: 0.6 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
