import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * iOS has no decimal point on the plain numeric pad, so decimal input uses decimal-pad there.
 * Android's numeric keyboard already includes the decimal separator.
 */
const NUMERIC_KEYBOARD: KeyboardTypeOptions = Platform.OS === 'ios' ? 'decimal-pad' : 'numeric';

export type FieldInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  suffix?: string;
  placeholder?: string;
  /** Numeric keyboard (default). Pass false for free text such as a date. */
  numeric?: boolean;
  /** Stretch to share a row with sibling fields. */
  flex?: number;
};

/** Outlined "Add Food" style row: label on the left, value on the right, unit after it; black border on focus. */
export function FieldInput({ label, value, onChangeText, error, suffix, placeholder, numeric = true, flex }: FieldInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? theme.warning : focused ? theme.text : theme.border;
  return (
    <View style={[styles.wrap, flex != null && { flex }]}>
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: border, borderWidth: focused ? 1.5 : 1 }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label} numberOfLines={1}>
          {label}
        </ThemedText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={numeric ? NUMERIC_KEYBOARD : 'default'}
          autoCorrect={false}
          autoCapitalize="none"
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={label}
          style={[styles.input, { color: theme.text }]}
        />
        {suffix ? <Text style={[styles.suffix, { color: theme.textSecondary }]}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.warning }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    minHeight: 58,
    gap: 10,
  },
  label: { fontSize: 15, flexShrink: 0 },
  input: { flex: 1, fontSize: 16, paddingVertical: 10, textAlign: 'right', minWidth: 36 },
  suffix: { fontSize: 14 },
  error: { fontSize: 13, lineHeight: 18 },
});
