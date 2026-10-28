import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface MacroPillProps {
  /** Short label, e.g. "P" or "Protein". */
  label: string;
  value: number;
  color: string;
  unit?: string;
}

/** Compact "● Protein 32 g" chip for inline macro summaries. */
export function MacroPill({ label, value, color, unit = 'g' }: MacroPillProps) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small">{`${label} ${Math.round(value * 10) / 10}${unit}`}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
