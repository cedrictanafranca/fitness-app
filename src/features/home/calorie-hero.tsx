import { StyleSheet, View } from 'react-native';

import { Card, Icon, Ring } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { DailyTotals } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { formatNumber } from './format';

/** Big "calories left" number on the left, thick black ring with a flame on the right. */
export function CalorieHero({ totals }: { totals: DailyTotals }) {
  const theme = useTheme();
  const { remainingCalories, creditedActivityCalories, consumed, targets } = totals;
  const over = remainingCalories < 0;
  const allowance = targets.calories + creditedActivityCalories;
  const progress = allowance > 0 ? consumed.calories / allowance : 0;
  const accent = over ? theme.warning : theme.calories;

  return (
    <Card
      padding={Spacing.four}
      accessibilityLabel={`${formatNumber(Math.abs(remainingCalories))} calories ${over ? 'over' : 'left'}. ${formatNumber(targets.calories)} target${creditedActivityCalories > 0 ? `, plus ${formatNumber(creditedActivityCalories)} from activity` : ''}, ${formatNumber(consumed.calories)} eaten.`}>
      <View style={styles.row}>
        <View style={styles.left}>
          <ThemedText style={[styles.number, over && { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatNumber(Math.abs(remainingCalories))}
          </ThemedText>
          <View style={styles.captionRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {over ? 'Calories over' : 'Calories left'}
            </ThemedText>
            {creditedActivityCalories > 0 ? (
              <View style={[styles.credit, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="run" size={12} strokeWidth={2.2} color={theme.text} />
                <ThemedText style={styles.creditText}>{`+${formatNumber(creditedActivityCalories)}`}</ThemedText>
              </View>
            ) : null}
          </View>
        </View>
        <Ring size={112} stroke={13} progress={progress} color={accent}>
          <Icon name="flame" size={32} filled color={theme.text} />
        </Ring>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  left: { flex: 1, gap: Spacing.one },
  number: { fontSize: 46, lineHeight: 52, fontWeight: 700, letterSpacing: -0.5 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  credit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  creditText: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
});
