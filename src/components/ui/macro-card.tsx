import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';
import { Icon, type IconName } from './icons';
import { Ring } from './ring';

export interface MacroCardProps {
  /** Macro name, e.g. "Protein". */
  label: string;
  /** Amount eaten so far. */
  consumed: number;
  /** Daily target. When undefined the ring shows no progress and only consumed grams are displayed. */
  target?: number;
  color: string;
  /** Small glyph inside the ring. */
  icon: IconName;
  unit?: string;
  style?: StyleProp<ViewStyle>;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Reference macro tile: "0g" on top, "Protein left" under it, then a colored ring with the macro's
 * glyph in the middle. Without a target it shows the grams eaten and an empty ring.
 */
export function MacroCard({ label, consumed, target, color, icon, unit = 'g', style }: MacroCardProps) {
  const theme = useTheme();
  const hasTarget = target != null && target > 0;
  const left = hasTarget ? target - consumed : 0;
  const over = hasTarget && left < 0;
  const progress = hasTarget ? consumed / target : 0;

  const value = hasTarget ? Math.abs(left) : consumed;
  const caption = !hasTarget ? `${label} eaten` : over ? `${label} over` : `${label} left`;
  const a11y = hasTarget
    ? `${label}: ${fmt(consumed)} of ${fmt(target)} ${unit}, ${fmt(Math.abs(left))} ${unit} ${over ? 'over' : 'left'}`
    : `${label}: ${fmt(consumed)} ${unit} eaten`;
  const accent = over ? theme.warning : color;

  return (
    <Card style={[styles.card, style]} padding={Spacing.three} accessibilityLabel={a11y}>
      <ThemedText style={[styles.value, over && { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit>
        {`${fmt(value)}${unit}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.caption}>
        {caption}
      </ThemedText>
      <Ring size={68} stroke={7} progress={progress} color={accent} trackColor={`${accent}33`} style={styles.ring}>
        <Icon name={icon} size={18} color={accent} strokeWidth={2} />
      </Ring>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: Spacing.half, alignItems: 'flex-start' },
  value: { fontSize: 19, lineHeight: 24, fontWeight: 700 },
  caption: { fontSize: 12, lineHeight: 16 },
  ring: { alignSelf: 'center', marginTop: Spacing.three },
});
