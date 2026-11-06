import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icons';
import { Radius, Spacing } from '@/constants/theme';
import { BMI_BANDS, bmi, bmiCategory } from '@/core/progress/stats';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';

const BAND_COLORS: Record<string, string> = {
  underweight: '#6C8FE8',
  healthy: '#4DAE65',
  overweight: '#D9B44A',
  obese: '#D9534F',
};

/** Body mass index from the profile height and the latest weight, with the standard bands. */
export function BmiCard({ weightKg, heightCm }: { weightKg: number; heightCm: number }) {
  const theme = useTheme();
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const value = bmi(weightKg, heightCm);
  const category = bmiCategory(value);
  const band = BMI_BANDS.find((b) => b.category === category)!;
  const scaleMin = 15;
  const scaleMax = 40;
  const markerPct = Math.min(100, Math.max(0, ((value - scaleMin) / (scaleMax - scaleMin)) * 100));

  return (
    <Card
      title="Your BMI"
      trailing={<Icon name="info" size={18} color={theme.textSecondary} />}>
      <View style={styles.headline}>
        <Text style={[styles.value, { color: theme.text }]}>{value.toFixed(1)}</Text>
        <ThemedText type="small" themeColor="textSecondary">
          Your weight is
        </ThemedText>
        <View style={[styles.pill, { backgroundColor: `${BAND_COLORS[category]}22` }]}>
          <Text style={[styles.pillText, { color: BAND_COLORS[category] }]}>{band.label}</Text>
        </View>
      </View>

      <View style={styles.barWrap}>
        <View style={styles.bar}>
          {BMI_BANDS.map((b) => {
            const from = Math.max(b.min, scaleMin);
            const to = Math.min(b.max, scaleMax);
            return (
              <View
                key={b.category}
                style={{ flex: Math.max(0.01, to - from), backgroundColor: BAND_COLORS[b.category], height: 10, borderRadius: 5 }}
              />
            );
          })}
        </View>
        <View style={[styles.marker, { left: `${markerPct}%`, backgroundColor: theme.text }]} />
      </View>

      <View style={styles.legend}>
        {BMI_BANDS.map((b) => (
          <View key={b.category} style={styles.legendItem}>
            <View style={styles.legendTitle}>
              <View style={[styles.dot, { backgroundColor: BAND_COLORS[b.category] }]} />
              <ThemedText type="small" style={styles.legendLabel}>
                {b.label}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.legendRange}>
              {b.category === 'underweight' ? `<${b.max}` : b.category === 'obese' ? `>${b.min}` : `${b.min}–${round(b.max - 0.1)}`}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        BMI ignores muscle mass; use it as a rough guide only.
      </ThemedText>
    </Card>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  value: { fontSize: 36, fontWeight: 700, lineHeight: 42, letterSpacing: -0.5 },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: 600 },
  barWrap: { paddingVertical: 6 },
  bar: { flexDirection: 'row', gap: 3 },
  marker: { position: 'absolute', top: 2, width: 3, height: 18, borderRadius: 2, marginLeft: -1.5 },
  legend: { flexDirection: 'row', gap: Spacing.two },
  legendItem: { flex: 1, gap: 2 },
  legendTitle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 11, lineHeight: 14, flex: 1 },
  legendRange: { fontSize: 11, lineHeight: 14, paddingLeft: 10 },
});
