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

/** Centered illustration + bold title + grey line + action, as on the reference's empty lists. */
export function EmptyState({ title, message, icon, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <ThemedText style={styles.title}>{title}</ThemedText>
      {message != null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      )}
      {children != null && <View style={styles.action}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four },
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700, textAlign: 'center' },
  message: { textAlign: 'center', fontSize: 15, lineHeight: 21 },
  action: { alignSelf: 'stretch', alignItems: 'center', marginTop: Spacing.two },
});
