import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card as BaseCard } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

/** Elevated white card with a bold title row and an optional right-side element or caption. */
export function Card({
  title,
  caption,
  trailing,
  children,
}: {
  title: string;
  caption?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <BaseCard padding={Spacing.three + Spacing.one} style={styles.card}>
      <View style={styles.header}>
        <ThemedText style={styles.title} accessibilityRole="header">
          {title}
        </ThemedText>
        {trailing ??
          (caption ? (
            <ThemedText type="small" themeColor="textSecondary">
              {caption}
            </ThemedText>
          ) : null)}
      </View>
      {children}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { fontSize: 19, lineHeight: 24, fontWeight: 600 },
});
