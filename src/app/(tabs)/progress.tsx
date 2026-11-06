import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLoggingStreak } from '@/features/home/use-logging-streak';
import { BmiCard } from '@/features/progress/components/bmi-card';
import { LogWeightSheet } from '@/features/progress/components/log-weight-sheet';
import { StatTiles } from '@/features/progress/components/stat-tiles';
import { WeightTrendCard } from '@/features/progress/components/weight-trend-card';
import { WeekCard } from '@/features/progress/components/week-card';
import { WeightCard } from '@/features/progress/components/weight-card';
import { loadProgress, PROGRESS_TABLES } from '@/features/progress/load-progress';
import { useLiveQuery } from '@/data/use-live-query';
import { useTheme } from '@/hooks/use-theme';

export default function ProgressScreen() {
  const theme = useTheme();
  const progress = useLiveQuery(() => loadProgress(), PROGRESS_TABLES);
  const streak = useLoggingStreak();
  const [logOpen, setLogOpen] = useState(false);
  const data = progress.data;

  if (!data) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            {progress.error ? `Could not load progress: ${progress.error.message}` : 'Loading progress...'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const loggedDays = data.week.filter((t) => t.consumed.calories > 0).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={progress.loading} onRefresh={progress.refresh} />}>
        <View style={styles.column}>
          <ThemedText type="title" style={styles.heading} accessibilityRole="header">
            Progress
          </ThemedText>
          <StatTiles
            tiles={[
              { icon: 'flame', color: '#F0931E', value: String(streak), label: 'Day Streak' },
              { icon: 'bolt', color: theme.fat, value: String(loggedDays), label: 'Days Logged' },
            ]}
          />
          <WeightCard
            profile={data.profile}
            currentWeight={data.currentWeight}
            history={data.history}
            sevenDayAverageKg={data.sevenDayAverageKg}
            sevenDayEntryCount={data.sevenDayEntryCount}
            onLogWeight={() => setLogOpen(true)}
          />
          <WeightTrendCard history={data.trend} today={data.today} units={data.profile.units} />
          <WeekCard week={data.week} proteinTarget={data.profile.proteinTarget} />
          <BmiCard weightKg={data.currentWeight?.weightKg ?? data.profile.weightKg} heightCm={data.profile.heightCm} />
        </View>
      </ScrollView>

      <LogWeightSheet visible={logOpen} units={data.profile.units} onClose={() => setLogOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  heading: { marginBottom: Spacing.one },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: BottomTabInset },
});
