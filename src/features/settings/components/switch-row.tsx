import { Switch, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function SwitchRow({
  label,
  helper,
  value,
  onValueChange,
}: {
  label: string;
  helper?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <ThemedText type="default">{label}</ThemedText>
        {helper ? (
          <ThemedText type="small" themeColor="textSecondary">
            {helper}
          </ThemedText>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
