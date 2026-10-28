import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { PROTEIN_COLOR } from '../palette';

export interface DayBar {
  key: string;
  label: string;
  value: number;
  isToday: boolean;
}

/** Height of the bar area in points. Labels for each value sit above the bars inside it. */
const AREA_HEIGHT = 120;
const LABEL_RESERVE = 18;
const MAX_BAR_HEIGHT = AREA_HEIGHT - LABEL_RESERVE;

/** Seven plain-View bars of protein per day with a dashed line at the protein target. */
export function ProteinBars({ days, target }: { days: DayBar[]; target: number }) {
  const theme = useTheme();
  const peak = Math.max(target, ...days.map((d) => d.value), 1);
  const scale = MAX_BAR_HEIGHT / peak;
  const targetOffset = target * scale;

  return (
    <View style={styles.wrap}>
      <View style={[styles.area, { height: AREA_HEIGHT }]}>
        {days.map((day) => {
          const barHeight = day.value * scale;
          const hasValue = day.value > 0;
          return (
            <View
              key={day.key}
              accessibilityLabel={`${day.label}, ${Math.round(day.value)} grams protein`}
              style={styles.column}>
              <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>
                {hasValue ? Math.round(day.value) : '–'}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, hasValue ? 2 : 0),
                    backgroundColor: hasValue ? PROTEIN_COLOR : theme.backgroundSelected,
                  },
                ]}
              />
            </View>
          );
        })}
        <View
          pointerEvents="none"
          style={[styles.targetLine, { bottom: targetOffset, borderColor: theme.textSecondary }]}
        />
      </View>

      <View style={styles.labels}>
        {days.map((day) => (
          <Text
            key={day.key}
            style={[
              styles.dayLabel,
              { color: day.isToday ? theme.text : theme.textSecondary, fontWeight: day.isToday ? '700' : '500' },
            ]}>
            {day.label}
          </Text>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Protein per day (g). Dashed line: target {Math.round(target)} g.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  area: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    height: AREA_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 11,
    lineHeight: 14,
    height: LABEL_RESERVE,
    textAlignVertical: 'bottom',
  },
  bar: {
    width: '60%',
    maxWidth: 28,
    minWidth: 8,
    borderRadius: 4,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  labels: {
    flexDirection: 'row',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
});
