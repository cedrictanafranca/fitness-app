import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { shiftDateKey } from '@/core/nutrition/engine';
import type { DateKey } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { dayTitle, parseDateKey, weekOf } from './format';

interface DayHeaderProps {
  date: DateKey;
  today: DateKey;
  onChange: (date: DateKey) => void;
  /** Opens the conversational assistant. */
  onAssistant?: () => void;
  /** Consecutive days logged; shown as a small pill when > 0. */
  streak?: number;
}

export function DayHeader({ date, today, onChange, onAssistant, streak = 0 }: DayHeaderProps) {
  const theme = useTheme();
  const canGoNext = date < today;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.app}>
            Fuel
          </ThemedText>
          <ThemedText style={styles.title} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
            {dayTitle(date, today)}
          </ThemedText>
        </View>
        <View style={styles.chevrons}>
          {streak > 0 ? (
            <View
              accessibilityLabel={`${streak} day logging streak`}
              style={[styles.streak, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{`🔥 ${streak}`}</ThemedText>
            </View>
          ) : null}
          {onAssistant ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open assistant"
              hitSlop={6}
              onPress={onAssistant}
              style={({ pressed }) => [styles.chevron, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText style={[styles.spark, { color: theme.onPrimary }]}>✦</ThemedText>
            </Pressable>
          ) : null}
          <ChevronButton direction="prev" label="Previous day" onPress={() => onChange(shiftDateKey(date, -1))} />
          <ChevronButton
            direction="next"
            label="Next day"
            disabled={!canGoNext}
            onPress={() => onChange(shiftDateKey(date, 1))}
          />
        </View>
      </View>

      <View style={styles.strip}>
        {weekOf(date).map((key) => {
          const selected = key === date;
          const future = key > today;
          const dt = parseDateKey(key);
          return (
            <Pressable
              key={key}
              disabled={future}
              onPress={() => onChange(key)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: future }}
              accessibilityLabel={dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              style={[styles.day, selected && { backgroundColor: theme.backgroundElement }, future && styles.future]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.weekday}>
                {dt.toLocaleDateString('en-US', { weekday: 'short' })}
              </ThemedText>
              <View
                style={[
                  styles.dayCircle,
                  { borderColor: selected ? theme.text : theme.track },
                  key === today && styles.todayCircle,
                ]}>
                <ThemedText type="smallBold">{dt.getDate()}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ChevronButton({
  direction,
  label,
  disabled = false,
  onPress,
}: {
  direction: 'prev' | 'next';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chevron,
        { backgroundColor: theme.backgroundElement },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.chevronGlyph,
          { borderColor: theme.text },
          direction === 'prev' ? styles.glyphPrev : styles.glyphNext,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  titles: { flex: 1, gap: Spacing.half },
  app: { textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  chevrons: { flexDirection: 'row', gap: Spacing.two },
  chevron: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chevronGlyph: { width: 10, height: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  spark: { fontSize: 18, lineHeight: 22 },
  streak: { height: 40, paddingHorizontal: Spacing.two + Spacing.one, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  glyphPrev: { transform: [{ rotate: '-45deg' }, { translateX: 1 }, { translateY: 1 }] },
  glyphNext: { transform: [{ rotate: '135deg' }, { translateX: 1 }, { translateY: 1 }] },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Spacing.one + Spacing.half, paddingVertical: Spacing.two, flex: 1, borderRadius: Radius.md },
  weekday: { fontSize: 12, lineHeight: 16 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { borderStyle: 'solid' },
  future: { opacity: 0.35 },
});
