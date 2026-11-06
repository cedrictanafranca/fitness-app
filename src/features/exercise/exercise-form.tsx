import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icons';
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
import { Button, Chip, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import { errorMessage } from '@/features/log/format';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  /** Called with the chosen activity so the screen can title its header; null when back on the list. */
  onKindChange?: (label: string | null) => void;
  onSaved: () => void;
}

const KIND_ICONS: Record<ActivityKind, IconName> = {
  run: 'run',
  walk: 'walk',
  cycle: 'bike',
  weights: 'dumbbell',
  other: 'bolt',
};

type Step = 'pick' | 'details' | 'calories';

/** Pick an activity, set intensity and duration, then confirm the (editable) calorie estimate. */
export function ExerciseForm({ onKindChange, onSaved }: Props) {
  const theme = useTheme();
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [step, setStep] = useState<Step>('pick');
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

  const choose = (k: ActivityKind) => {
    setKind(k);
    setStep('details');
    onKindChange?.(activityInfo(k).label);
  };

  const back = () => {
    if (step === 'calories') {
      setStep('details');
      return;
    }
    setKind(null);
    setStep('pick');
    onKindChange?.(null);
  };

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

  if (!kind || step === 'pick') {
    return (
      <View style={styles.list}>
        <ThemedText type="title" style={styles.title} accessibilityRole="header">
          Log Exercise
        </ThemedText>
        {ACTIVITY_KINDS.map((a) => (
          <Pressable
            key={a.kind}
            accessibilityRole="button"
            onPress={() => choose(a.kind)}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <Icon name={KIND_ICONS[a.kind]} size={26} color={theme.text} />
            <View style={styles.rowText}>
              <ThemedText style={styles.rowTitle}>{a.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {a.description}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  const info = activityInfo(kind);
  // Shown high → low like the reference, so the slider knob rises with effort.
  const shownIntensities = [...INTENSITIES].reverse();
  const selectedIndex = shownIntensities.findIndex((i) => i.value === intensity);

  if (step === 'calories') {
    return (
      <View style={styles.form}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to duration" onPress={back} hitSlop={8} style={styles.backRow}>
          <Icon name="back" size={18} color={theme.textSecondary} />
          <ThemedText type="smallBold" themeColor="textSecondary">
            {`${info.label} · ${shownIntensities[selectedIndex].label} · ${Math.round(minutes)} min`}
          </ThemedText>
        </Pressable>

        <SectionLabel icon={<Icon name="flame" size={22} filled color={theme.text} />}>Calories burned</SectionLabel>
        <TextField
          value={shownCalories}
          onChangeText={(t) => {
            setCaloriesTouched(true);
            setCaloriesText(t);
          }}
          keyboardType="number-pad"
          placeholder="kcal"
          accessibilityLabel="Calories burned"
          style={styles.caloriesInput}
          containerStyle={styles.caloriesBox}
          trailing={
            <ThemedText type="small" themeColor="textSecondary">
              kcal
            </ThemedText>
          }
        />
        <ThemedText type="small" themeColor="textSecondary">
          {estimate != null
            ? `Estimated from ${info.met[intensity]} MET × ${Math.round(weightKg ?? 0)} kg × ${Math.round(minutes)} min. Edit it if your watch says otherwise.`
            : 'Enter a duration to get an estimate.'}
        </ThemedText>
        {error ? <Notice tone="bad">{error}</Notice> : null}
        <Button label="Log exercise" onPress={save} disabled={!canSave} loading={saving} style={styles.cta} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <SectionLabel icon={<Icon name="sun" size={22} color={theme.text} />}>Set intensity</SectionLabel>
      <View style={[styles.intensityCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.intensityOptions}>
          {shownIntensities.map((i) => {
            const selected = i.value === intensity;
            return (
              <Pressable
                key={i.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setIntensity(i.value)}
                style={styles.intensity}>
                <ThemedText style={[styles.intensityLabel, selected && styles.intensitySelected, { color: selected ? theme.text : theme.text }]}>
                  {i.label}
                </ThemedText>
                <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                  {i.hint}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.slider} accessible={false}>
          <View style={[styles.sliderTrack, { backgroundColor: theme.surface }]} />
          <View
            style={[
              styles.sliderFill,
              { backgroundColor: theme.text, height: `${(1 - (selectedIndex + 0.5) / shownIntensities.length) * 100}%` },
            ]}
          />
          <View
            style={[
              styles.sliderKnob,
              { backgroundColor: theme.text, borderColor: theme.surface, top: `${((selectedIndex + 0.5) / shownIntensities.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <SectionLabel icon={<Icon name="timer" size={22} color={theme.text} />}>Duration</SectionLabel>
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
        containerStyle={{ borderColor: theme.text, borderWidth: 1.5 }}
      />

      {error ? <Notice tone="bad">{error}</Notice> : null}
      <Button label="Continue" onPress={() => setStep('calories')} disabled={!validMinutes} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two + Spacing.one },
  title: { marginBottom: Spacing.five },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three + Spacing.one, padding: Spacing.three + Spacing.one, borderRadius: Radius.lg, minHeight: 92 },
  rowText: { flex: 1, gap: Spacing.half },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  pressed: { opacity: 0.7 },
  form: { gap: Spacing.two + Spacing.one },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  intensityCard: { flexDirection: 'row', borderRadius: Radius.lg, padding: Spacing.three, paddingVertical: Spacing.four, gap: Spacing.three },
  intensityOptions: { flex: 1, gap: Spacing.three },
  intensity: { gap: 2 },
  intensityLabel: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  intensitySelected: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  slider: { width: 24, alignItems: 'center' },
  sliderTrack: { position: 'absolute', top: 0, bottom: 0, width: 10, borderRadius: 5 },
  sliderFill: { position: 'absolute', bottom: 0, width: 10, borderRadius: 5 },
  sliderKnob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 3, marginTop: -11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  caloriesBox: { minHeight: 72 },
  caloriesInput: { fontSize: 32, fontWeight: 700 },
  cta: { marginTop: Spacing.three },
});
