import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icons';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { shiftDateKey } from '@/core/nutrition/engine';
import type { DateKey } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';

import { parseDateKey } from './format';

interface DayHeaderProps {
  date: DateKey;
  today: DateKey;
  onChange: (date: DateKey) => void;
  /** Consecutive days logged; shown in the streak pill. */
  streak?: number;
}

/** Days of history reachable from the strip, plus one faded future day like the reference. */
const PAST_DAYS = 27;

/** Wordmark + streak pill on top, then the horizontal date strip with dashed day circles. */
export function DayHeader({ date, today, onChange, streak = 0 }: DayHeaderProps) {
  const theme = useTheme();
  const strip = useRef<ScrollViewInstance>(null);
  const days = Array.from({ length: PAST_DAYS + 2 }, (_, i) => shiftDateKey(today, i - PAST_DAYS));

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.brand}>
          <Icon name="flame" size={30} filled color={theme.text} />
          <ThemedText style={styles.wordmark} accessibilityRole="header">
            Fuel
          </ThemedText>
        </View>
        <View
          accessibilityLabel={`${streak} day logging streak`}
          style={[styles.streak, { backgroundColor: theme.surface }, Elevation.card]}>
          <Icon name="flame" size={18} filled color="#F0931E" />
          <ThemedText type="smallBold" style={styles.streakText}>
            {streak}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        ref={strip}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        onContentSizeChange={() => strip.current?.scrollToEnd({ animated: false })}>
        {days.map((key) => {
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
              style={[styles.day, selected && [{ backgroundColor: theme.surface }, Elevation.card], future && styles.future]}>
              <ThemedText
                style={[styles.weekday, { color: selected ? theme.text : theme.textSecondary }, selected && styles.weekdaySelected]}>
                {dt.toLocaleDateString('en-US', { weekday: 'short' })}
              </ThemedText>
              <View
                style={[
                  styles.dayCircle,
                  { borderColor: selected ? theme.backgroundSelected : theme.border },
                  selected ? styles.solid : styles.dashed,
                ]}>
                <ThemedText style={styles.dayNumber}>{dt.getDate()}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  wordmark: { fontSize: 30, lineHeight: 36, fontWeight: 700, letterSpacing: -0.5 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  streakText: { fontSize: 15 },
  strip: { flexDirection: 'row', gap: Spacing.one, paddingVertical: Spacing.one, paddingHorizontal: Spacing.half },
  day: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, width: 56, borderRadius: Radius.md },
  weekday: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  weekdaySelected: { fontWeight: 700 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed' },
  solid: { borderStyle: 'solid', borderWidth: 2 },
  dayNumber: { fontSize: 16, lineHeight: 20, fontWeight: 600 },
  future: { opacity: 0.4 },
});
