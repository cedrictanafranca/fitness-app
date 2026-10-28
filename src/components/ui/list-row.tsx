import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Element before the text (thumbnail, icon). */
  leading?: ReactNode;
  /** Element after the text (value, chevron). */
  trailing?: ReactNode;
  /** Extra content below title/subtitle (badges, pills). */
  footer?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: { expanded?: boolean };
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  footer,
  onPress,
  accessibilityLabel,
  accessibilityState,
  style,
}: ListRowProps) {
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <ThemedText type="default" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        {subtitle != null && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
        {footer}
      </View>
      {trailing}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + Spacing.one },
  text: { flex: 1, gap: Spacing.half },
  title: { fontWeight: 600 },
  pressed: { opacity: 0.65 },
});
