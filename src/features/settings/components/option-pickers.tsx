import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/ui/segmented';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Option<T extends string> = { value: T; label: string };

/** Two-to-three way toggle rendered as the shared pill segmented control (used for units). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return <Segmented options={options} value={value} onChange={onChange} />;
}

/** Wrapping outline chips, black when selected (used for goal). */
export function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { borderColor: theme.border, backgroundColor: theme.surface },
              selected && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}>
            <Text style={[styles.chipLabel, { color: selected ? theme.onPrimary : theme.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5 },
  chipLabel: { fontSize: 14, fontWeight: 600 },
});
