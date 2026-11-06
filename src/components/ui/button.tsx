import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner and ignores presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional element rendered before the label (e.g. an icon). */
  leading?: ReactNode;
  /** Compact height for inline actions. */
  small?: boolean;
  /** Stretch to the container width. Defaults to false. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Pill buttons from the reference: solid black primary (grey when disabled, still white text),
 * white outlined secondary, text-only ghost / destructive.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leading,
  small = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: inactive ? theme.primaryDisabled : theme.primary, fg: theme.onPrimary, border: 'transparent' },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.text, border: 'transparent' },
    destructive: { bg: 'transparent', fg: theme.warning, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.regular,
        fullWidth && styles.fullWidth,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && variant !== 'primary' && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {leading}
          <ThemedText type={small ? 'smallBold' : 'default'} style={[styles.label, { color: palette.fg }]}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  regular: { minHeight: 56, paddingHorizontal: Spacing.four },
  small: { minHeight: 38, paddingHorizontal: Spacing.three },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontWeight: 600 },
  pressed: { opacity: 0.75 },
  inactive: { opacity: 0.5 },
});
