import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icons';
import { Spacing } from '@/constants/theme';

export interface StatTile {
  icon: IconName;
  color: string;
  value: string;
  label: string;
}

/** The two square tiles at the top of Progress (day streak, days logged). */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <View style={styles.row}>
      {tiles.map((t) => (
        <Card key={t.label} style={styles.tile} accessibilityLabel={`${t.label}: ${t.value}`}>
          <View style={styles.badge}>
            <Icon name={t.icon} size={64} filled color={t.color} strokeWidth={1.2} />
            <View style={styles.valueWrap}>
              <ThemedText style={styles.value}>{t.value}</ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {t.label}
          </ThemedText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three },
  tile: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  badge: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  valueWrap: { position: 'absolute', bottom: -6, left: 0, right: 0, alignItems: 'center' },
  value: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: 800,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 1 },
  },
  label: { fontSize: 15, marginTop: Spacing.two },
});
