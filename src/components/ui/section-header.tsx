import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  /** Optional right-aligned text action, e.g. "See all". */
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="default" style={styles.title} accessibilityRole="header">
        {title}
      </ThemedText>
      {actionLabel != null && (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onActionPress}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.two },
  title: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
});
