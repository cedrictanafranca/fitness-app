import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Grouped list from the reference Profile: grey label above an elevated white card with hairline-divided rows. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={styles.section}>
      <ThemedText themeColor="textSecondary" style={styles.header} accessibilityRole="header">
        {title}
      </ThemedText>
      <Card padding={0}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            <View style={styles.row}>{row}</View>
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  header: { fontSize: 15, lineHeight: 20, fontWeight: 500, paddingHorizontal: Spacing.half },
  row: { paddingHorizontal: Spacing.three + Spacing.one, paddingVertical: Spacing.three, gap: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three + Spacing.one },
});
