import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const Tone = {
  good: '#2F9E5B',
  warn: '#C27A12',
  bad: '#D14343',
  info: '#3C87F7',
} as const;

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.text : variant === 'danger' ? 'transparent' : theme.backgroundElement;
  const fg = variant === 'primary' ? theme.background : variant === 'danger' ? Tone.bad : theme.text;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: off ? 0.4 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.text : theme.backgroundElement, opacity: disabled ? 0.4 : 1 },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.background : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
}

export function Notice({
  tone = 'info',
  title,
  children,
  actionLabel,
  onAction,
}: {
  tone?: keyof typeof Tone;
  title?: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  const color = Tone[tone];
  return (
    <View style={[styles.notice, { borderColor: color, backgroundColor: theme.backgroundElement }]}>
      {title ? (
        <ThemedText type="smallBold" style={{ color }}>
          {title}
        </ThemedText>
      ) : null}
      {typeof children === 'string' ? <ThemedText type="small">{children}</ThemedText> : children}
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <ThemedText type="smallBold" style={{ color }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: keyof typeof Tone | 'neutral' }) {
  const theme = useTheme();
  const color = tone === 'neutral' ? theme.textSecondary : Tone[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

export function TextField({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }, style]}
      {...rest}
    />
  );
}

/** SF Symbol on iOS, short text glyph elsewhere. */
export function Icon({
  name,
  fallback,
  size = 20,
  color,
}: {
  name: SymbolViewProps['name'];
  fallback: string;
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  const tint = color ?? theme.text;
  if (Platform.OS === 'ios') {
    return <SymbolView name={name} size={size} tintColor={tint} resizeMode="scaleAspectFit" />;
  }
  return <Text style={{ color: tint, fontSize: size * 0.8, fontWeight: '700' }}>{fallback}</Text>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 16, padding: Spacing.three },
  notice: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { letterSpacing: 0.6, marginTop: Spacing.three },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
