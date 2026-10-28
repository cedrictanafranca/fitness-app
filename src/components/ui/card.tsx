import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps {
  children?: ReactNode;
  /** Inner padding. Defaults to Spacing.three; pass 0 for edge-to-edge content like list rows. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, padding = Spacing.three, style, accessibilityLabel }: CardProps) {
  const theme = useTheme();
  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { backgroundColor: theme.backgroundElement, padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
});
