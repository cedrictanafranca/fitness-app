import { StyleSheet, View } from 'react-native';

import { Card, Ring } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DailyTotals } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { formatNumber } from './format';

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
      accessibilityLabel={`${formatNumber(Math.abs(remainingCalories))} calories ${over ? 'over' : 'remaining'}`}>
      <View style={styles.row}>
        <View style={styles.left}>
          <ThemedText style={[styles.number, over && { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatNumber(Math.abs(remainingCalories))}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {over ? 'Calories over' : 'Calories remaining'}
          </ThemedText>
        </View>
        <Ring size={116} stroke={13} progress={progress} color={accent}>
          <ThemedText type="smallBold">{`${Math.round(progress * 100)}%`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.ringCaption}>
            eaten
          </ThemedText>
        </Ring>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.breakdown}>
        {`${formatNumber(targets.calories)} target`}
        {creditedActivityCalories > 0 ? ` + ${formatNumber(creditedActivityCalories)} activity` : ''}
        {` − ${formatNumber(consumed.calories)} eaten`}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  left: { flex: 1, gap: Spacing.one },
  number: { fontSize: 52, lineHeight: 58, fontWeight: 700 },
  ringCaption: { fontSize: 11, lineHeight: 14 },
  breakdown: { marginTop: Spacing.three },
});
