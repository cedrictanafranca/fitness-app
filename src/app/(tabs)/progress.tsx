import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { LogWeightSheet } from '@/features/progress/components/log-weight-sheet';
import { WeekCard } from '@/features/progress/components/week-card';
import { WeightCard } from '@/features/progress/components/weight-card';
import { loadProgress, PROGRESS_TABLES } from '@/features/progress/load-progress';
import { useLiveQuery } from '@/data/use-live-query';

export default function ProgressScreen() {
  const progress = useLiveQuery(() => loadProgress(), PROGRESS_TABLES);
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={progress.loading} onRefresh={progress.refresh} />}>
        <View style={styles.column}>
          <ThemedText type="title" style={styles.heading}>
            Progress
          </ThemedText>
          <WeightCard
            profile={data.profile}
            currentWeight={data.currentWeight}
            history={data.history}
            sevenDayAverageKg={data.sevenDayAverageKg}
            sevenDayEntryCount={data.sevenDayEntryCount}
            onLogWeight={() => setLogOpen(true)}
          />
          <WeekCard week={data.week} proteinTarget={data.profile.proteinTarget} />
        </View>
      </ScrollView>

      <LogWeightSheet
        visible={logOpen}
        units={data.profile.units}
        onClose={() => setLogOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  heading: {
    marginBottom: Spacing.one,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: BottomTabInset,
  },
});
