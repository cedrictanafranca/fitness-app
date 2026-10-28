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
    primary: { bg: theme.primary, fg: theme.onPrimary },
    secondary: { bg: theme.backgroundSelected, fg: theme.text },
    ghost: { bg: 'transparent', fg: theme.text },
    destructive: { bg: 'transparent', fg: theme.warning },
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
        { backgroundColor: palette.bg },
        pressed && styles.pressed,
        inactive && styles.inactive,
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
    alignSelf: 'flex-start',
  },
  regular: { minHeight: 52, paddingHorizontal: Spacing.four },
  small: { minHeight: 36, paddingHorizontal: Spacing.three },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontWeight: 600 },
  pressed: { opacity: 0.7 },
  inactive: { opacity: 0.5 },
});
