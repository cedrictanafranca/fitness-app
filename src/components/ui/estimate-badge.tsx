import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { EstimateStatus } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

export interface EstimateBadgeProps {
  /** 'estimated' renders a visible amber badge; 'measured' a quiet neutral one. */
  status: EstimateStatus;
  /** Replace the default label ("Estimated" / "Measured"). */
  label?: string;
  /** Hide the badge entirely when measured (useful in dense lists). */
  hideWhenMeasured?: boolean;
}

export function EstimateBadge({ status, label, hideWhenMeasured = false }: EstimateBadgeProps) {
  const theme = useTheme();
  if (status === 'measured' && hideWhenMeasured) return null;
  const estimated = status === 'estimated';
  const color = estimated ? theme.carbs : theme.textSecondary;
  const text = label ?? (estimated ? 'Estimated' : 'Measured');

  return (
    <View style={[styles.badge, { borderColor: color }]} accessibilityLabel={text}>
      <View style={[styles.dot, { backgroundColor: color }, !estimated && styles.hollow]} />
      <ThemedText type="small" style={[styles.text, { color }]}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  hollow: { opacity: 0.5 },
  text: { fontSize: 11, lineHeight: 16, fontWeight: 600 },
});
