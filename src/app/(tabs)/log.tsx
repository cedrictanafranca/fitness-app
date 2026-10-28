import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { MealTypeChips } from '@/features/log/components/MealTypeChips';
import { RecentMealsSheet } from '@/features/log/components/RecentMealsSheet';
import { Sheet, SheetRow } from '@/features/log/components/Sheet';
import { Button, Icon, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import { analyzeComposer } from '@/features/log/analyze';
import { parseGrams, updateComposer, useComposer } from '@/features/log/composer-store';
import { resetDraft, startDraftFromMeal } from '@/features/log/draft-store';
import { errorMessage } from '@/features/log/format';
import { goCapture, goReview, goSearch } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';
import type { Meal } from '@/core/types';
import { pickFromLibrary } from '@/services/camera';
import { useSpeechToText } from '@/services/speech';

const ASSISTANT_HREF = '/assistant' as unknown as Href;

export default function LogScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const c = useComposer();
  const speech = useSpeechToText();

  const [photoSheet, setPhotoSheet] = useState(false);
  const [recentSheet, setRecentSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const baseText = useRef('');

  // Stream the live transcript into the text field while listening.
  useEffect(() => {
    if (!speech.listening && !speech.transcript) return;
    const base = baseText.current;
    updateComposer({ text: speech.transcript ? `${base}${base ? ' ' : ''}${speech.transcript}` : base });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
    } else {
      baseText.current = c.text.trim();
      void speech.start();
    }
  };

  const canAnalyze = (!!c.photo || c.text.trim().length > 0) && !busy;

  const analyze = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (speech.listening) speech.stop();
    setBusy(true);
    setError(null);
    try {
      const draft = await analyzeComposer(c);
      resetDraft(draft);
      goReview();
    } catch (e) {
      setError(errorMessage(e, 'Analysis failed.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const addManually = () => {
    resetDraft({ mealType: c.mealType, photoUri: c.photo?.uri, inputText: c.text.trim() || undefined });
    goSearch('start');
  };

  const searchFood = () => {
    resetDraft({ mealType: c.mealType });
    goSearch('start');
  };

  const repeatMeal = (meal: Meal) => {
    setRecentSheet(false);
    startDraftFromMeal(meal, c.mealType);
    goReview();
  };

  const choosePhoto = async () => {
    setPhotoSheet(false);
    setPhotoError(null);
    try {
      const photo = await pickFromLibrary();
      if (photo) updateComposer({ photo });
    } catch (e) {
      setPhotoError(errorMessage(e, 'Could not load that photo.'));
    }
  };

  const takePhoto = () => {
    setPhotoSheet(false);
    goCapture();
  };

  const weight = parseGrams(c.gramsText);

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + Spacing.three, paddingBottom: BottomTabInset + insets.bottom + Spacing.five },
          ]}>
          <ThemedText type="subtitle">Log a meal</ThemedText>

          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.photo ? 'Change meal photo' : 'Add meal photo'}
              onPress={() => setPhotoSheet(true)}
              style={[styles.photo, { backgroundColor: theme.backgroundElement }]}>
              {c.photo ? (
                <Image source={{ uri: c.photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.photoEmpty}>
                  <Icon name="camera.fill" fallback="+" size={24} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Photo
                  </ThemedText>
                </View>
              )}
            </Pressable>

            <View style={styles.textWrap}>
              <TextField
                value={c.text}
                onChangeText={(text) => updateComposer({ text })}
                placeholder="Describe what you ate…"
                multiline
                textAlignVertical="top"
                style={[
                  styles.text,
                  speech.listening ? { borderWidth: 1.5, borderColor: '#D14343' } : null,
                ]}
                accessibilityLabel="Meal description"
              />
              {speech.available ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={speech.listening ? 'Stop voice input' : 'Start voice input'}
                  onPress={toggleMic}
                  style={[
                    styles.mic,
                    { backgroundColor: speech.listening ? '#D14343' : theme.backgroundSelected },
                  ]}>
                  <Icon
                    name={speech.listening ? 'stop.fill' : 'mic.fill'}
                    fallback={speech.listening ? '■' : 'Mic'}
                    size={18}
                    color={speech.listening ? '#fff' : theme.text}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {speech.listening ? (
            <ThemedText type="small" themeColor="textSecondary">
              Listening… tap the mic to stop.
            </ThemedText>
          ) : null}
          {speech.error ? <Notice tone="warn">{speech.error}</Notice> : null}
          {photoError ? <Notice tone="warn">{photoError}</Notice> : null}

          <SectionLabel>Measured weight (g)</SectionLabel>
          <TextField
            value={c.gramsText}
            onChangeText={(gramsText) => updateComposer({ gramsText })}
            keyboardType="decimal-pad"
            placeholder="Optional"
            accessibilityLabel="Measured weight in grams"
          />
          <ThemedText type="small" themeColor="textSecondary">
            {weight != null
              ? `Treated as the whole plate (${weight} g) unless an item states its own weight.`
              : 'Weigh your plate? This is the whole plate unless items specify their own weight.'}
          </ThemedText>

          <SectionLabel>Meal</SectionLabel>
          <MealTypeChips
            value={c.mealType}
            onChange={(mealType) => updateComposer({ mealType, mealTypeTouched: true })}
          />

          <Button
            label={busy ? 'Analyzing…' : 'Analyze'}
            onPress={analyze}
            disabled={!canAnalyze}
            loading={busy}
            style={styles.analyze}
          />

          {error ? (
            <Notice tone="bad" title="Couldn't analyze this meal" actionLabel="Add manually" onAction={addManually}>
              {error}
            </Notice>
          ) : null}

          <View style={styles.secondary}>
            <Button label="Search food" variant="secondary" onPress={searchFood} />
            <Button label="Repeat a recent meal" variant="secondary" onPress={() => setRecentSheet(true)} />
            <Button label="Ask the assistant" variant="secondary" onPress={() => router.push(ASSISTANT_HREF)} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title="Meal photo">
        <SheetRow title="Take photo" onPress={takePhoto} />
        <SheetRow title="Choose from library" onPress={choosePhoto} />
        {c.photo ? (
          <SheetRow
            title="Remove photo"
            destructive
            onPress={() => {
              updateComposer({ photo: null });
              setPhotoSheet(false);
            }}
          />
        ) : null}
      </Sheet>

      <RecentMealsSheet visible={recentSheet} onClose={() => setRecentSheet(false)} onPick={repeatMeal} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  composer: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  photo: { width: 104, height: 104, borderRadius: 16, overflow: 'hidden' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  textWrap: { flex: 1 },
  text: { minHeight: 104, paddingTop: Spacing.two, paddingRight: 52 },
  mic: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyze: { marginTop: Spacing.three },
  secondary: { gap: Spacing.two, marginTop: Spacing.three },
});
