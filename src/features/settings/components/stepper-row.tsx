import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icons';
import { useTheme } from '@/hooks/use-theme';

export function StepperRow({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  format = (v: number) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const canDecrease = !disabled && value - step >= min;
  const canIncrease = !disabled && value + step <= max;
  return (
    <View style={styles.row}>
      <ThemedText type="default" style={disabled ? styles.dimmed : undefined}>
        {label}
      </ThemedText>
      <View style={[styles.stepper, { borderColor: theme.border }]}>
        <StepButton
          glyph="minus"
          accessibilityLabel={`Decrease ${label}`}
          disabled={!canDecrease}
          onPress={() => onChange(Math.max(min, value - step))}
        />
        <Text style={[styles.value, { color: theme.text }, disabled && styles.dimmed]}>{format(value)}</Text>
        <StepButton
          glyph="plus"
          accessibilityLabel={`Increase ${label}`}
          disabled={!canIncrease}
          onPress={() => onChange(Math.min(max, value + step))}
        />
      </View>
    </View>
  );
}

function StepButton({
  glyph,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  glyph: 'plus' | 'minus';
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepButton, { opacity: disabled ? 0.3 : 1 }]}>
      {glyph === 'plus' ? (
        <Icon name="plus" size={16} strokeWidth={2.2} color={theme.text} />
      ) : (
        <View style={[styles.minus, { backgroundColor: theme.text }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 4 },
  stepButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  minus: { width: 12, height: 2, borderRadius: 1 },
  value: { minWidth: 44, textAlign: 'center', fontSize: 15, fontWeight: 600 },
  dimmed: { opacity: 0.4 },
});
