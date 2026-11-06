import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeaderIconButton } from '@/components/ui/header';
import { Icon, type IconName } from '@/components/ui/icons';
import { Radius, Spacing } from '@/constants/theme';
import { toDateKey } from '@/core/nutrition/engine';
import { mealsRepo } from '@/data/repos';
import { resetComposer, useComposer } from '@/features/log/composer-store';
import { ItemRow } from '@/features/log/components/ItemRow';
import { MealTypeChips } from '@/features/log/components/MealTypeChips';
import { Sheet, SheetRow } from '@/features/log/components/Sheet';
import { Button, Notice, TextField } from '@/features/log/components/ui';
import {
  applyPlateSplit,
  defaultMealName,
  draftTotals,
  itemsMissingGrams,
  loadMealIntoDraft,
  removeDraftItem,
  resetDraft,
  scaleDraftItemGrams,
  setDraftItemEstimate,
  setDraftItemGrams,
  updateDraft,
  useDraft,
} from '@/features/log/draft-store';
import { errorMessage, round1 } from '@/features/log/format';
import { finishLogFlow, goCapture, goSearch } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';
import { persistPhoto, pickFromLibrary, resolvePhotoUri } from '@/services/camera';

export default function ReviewScreen() {
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useDraft();
  const composer = useComposer();
  const editing = !!mealId;
  const [photoSheet, setPhotoSheet] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

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
  const onScale = useCallback((id: string, factor: number) => scaleDraftItemGrams(id, factor), []);
  const onUseEstimate = useCallback((id: string, g: number, basis: string) => setDraftItemEstimate(id, g, basis), []);
  const onRemove = useCallback((id: string) => removeDraftItem(id), []);
  const plateMismatch = showPlate && Math.abs(plateSum - draft.statedTotalGrams!) > 0.5;

  const save = async () => {
    if (savingRef.current || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const chosen = draft.photoUri ?? composer.photo?.uri;
      const photoUri = chosen ? await persistPhoto(chosen).catch(() => chosen) : undefined;
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

  // A photo taken from this screen lands in the composer; prefer the draft's own photo.
  const photo = resolvePhotoUri(draft.photoUri ?? composer.photo?.uri);

  const choosePhoto = async () => {
    setPhotoSheet(false);
    setPhotoError(null);
    try {
      const picked = await pickFromLibrary();
      if (picked) updateDraft({ photoUri: picked.uri });
    } catch (e) {
      setPhotoError(errorMessage(e, 'Could not load that photo.'));
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Meal' : 'Create Meal',
          headerRight: () => (
            <HeaderIconButton icon={photo ? 'image' : 'more'} accessibilityLabel="Meal photo" onPress={() => setPhotoSheet(true)} />
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
            {photo ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Change meal photo" onPress={() => setPhotoSheet(true)}>
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add meal photo"
                onPress={() => setPhotoSheet(true)}
                style={({ pressed }) => [styles.addPhoto, { borderColor: theme.border, backgroundColor: theme.surface }, pressed && styles.pressed]}>
                <Icon name="image" size={20} color={theme.text} />
                <ThemedText style={styles.addPhotoLabel}>Add Meal Photo</ThemedText>
                <Icon name="chevron-down" size={16} color={theme.text} />
              </Pressable>
            )}
            {photoError ? <Notice tone="warn">{photoError}</Notice> : null}

            <TextField
              value={draft.name}
              onChangeText={(name) => updateDraft({ name })}
              placeholder={draft.items.length ? placeholderName : 'Tap to Name'}
              accessibilityLabel="Meal name"
              style={styles.name}
              containerStyle={styles.nameBox}
              returnKeyType="done"
              trailing={<Icon name="pencil" size={18} color={theme.text} />}
            />

            <View style={[styles.totalsCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <View style={[styles.flameBox, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="flame" size={26} filled color={theme.text} />
              </View>
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  Calories
                </ThemedText>
                <ThemedText style={styles.caloriesValue}>{Math.round(totals.calories)}</ThemedText>
              </View>
            </View>
            <View style={styles.macroRow}>
              <MacroTile label="Protein" icon="drumstick" value={totals.protein} color={theme.protein} />
              <MacroTile label="Carbs" icon="wheat" value={totals.carbs} color={theme.carbs} />
              <MacroTile label="Fats" icon="drop" value={totals.fat} color={theme.fat} />
            </View>

            <MealTypeChips value={draft.mealType} onChange={(mealType) => updateDraft({ mealType })} />

            {draft.clarification ? (
              <Notice tone="info" title="One question">
                {draft.clarification}
              </Notice>
            ) : null}
            {showPlate ? (
              <Notice
                tone={plateMismatch ? 'warn' : 'good'}
                title={`Plate weighed ${round1(draft.statedTotalGrams!)} g`}
                actionLabel={plateMismatch ? 'Split plate weight across items' : undefined}
                onAction={plateMismatch ? applyPlateSplit : undefined}>
                {plateMismatch
                  ? `Item weights below are estimates and add up to ${round1(plateSum)} g. Type the weights you know, or split the plate weight in proportion to the estimates (still an estimate).`
                  : 'Item weights add up to the plate weight. Each share is still an estimate unless you weighed it.'}
              </Notice>
            ) : null}
            {draft.notes ? (
              <ThemedText type="small" themeColor="textSecondary">
                {draft.notes}
              </ThemedText>
            ) : null}

            <View style={styles.itemsHeader}>
              <Icon name="bowl" size={26} color={theme.text} />
              <ThemedText style={styles.itemsTitle} accessibilityRole="header">
                Meal Items
              </ThemedText>
            </View>
            {draft.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                hint={draft.portionHints?.[item.id]}
                onGramsChange={onGrams}
                onScale={onScale}
                onUseEstimate={onUseEstimate}
                onRemove={onRemove}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add items to this meal"
              onPress={addItem}
              style={({ pressed }) => [styles.addItems, { borderColor: theme.border, backgroundColor: theme.surface }, pressed && styles.pressed]}>
              <Icon name="plus" size={18} strokeWidth={2.2} color={theme.text} />
              <ThemedText style={styles.addItemsLabel}>Add items to this meal</ThemedText>
            </Pressable>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
            {saveError ? <Notice tone="bad">{saveError}</Notice> : null}
            {missing.length > 0 ? (
              <ThemedText type="small" style={{ color: theme.warning }}>
                Enter a weight for {missing.length === 1 ? missing[0].name : `${missing.length} items`} to save.
              </ThemedText>
            ) : null}
            <Button label={editing ? 'Save Changes' : 'Create Meal'} onPress={save} disabled={!canSave} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      )}

      <Sheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title="Add Meal Photo">
        <SheetRow
          title="Take Photo"
          onPress={() => {
            setPhotoSheet(false);
            goCapture();
          }}
        />
        <SheetRow title="Upload Photo" onPress={choosePhoto} />
        {draft.photoUri ? (
          <SheetRow
            title="Remove Photo"
            destructive
            onPress={() => {
              updateDraft({ photoUri: undefined });
              setPhotoSheet(false);
            }}
          />
        ) : null}
      </Sheet>
    </ThemedView>
  );
}

function MacroTile({ label, icon, value, color }: { label: string; icon: IconName; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.macroTile, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.macroHead}>
        <Icon name={icon} size={14} color={color} strokeWidth={2} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.macroLabel}>
          {label}
        </ThemedText>
      </View>
      <ThemedText style={styles.macroValue}>{`${Math.round(value * 10) / 10}g`}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  content: { padding: Spacing.three, gap: Spacing.two + Spacing.one },
  photo: { width: '100%', height: 200, borderRadius: Radius.lg },
  addPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  addPhotoLabel: { fontSize: 17, fontWeight: 600 },
  pressed: { opacity: 0.6 },
  name: { fontSize: 22, fontWeight: 600 },
  nameBox: { minHeight: 64 },
  totalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  flameBox: { width: 52, height: 52, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  caloriesValue: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  macroRow: { flexDirection: 'row', gap: Spacing.two },
  macroTile: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.one },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 12 },
  macroValue: { fontSize: 18, lineHeight: 22, fontWeight: 700 },
  itemsHeader: { alignItems: 'center', gap: Spacing.one, marginTop: Spacing.four },
  itemsTitle: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  addItems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
  },
  addItemsLabel: { fontSize: 16, fontWeight: 500 },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
});
