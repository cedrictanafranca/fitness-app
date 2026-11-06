import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';
import { Radius, Spacing } from '@/constants/theme';
import { weightChanges, weightTrend } from '@/core/progress/stats';
import type { DateKey, Units, WeightRecord } from '@/core/types';
import { kgToUnits, round1, weightUnitLabel } from '@/features/settings/units';
import { useTheme } from '@/hooks/use-theme';

import { parseDateKey } from '../dates';
import { Card } from './card';

type RangeKey = '90D' | '6M' | '1Y' | 'ALL';
const RANGES: { value: RangeKey; label: string; days: number | null }[] = [
  { value: '90D', label: '90D', days: 90 },
  { value: '6M', label: '6M', days: 182 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: 'ALL', label: 'ALL', days: null },
];
const CHANGE_WINDOWS = [7, 14, 30, 90];

const HEIGHT = 190;
const PAD = { top: 12, right: 12, bottom: 8, left: 36 };

/** "Weight Progress" line chart with a range picker, then the "Weight Changes" table. */
export function WeightTrendCard({ history, today, units }: { history: WeightRecord[]; today: DateKey; units: Units }) {
  const theme = useTheme();
  const [range, setRange] = useState<RangeKey>('90D');
  const [width, setWidth] = useState(0);
  const days = RANGES.find((r) => r.value === range)?.days ?? null;
  const points = weightTrend(history, today, days);
  const changes = weightChanges(history, today, CHANGE_WINDOWS);
  const unit = weightUnitLabel(units);

  const oldest = history[history.length - 1];
  const newest = history[0];
  const allTime = oldest && newest && oldest.id !== newest.id ? newest.weightKg - oldest.weightKg : null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <>
      <Card
        title="Weight Progress"
        trailing={
          <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="target" size={13} color={theme.text} />
            <ThemedText type="small">
              <ThemedText type="smallBold">{points.length}</ThemedText>
              {points.length === 1 ? ' entry' : ' entries'}
            </ThemedText>
          </View>
        }>
        <View onLayout={onLayout} style={styles.chartWrap}>
          {width > 0 && points.length >= 2 ? (
            <Chart points={points} width={width} units={units} color={theme.text} muted={theme.textSecondary} grid={theme.border} />
          ) : (
            <View style={[styles.empty, { height: HEIGHT }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {points.length === 1 ? 'Log one more weigh-in to see a trend.' : 'No weigh-ins in this range yet.'}
              </ThemedText>
            </View>
          )}
        </View>
        <Segmented options={RANGES} value={range} onChange={setRange} />
      </Card>

      <Card title="Weight Changes">
        <View style={styles.table}>
          {[...changes, { days: 0, deltaKg: allTime }].map((c) => {
            const delta = c.deltaKg == null ? null : round1(kgToUnits(c.deltaKg, units));
            const dir: { label: string; icon: IconName; color: string } =
              delta == null
                ? { label: 'Not enough data', icon: 'arrow-right', color: theme.textSecondary }
                : delta > 0
                  ? { label: 'Increase', icon: 'arrow-up-right', color: theme.carbs }
                  : delta < 0
                    ? { label: 'Decrease', icon: 'arrow-down-right', color: theme.carbs }
                    : { label: 'No change', icon: 'arrow-right', color: theme.fat };
            return (
              <View key={c.days} style={styles.tableRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tableLabel}>
                  {c.days === 0 ? 'All time' : `${c.days} day`}
                </ThemedText>
                <Sparkline delta={delta} color={delta == null || delta === 0 ? theme.fat : theme.carbs} />
                <Text style={[styles.tableValue, { color: theme.text }]} numberOfLines={1}>
                  {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`}
                </Text>
                <View style={styles.dir}>
                  <Icon name={dir.icon} size={14} strokeWidth={2.2} color={dir.color} />
                  <Text style={[styles.tableDir, { color: theme.textSecondary }]} numberOfLines={1}>
                    {dir.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </>
  );
}

/** Tiny curve glyph next to each change row: rising, falling, or flat. */
function Sparkline({ delta, color }: { delta: number | null; color: string }) {
  const d = delta == null || delta === 0 ? 'M2 9 H26' : delta > 0 ? 'M2 16 C 10 16, 18 3, 26 3' : 'M2 3 C 10 3, 18 16, 26 16';
  const fill = delta == null || delta === 0 ? `M2 9 H26 V18 H2 Z` : `${d} V18 H2 Z`;
  return (
    <Svg width={28} height={18} viewBox="0 0 28 18">
      <Path d={fill} fill={color} opacity={0.18} />
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </Svg>
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
  let lo = Math.floor(Math.min(...values)) - 2;
  let hi = Math.ceil(Math.max(...values)) + 2;
  if (hi - lo < 8) {
    const mid = Math.round((hi + lo) / 2);
    lo = mid - 4;
    hi = mid + 4;
  }
  const w = width - PAD.left - PAD.right;
  const h = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - minT) / span) * w;
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * h;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(values[i]).toFixed(1)}`).join(' ');
  const step = (hi - lo) / 5;
  const ticks = Array.from({ length: 6 }, (_, i) => lo + step * i);

  return (
    <Svg width={width} height={HEIGHT} accessibilityLabel="Weight trend chart">
      {ticks.map((t) => (
        <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} />
      ))}
      {ticks.map((t) => (
        <SvgText key={`l${t}`} x={PAD.left - 8} y={y(t) + 4} fontSize={11} fill={muted} textAnchor="end">
          {round1(t).toFixed(0)}
        </SvgText>
      ))}
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(times[times.length - 1])} cy={y(values[values.length - 1])} r={4} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  chartWrap: { width: '100%' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  table: { gap: Spacing.three },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  tableLabel: { width: 54, fontSize: 15 },
  tableValue: { flex: 1, fontSize: 15, fontWeight: 600, textAlign: 'right' },
  dir: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, width: 104 },
  tableDir: { fontSize: 13, fontWeight: 500, flexShrink: 1 },
});
