import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { toDateKey } from '@/core/nutrition/engine';
import { mealsRepo } from '@/data/repos';
import { resetComposer } from '@/features/log/composer-store';
import { ItemRow } from '@/features/log/components/ItemRow';
import { MealTypeChips } from '@/features/log/components/MealTypeChips';
import { Button, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import {
  defaultMealName,
  draftTotals,
  itemsMissingGrams,
  loadMealIntoDraft,
  removeDraftItem,
  resetDraft,
  setDraftItemGrams,
  updateDraft,
  useDraft,
} from '@/features/log/draft-store';
import { errorMessage, round1 } from '@/features/log/format';
import { cancelLogFlow, finishLogFlow, goSearch } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';
import { persistPhoto, resolvePhotoUri } from '@/services/camera';

export default function ReviewScreen() {
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useDraft();
  const editing = !!mealId;

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  // EDIT mode: load the meal into the draft once.
  useEffect(() => {
    if (!mealId) return;
    let cancelled = false;
    mealsRepo
      .get(mealId)
      .then((meal) => {
        if (cancelled) return;
        if (!meal) setLoadError('This meal no longer exists.');
        else loadMealIntoDraft(meal);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(errorMessage(e, 'Could not load this meal.'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mealId]);

  const totals = draftTotals(draft.items);
  const missing = itemsMissingGrams(draft.items);
  const placeholderName = defaultMealName(draft.items) || 'Meal';
  const canSave = draft.items.length > 0 && missing.length === 0 && !saving && !loading;

  const plateSum = draft.items.reduce((s, i) => s + (i.grams ?? 0), 0);
  const showPlate = draft.statedTotalGrams != null && draft.items.length > 1;

  const onGrams = useCallback((id: string, g: number | undefined) => setDraftItemGrams(id, g), []);
  const onRemove = useCallback((id: string) => removeDraftItem(id), []);

  const save = async () => {
    if (savingRef.current || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const photoUri = draft.photoUri ? await persistPhoto(draft.photoUri).catch(() => draft.photoUri) : undefined;
      const name = draft.name.trim() || placeholderName;
      if (draft.mealId) {
        await mealsRepo.update(draft.mealId, {
          name,
          mealType: draft.mealType,
          photoUri,
          inputText: draft.inputText,
          items: draft.items.map((i) => ({ ...i, mealId: draft.mealId! })),
        });
      } else {
        const now = new Date();
        await mealsRepo.create({
          date: toDateKey(now),
          timestamp: now.toISOString(),
          mealType: draft.mealType,
          name,
          photoUri,
          inputText: draft.inputText,
          items: draft.items,
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetComposer();
      resetDraft();
      finishLogFlow();
    } catch (e) {
      setSaveError(errorMessage(e, 'Could not save this meal. Please try again.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  const addItem = () => goSearch('review');

  const photo = resolvePhotoUri(draft.photoUri);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: editing ? 'Edit meal' : 'Review meal',
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={cancelLogFlow} hitSlop={8}>
              <ThemedText type="default" style={{ color: theme.text }}>
                Cancel
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Notice tone="bad">{loadError}</Notice>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" /> : null}

            <TextField
              value={draft.name}
              onChangeText={(name) => updateDraft({ name })}
              placeholder={placeholderName}
              accessibilityLabel="Meal name"
              style={styles.name}
              returnKeyType="done"
            />

            <MealTypeChips value={draft.mealType} onChange={(mealType) => updateDraft({ mealType })} />

            {draft.clarification ? (
              <Notice tone="info" title="One question">
                {draft.clarification}
              </Notice>
            ) : null}
            {showPlate ? (
              <Notice tone="warn" title={`Plate weighed ${round1(draft.statedTotalGrams!)} g`}>
                {`We don't split a plate weight across items. Item weights below are estimates until you edit them. They add up to ${round1(plateSum)} g.`}
              </Notice>
            ) : null}
            {draft.notes ? (
              <ThemedText type="small" themeColor="textSecondary">
                {draft.notes}
              </ThemedText>
            ) : null}

            <SectionLabel>Items</SectionLabel>
            {draft.items.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No items yet. Add something to log.
              </ThemedText>
            ) : null}
            {draft.items.map((item) => (
              <ItemRow key={item.id} item={item} onGramsChange={onGrams} onRemove={onRemove} />
            ))}
            <Button label="Add item" variant="secondary" onPress={addItem} />
          </ScrollView>

          <View
            style={[
              styles.footer,
              { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected, paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}>
            <View style={styles.totals}>
              <Total label="Calories" value={`${Math.round(totals.calories)}`} />
              <Total label="Protein" value={`${totals.protein} g`} />
              <Total label="Carbs" value={`${totals.carbs} g`} />
              <Total label="Fat" value={`${totals.fat} g`} />
            </View>
            {saveError ? <Notice tone="bad">{saveError}</Notice> : null}
            {missing.length > 0 ? (
              <ThemedText type="small" style={{ color: '#D14343' }}>
                Enter a weight for {missing.length === 1 ? missing[0].name : `${missing.length} items`} to save.
              </ThemedText>
            ) : null}
            <Button label={editing ? 'Save changes' : 'Save meal'} onPress={save} disabled={!canSave} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.total}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  content: { padding: Spacing.three, gap: Spacing.two },
  photo: { width: '100%', height: 180, borderRadius: 16 },
  name: { fontSize: 20, fontWeight: '600' },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  totals: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'center', flex: 1 },
});
