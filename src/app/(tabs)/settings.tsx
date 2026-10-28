import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLiveQuery } from '@/data/use-live-query';
import { profileRepo } from '@/data/repos';
import { SaveBar } from '@/features/settings/components/save-bar';
import { useSettingsForm } from '@/features/settings/use-settings-form';
import { ActivitySection } from '@/features/settings/sections/activity-section';
import { DataSection } from '@/features/settings/sections/data-section';
import { ProfileSection } from '@/features/settings/sections/profile-section';
import { TargetsSection } from '@/features/settings/sections/targets-section';

export default function SettingsScreen() {
  const profile = useLiveQuery(() => profileRepo.get(), ['profile']);
  const form = useSettingsForm(profile.data);

  if (!form.draft) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centered}>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.error ? `Could not load settings: ${profile.error.message}` : 'Loading settings...'}
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const { draft, errors } = form;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.column}>
          <ThemedText type="title" style={styles.heading}>
            Settings
          </ThemedText>
          <ProfileSection
            draft={draft}
            errors={errors}
            onField={form.setField}
            onUnits={form.setUnits}
          />
          <TargetsSection draft={draft} errors={errors} onField={form.setField} />
          <ActivitySection draft={draft} onField={form.setField} />
          <DataSection />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <SaveBar
            canSave={form.canSave}
            saving={form.saving}
            saved={form.saved}
            dirty={form.dirty}
            hasErrors={form.hasErrors}
            saveError={form.saveError}
            onSave={() => void form.save()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
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
  footer: {
    alignItems: 'center',
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
