import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
      <View style={styles.stepper}>
        <StepButton
          label="−"
          accessibilityLabel={`Decrease ${label}`}
          disabled={!canDecrease}
          onPress={() => onChange(Math.max(min, value - step))}
        />
        <Text style={[styles.value, { color: theme.text }, disabled && styles.dimmed]}>{format(value)}</Text>
        <StepButton
          label="+"
          accessibilityLabel={`Increase ${label}`}
          disabled={!canIncrease}
          onPress={() => onChange(Math.min(max, value + step))}
        />
      </View>
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
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
      style={[styles.stepButton, { backgroundColor: theme.backgroundSelected, opacity: disabled ? 0.35 : 1 }]}>
      <Text style={[styles.stepLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.4,
  },
});
