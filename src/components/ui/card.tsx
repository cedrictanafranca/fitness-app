import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardVariant = 'elevated' | 'flat' | 'outlined';

export interface CardProps {
  children?: ReactNode;
  /** Inner padding. Defaults to Spacing.three; pass 0 for edge-to-edge content like list rows. */
  padding?: number;
  /**
   * elevated: white with a soft shadow (the reference's main card).
   * flat: light grey, no shadow (secondary rows).
   * outlined: white with a hairline border (form rows, totals).
   */
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, padding = Spacing.three, variant = 'elevated', style, accessibilityLabel }: CardProps) {
  const theme = useTheme();
  const surface =
    variant === 'flat'
      ? { backgroundColor: theme.backgroundElement }
      : variant === 'outlined'
        ? { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
        : { backgroundColor: theme.surface, ...Elevation.card };
  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, surface, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg },
});
