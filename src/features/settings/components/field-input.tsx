import { Platform, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { DANGER_COLOR } from './colors';

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

export function FieldInput({
  label,
  value,
  onChangeText,
  error,
  suffix,
  placeholder,
  numeric = true,
  flex,
}: FieldInputProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, flex != null && { flex }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.background, borderColor: error ? DANGER_COLOR : theme.backgroundSelected },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  suffix: {
    fontSize: 14,
    marginLeft: 8,
  },
  error: {
    color: DANGER_COLOR,
    fontSize: 13,
    lineHeight: 18,
  },
});
