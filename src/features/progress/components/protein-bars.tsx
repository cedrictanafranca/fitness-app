import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface DayBar {
  key: string;
  label: string;
  value: number;
  isToday: boolean;
}

/** Height of the bar area in points. */
const AREA_HEIGHT = 150;
const GRID_LINES = 4;

/** Seven slim rounded bars (reference "Weekly Energy" chart) with light grid lines and a dashed target. */
export function ProteinBars({ days, target }: { days: DayBar[]; target: number }) {
  const theme = useTheme();
  const peak = Math.max(target, ...days.map((d) => d.value), 1);
  const scale = AREA_HEIGHT / peak;
  const targetOffset = target * scale;

  return (
    <View style={styles.wrap}>
      <View style={[styles.area, { height: AREA_HEIGHT }]}>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const v = (peak / GRID_LINES) * i;
          return (
            <View key={i} pointerEvents="none" style={[styles.gridLine, { bottom: v * scale, borderColor: theme.border }]}>
              <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>{Math.round(v)}</Text>
            </View>
          );
        })}
        {days.map((day) => {
          const barHeight = day.value * scale;
          const hasValue = day.value > 0;
          return (
            <View key={day.key} accessibilityLabel={`${day.label}, ${Math.round(day.value)} grams protein`} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(barHeight, hasValue ? 3 : 0), backgroundColor: theme.carbs },
                ]}
              />
            </View>
          );
        })}
        <View pointerEvents="none" style={[styles.targetLine, { bottom: targetOffset, borderColor: theme.textSecondary }]} />
      </View>

      <View style={styles.labels}>
        {days.map((day) => (
          <Text
            key={day.key}
            style={[styles.dayLabel, { color: day.isToday ? theme.text : theme.textSecondary, fontWeight: day.isToday ? '700' : '500' }]}>
            {day.label}
          </Text>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: theme.carbs }]} />
        <ThemedText type="small" themeColor="textSecondary">
          Protein (g)
        </ThemedText>
        <View style={[styles.legendDash, { borderColor: theme.textSecondary }]} />
        <ThemedText type="small" themeColor="textSecondary">
          Target {Math.round(target)} g
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  area: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 30 },
  gridLine: { position: 'absolute', left: 30, right: 0, borderTopWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  gridLabel: { position: 'absolute', left: -30, top: -8, width: 24, fontSize: 11, textAlign: 'right' },
  column: { flex: 1, height: AREA_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 8, borderRadius: 4 },
  targetLine: { position: 'absolute', left: 30, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  labels: { flexDirection: 'row', paddingLeft: 30 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendDash: { width: 14, borderTopWidth: 1, borderStyle: 'dashed', marginLeft: 8 },
});
