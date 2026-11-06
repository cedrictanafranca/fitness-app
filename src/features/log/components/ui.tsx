import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const Tone = {
  good: '#4DAE65',
  warn: '#D9A441',
  bad: '#D9534F',
  info: '#5E8DEA',
} as const;

type ButtonVariant = 'primary' | 'secondary' | 'danger';

/** Pill button: solid black (grey when disabled), white outlined secondary, red-text danger. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  leading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const off = disabled || loading;
  const bg =
    variant === 'primary' ? (off ? theme.primaryDisabled : theme.primary) : variant === 'danger' ? 'transparent' : theme.surface;
  const fg = variant === 'primary' ? theme.onPrimary : variant === 'danger' ? Tone.bad : theme.text;
  const border = variant === 'secondary' ? theme.border : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.8 : off && variant !== 'primary' ? 0.5 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonContent}>
          {leading}
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Outline pill chip; black when selected (duration presets, meal types, nutrition basis). */
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
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.text,
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Flat light-grey card (item rows, suggestions). */
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
    <View style={[styles.notice, { borderLeftColor: color, backgroundColor: theme.backgroundElement }]}>
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

/** Bold section heading ("Meal Items", "Set intensity"), optionally with an icon before it. */
export function SectionLabel({ children, icon }: { children: string; icon?: ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      {icon}
      <ThemedText style={styles.sectionLabelText} accessibilityRole="header">
        {children}
      </ThemedText>
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  /** Element rendered inside the field, before the input (e.g. a search icon). */
  leading?: ReactNode;
  /** Element rendered inside the field, after the input (unit, pencil). */
  trailing?: ReactNode;
  /** Style of the outer outlined box. */
  containerStyle?: StyleProp<ViewStyle>;
}

/** Outlined input box from the reference: hairline border, black border while focused. */
export function TextField({ style, leading, trailing, containerStyle, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.inputBox,
        { backgroundColor: theme.surface, borderColor: focused ? theme.text : theme.border, borderWidth: focused ? 1.5 : 1 },
        containerStyle,
      ]}>
      {leading}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, { color: theme.text }, style]}
        {...rest}
      />
      {trailing}
    </View>
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
    minHeight: 56,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  buttonText: { fontSize: 17, fontWeight: 600 },
  chip: {
    minHeight: 40,
    paddingHorizontal: Spacing.three + Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15, fontWeight: 500 },
  card: { borderRadius: Radius.md, padding: Spacing.three },
  notice: {
    borderLeftWidth: 4,
    borderRadius: Radius.sm,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: 700 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  sectionLabelText: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 58,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.two, minHeight: 44 },
});
