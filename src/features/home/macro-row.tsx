import { StyleSheet, View } from 'react-native';

import { MacroCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { DailyTotals } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

export function MacroRow({ totals }: { totals: DailyTotals }) {
  const theme = useTheme();
  const { consumed, targets } = totals;
  return (
    <View style={styles.row}>
      <MacroCard prominent label="Protein" consumed={consumed.protein} target={targets.protein} color={theme.protein} />
      <MacroCard label="Carbs" consumed={consumed.carbs} target={targets.carbs} color={theme.carbs} />
      <MacroCard label="Fat" consumed={consumed.fat} target={targets.fat} color={theme.fat} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
});
