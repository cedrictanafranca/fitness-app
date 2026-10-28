import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

/** Grouped-list section: small header above a rounded card whose rows are divided by hairlines. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.header}>
        {title}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} /> : null}
            <View style={styles.row}>{row}</View>
          </Fragment>
        ))}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  header: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});
