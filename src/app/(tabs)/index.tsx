import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, EstimateBadge } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { toDateKey } from '@/core/nutrition/engine';
import { CalorieHero, DayHeader, MacroRow, MealList, useDailySummary } from '@/features/home';
import { QuickActions } from '@/features/home/quick-actions';
import { useLoggingStreak } from '@/features/home/use-logging-streak';

/** Cast because typed-route definitions regenerate when the dev server runs. */
const ASSISTANT_HREF = '/assistant' as unknown as Href;

export default function HomeScreen() {
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  const { meals, totals, loading, error, refresh } = useDailySummary(date);
  const streak = useLoggingStreak();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
          <View style={styles.column}>
            <DayHeader
              date={date}
              today={today}
              onChange={setDate}
              onAssistant={() => router.push(ASSISTANT_HREF)}
              streak={streak}
            />

            {loading ? (
              <View style={styles.center} accessibilityLabel="Loading">
                <ActivityIndicator />
              </View>
            ) : error != null ? (
              <View style={styles.center}>
                <ThemedText type="default" style={styles.errorTitle}>
                  Couldn&apos;t load your day
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.errorBody}>
                  {error.message}
                </ThemedText>
                <Button label="Try again" variant="secondary" small onPress={refresh} />
              </View>
            ) : (
              <>
                <CalorieHero totals={totals} />
                <MacroRow totals={totals} />
                {totals.hasEstimates && (
                  <View style={styles.estimateRow}>
                    <EstimateBadge status="estimated" label="Some entries are estimates" />
                  </View>
                )}
                <MealList meals={meals} />
              </>
            )}
          </View>
        </ScrollView>
        <QuickActions />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six + Spacing.four,
  },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  errorTitle: { fontWeight: 700 },
  errorBody: { textAlign: 'center' },
  estimateRow: { alignItems: 'center' },
});
