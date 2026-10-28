import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import {
  ACTIVITY_KINDS,
  DURATION_PRESETS_MIN,
  INTENSITIES,
  activityInfo,
  estimateCaloriesBurned,
  type ActivityKind,
  type Intensity,
} from '@/core/fitness/met';
import { toDateKey } from '@/core/nutrition/engine';
import { activityRepo, profileRepo } from '@/data/repos';
import { Chip, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import { errorMessage } from '@/features/log/format';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  onSaved: () => void;
}

/** Pick an activity, intensity and duration; the app estimates calories (editable) and credits the day. */
export function ExerciseForm({ onSaved }: Props) {
  const theme = useTheme();
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [minutesText, setMinutesText] = useState('30');
  const [caloriesText, setCaloriesText] = useState('');
  const [caloriesTouched, setCaloriesTouched] = useState(false);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profileRepo
      .get()
      .then((p) => {
        if (!cancelled) setWeightKg(p.weightKg);
      })
      .catch(() => {
        if (!cancelled) setWeightKg(70);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const minutes = Number(minutesText.replace(',', '.'));
  const validMinutes = Number.isFinite(minutes) && minutes > 0;
  const estimate = useMemo(() => {
    if (!kind || !validMinutes || weightKg == null) return null;
    return estimateCaloriesBurned({ kind, intensity, minutes, weightKg });
  }, [kind, intensity, minutes, validMinutes, weightKg]);

  // Follow the estimate until the user types their own number.
  const shownCalories = caloriesTouched ? caloriesText : estimate != null ? String(estimate) : '';
  const calories = Number(shownCalories);
  const canSave = !!kind && validMinutes && Number.isFinite(calories) && calories > 0 && !saving;

  const save = async () => {
    if (!canSave || !kind) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      await activityRepo.upsert({
        date: toDateKey(now),
        source: 'manual',
        activityType: activityInfo(kind).label,
        caloriesBurned: Math.round(calories),
        durationMin: Math.round(minutes),
        timestamp: now.toISOString(),
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Could not save this workout.'));
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <View style={styles.list}>
        <ThemedText style={styles.title}>Log exercise</ThemedText>
        {ACTIVITY_KINDS.map((a) => (
          <Pressable
            key={a.kind}
            accessibilityRole="button"
            onPress={() => setKind(a.kind)}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.rowText}>
              <ThemedText type="default" style={styles.rowTitle}>
                {a.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {a.description}
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary">›</ThemedText>
          </Pressable>
        ))}
      </View>
    );
  }

  const info = activityInfo(kind);
  return (
    <View style={styles.form}>
      <Pressable accessibilityRole="button" accessibilityLabel="Change activity" onPress={() => setKind(null)} hitSlop={8}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          ‹ {info.label}
        </ThemedText>
      </Pressable>

      <SectionLabel>Set intensity</SectionLabel>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {INTENSITIES.map((i) => {
          const selected = i.value === intensity;
          return (
            <Pressable
              key={i.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setIntensity(i.value)}
              style={[styles.intensity, selected && { backgroundColor: theme.background, borderRadius: Radius.md }]}>
              <ThemedText type={selected ? 'default' : 'small'} style={selected ? styles.intensitySelected : undefined}>
                {i.label}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {i.hint}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Duration</SectionLabel>
      <View style={styles.chips}>
        {DURATION_PRESETS_MIN.map((m) => (
          <Chip key={m} label={`${m} mins`} selected={minutesText === String(m)} onPress={() => setMinutesText(String(m))} />
        ))}
      </View>
      <TextField
        value={minutesText}
        onChangeText={setMinutesText}
        keyboardType="number-pad"
        placeholder="Minutes"
        accessibilityLabel="Duration in minutes"
      />

      <SectionLabel>Calories burned</SectionLabel>
      <TextField
        value={shownCalories}
        onChangeText={(t) => {
          setCaloriesTouched(true);
          setCaloriesText(t);
        }}
        keyboardType="number-pad"
        placeholder="kcal"
        accessibilityLabel="Calories burned"
      />
      <ThemedText type="small" themeColor="textSecondary">
        {estimate != null
          ? `Estimated from ${info.met[intensity]} MET × ${Math.round(weightKg ?? 0)} kg × ${validMinutes ? Math.round(minutes) : 0} min. Edit it if your watch says otherwise.`
          : 'Enter a duration to get an estimate.'}
      </ThemedText>
      {error ? <Notice tone="bad">{error}</Notice> : null}
      <Button label="Save workout" onPress={save} disabled={!canSave} loading={saving} fullWidth style={styles.save} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 700, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg },
  rowText: { flex: 1, gap: Spacing.half },
  rowTitle: { fontWeight: 600 },
  pressed: { opacity: 0.7 },
  form: { gap: Spacing.two },
  card: { borderRadius: Radius.lg, padding: Spacing.one, gap: Spacing.half },
  intensity: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + Spacing.half, gap: Spacing.half },
  intensitySelected: { fontWeight: 700 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  save: { marginTop: Spacing.three },
});
