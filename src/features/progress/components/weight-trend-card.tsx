import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { weightChanges, weightTrend } from '@/core/progress/stats';
import type { DateKey, Units, WeightRecord } from '@/core/types';
import { kgToUnits, round1, weightUnitLabel } from '@/features/settings/units';
import { useTheme } from '@/hooks/use-theme';

import { parseDateKey } from '../dates';
import { Card } from './card';

const RANGES: { label: string; days: number | null }[] = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: null },
];

const HEIGHT = 150;
const PAD = { top: 10, right: 12, bottom: 22, left: 36 };

/** Weight over time with a range picker, plus the change over 7 / 30 / 90 days. */
export function WeightTrendCard({ history, today, units }: { history: WeightRecord[]; today: DateKey; units: Units }) {
  const theme = useTheme();
  const [range, setRange] = useState(1);
  const [width, setWidth] = useState(0);
  const points = weightTrend(history, today, RANGES[range].days);
  const changes = weightChanges(history, today);
  const unit = weightUnitLabel(units);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Card title="Weight progress" caption={points.length ? `${points.length} ${points.length === 1 ? 'entry' : 'entries'}` : undefined}>
      <View onLayout={onLayout} style={styles.chartWrap}>
        {width > 0 && points.length >= 2 ? (
          <Chart points={points} width={width} units={units} color={theme.text} muted={theme.textSecondary} grid={theme.backgroundSelected} />
        ) : (
          <View style={[styles.empty, { height: HEIGHT }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {points.length === 1 ? 'Log one more weigh-in to see a trend.' : 'No weigh-ins in this range yet.'}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.ranges, { backgroundColor: theme.background }]}>
        {RANGES.map((r, i) => (
          <Pressable
            key={r.label}
            accessibilityRole="button"
            accessibilityState={{ selected: i === range }}
            onPress={() => setRange(i)}
            style={[styles.range, i === range && { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.rangeLabel, { color: i === range ? theme.text : theme.textSecondary }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.table}>
        {changes.map((c) => {
          const delta = c.deltaKg == null ? null : round1(kgToUnits(c.deltaKg, units));
          const dir = delta == null ? '' : delta > 0 ? 'Gain' : delta < 0 ? 'Loss' : 'No change';
          const color = delta == null || delta === 0 ? theme.textSecondary : delta < 0 ? theme.protein : theme.fat;
          return (
            <View key={c.days} style={styles.tableRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tableLabel}>
                {`${c.days} day`}
              </ThemedText>
              <Text style={[styles.tableValue, { color: theme.text }]}>
                {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`}
              </Text>
              <Text style={[styles.tableDir, { color }]}>{delta == null ? 'Not enough data' : dir}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function Chart({
  points,
  width,
  units,
  color,
  muted,
  grid,
}: {
  points: WeightRecord[];
  width: number;
  units: Units;
  color: string;
  muted: string;
  grid: string;
}) {
  const values = points.map((p) => kgToUnits(p.weightKg, units));
  const times = points.map((p) => parseDateKey(p.date).getTime());
  const minT = times[0];
  const maxT = times[times.length - 1];
  const span = Math.max(1, maxT - minT);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 2) {
    const mid = (hi + lo) / 2;
    lo = mid - 1;
    hi = mid + 1;
  }
  const w = width - PAD.left - PAD.right;
  const h = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - minT) / span) * w;
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * h;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');
  const ticks = [hi, (hi + lo) / 2, lo];
  const first = parseDateKey(points[0].date);
  const last = parseDateKey(points[points.length - 1].date);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Svg width={width} height={HEIGHT} accessibilityLabel="Weight trend chart">
      {ticks.map((t) => (
        <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={grid} strokeDasharray="3 4" />
      ))}
      {ticks.map((t) => (
        <SvgText key={`l${t}`} x={PAD.left - 6} y={y(t) + 4} fontSize={10} fill={muted} textAnchor="end">
          {round1(t).toFixed(0)}
        </SvgText>
      ))}
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(times[times.length - 1])} cy={y(values[values.length - 1])} r={4} fill={color} />
      <SvgText x={PAD.left} y={HEIGHT - 6} fontSize={10} fill={muted}>
        {fmt(first)}
      </SvgText>
      <SvgText x={width - PAD.right} y={HEIGHT - 6} fontSize={10} fill={muted} textAnchor="end">
        {fmt(last)}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  chartWrap: { width: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  ranges: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  range: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, alignItems: 'center' },
  rangeLabel: { fontSize: 13, fontWeight: '600' },
  table: { gap: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tableLabel: { width: 56 },
  tableValue: { flex: 1, fontSize: 15, fontWeight: '600' },
  tableDir: { fontSize: 13, fontWeight: '600' },
});
