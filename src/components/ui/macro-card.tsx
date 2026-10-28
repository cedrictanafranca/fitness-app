import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';
import { Ring } from './ring';

export interface MacroCardProps {
  /** Macro name, e.g. "Protein". */
  label: string;
  /** Amount eaten so far. */
  consumed: number;
  /** Daily target. When undefined the ring shows no progress and only consumed grams are displayed. */
  target?: number;
  color: string;
  unit?: string;
  /** Larger ring and number, used for protein. */
  prominent?: boolean;
  style?: StyleProp<ViewStyle>;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * "Protein left" style card: remaining amount on top, ring below, consumed/target underneath.
 * Without a target it shows "Carbs eaten" with the consumed grams and an empty ring.
 */
export function MacroCard({ label, consumed, target, color, unit = 'g', prominent = false, style }: MacroCardProps) {
  const theme = useTheme();
  const hasTarget = target != null && target > 0;
  const left = hasTarget ? target - consumed : 0;
  const over = hasTarget && left < 0;
  const progress = hasTarget ? consumed / target : 0;

  const value = hasTarget ? Math.abs(left) : consumed;
  const caption = !hasTarget ? `${label} eaten` : over ? `${label} over` : `${label} left`;
  const detail = hasTarget ? `${fmt(consumed)} / ${fmt(target)} ${unit}` : `no target set`;
  const a11y = hasTarget
    ? `${label}: ${fmt(consumed)} of ${fmt(target)} ${unit}, ${fmt(Math.abs(left))} ${unit} ${over ? 'over' : 'left'}`
    : `${label}: ${fmt(consumed)} ${unit} eaten`;

  return (
    <Card style={[styles.card, prominent && styles.prominentCard, style]} accessibilityLabel={a11y}>
      <ThemedText style={[prominent ? styles.valueProminent : styles.value, over && { color: theme.warning }]}>
        {`${fmt(value)}${unit}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {caption}
      </ThemedText>
      <Ring
        size={prominent ? 92 : 68}
        stroke={prominent ? 10 : 8}
        progress={progress}
        color={over ? theme.warning : color}
        style={styles.ring}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.detail}>
        {detail}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: Spacing.half },
  prominentCard: { flex: 1.35 },
  value: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  valueProminent: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  ring: { alignSelf: 'center', marginTop: Spacing.three },
  detail: { textAlign: 'center', marginTop: Spacing.two, fontSize: 12 },
});
