import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  /** Optional visual (emoji text, icon, image) above the title. */
  icon?: ReactNode;
  /** Action area, typically a Button or Link. */
  children?: ReactNode;
}

export function EmptyState({ title, message, icon, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <ThemedText type="default" style={styles.title}>
        {title}
      </ThemedText>
      {message != null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four },
  title: { fontWeight: 700, textAlign: 'center' },
  message: { textAlign: 'center' },
});
