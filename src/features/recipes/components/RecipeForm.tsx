import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { itemTotals } from '@/core/nutrition/engine';
import type { Recipe } from '@/core/types';
import { recipesRepo } from '@/data/repos';
import { useTheme } from '@/hooks/use-theme';
import { extractRecipe } from '@/services/ai';

import {
  blankDraft,
  fromRecipeIngredient,
  isComplete,
  toRecipeIngredient,
  type DraftIngredient,
} from '../draft';
import { fmtG, href, numText, parseNum, routes, sourceLabel } from '../format';
import { pickRecipePhoto } from '../photo';
import { IngredientSheet } from './IngredientSheet';
import { NutritionPanel } from './NutritionPanel';
import { Badge, Button, Card, Field, Notice, Screen, SectionHeader, Segmented, layout } from './ui';

type EntryMode = 'describe' | 'manual';

function IngredientRow({
  ing,
  onEdit,
  onRemove,
}: {
  ing: DraftIngredient;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const complete = isComplete(ing);
  const kcal = complete ? Math.round(itemTotals(ing.per100g, ing.grams).calories) : null;
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${ing.name}`} onPress={onEdit} style={styles.ingMain}>
        <View style={layout.row}>
          <ThemedText type="default" style={styles.ingName} numberOfLines={2}>
            {ing.name}
          </ThemedText>
          {ing.estimateStatus === 'estimated' ? <Badge label="estimate" tone="estimate" /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {ing.grams ? fmtG(ing.grams) : 'Amount needed'}
          {kcal != null ? ` · ${kcal} kcal` : ''}
          {ing.per100g ? ` · ${sourceLabel(ing.source)}` : ''}
        </ThemedText>
        {ing.hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            You said: {ing.hint}
          </ThemedText>
        ) : null}
        {!complete ? (
          <ThemedText type="small" style={{ color: theme.warning }}>
            {!ing.per100g ? 'Needs nutrition values. Tap to look up.' : 'Needs an amount in grams.'}
          </ThemedText>
        ) : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${ing.name}`} onPress={onRemove} hitSlop={8}>
        <ThemedText type="small" style={{ color: theme.warning }}>
          Remove
        </ThemedText>
      </Pressable>
    </Card>
  );
}

/** Create or edit a recipe: describe it to the AI or fill the form by hand. */
export function RecipeForm({ mode, recipe }: { mode: 'create' | 'edit'; recipe?: Recipe }) {
  const router = useRouter();
  const [entry, setEntry] = useState<EntryMode>(mode === 'create' ? 'describe' : 'manual');

  const [name, setName] = useState(recipe?.name ?? '');
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(recipe?.photoUri);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    () => recipe?.ingredients.map(fromRecipeIngredient) ?? []
  );
  const [cooked, setCooked] = useState(numText(recipe?.cookedWeightG));
  const [servings, setServings] = useState(numText(recipe?.servings));

  const [describeText, setDescribeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);

  const [editing, setEditing] = useState<DraftIngredient | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const complete = useMemo(() => ingredients.filter(isComplete).map(toRecipeIngredient), [ingredients]);
  const incompleteCount = ingredients.length - complete.length;
  const cookedG = parseNum(cooked);
  const servingsN = parseNum(servings);

  const describe = async () => {
    const text = describeText.trim();
    if (!text) return setExtractError('Describe the dish and its ingredients first.');
    setExtracting(true);
    setExtractError(null);
    setClarification(null);
    try {
      const res = await extractRecipe({ text });
      if (!name.trim() && res.name) setName(res.name);
      setIngredients((prev) => [
        ...prev,
        ...res.ingredients.map<DraftIngredient>((i) => ({
          ...blankDraft(i.name),
          grams: i.grams != null && i.grams > 0 ? i.grams : undefined,
          // Quantities from a description are the model's conversion, so flag them as estimates until the user confirms.
          estimateStatus: 'estimated',
          hint: i.quantityText ?? undefined,
        })),
      ]);
      if (!cooked.trim() && res.cookedWeightG) setCooked(numText(res.cookedWeightG));
      if (!servings.trim() && res.servings) setServings(numText(res.servings));
      setClarification(res.clarification);
      setEntry('manual');
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  };

  const choosePhoto = async () => {
    setPhotoError(null);
    try {
      const uri = await pickRecipePhoto();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : String(e));
    }
  };

  const upsertIngredient = (d: DraftIngredient) => {
    setIngredients((list) => (list.some((x) => x.id === d.id) ? list.map((x) => (x.id === d.id ? d : x)) : [...list, d]));
    setEditing(null);
  };

  const save = async () => {
    if (!name.trim()) return setFormError('Give the recipe a name.');
    if (ingredients.length === 0) return setFormError('Add at least one ingredient.');
    if (incompleteCount > 0) {
      return setFormError(`${incompleteCount} ingredient${incompleteCount === 1 ? ' needs' : 's need'} an amount and nutrition values.`);
    }
    if (cooked.trim() && (cookedG == null || cookedG <= 0)) return setFormError('Cooked weight must be a positive number of grams.');
    if (servings.trim() && (servingsN == null || servingsN <= 0)) return setFormError('Servings must be a positive number.');

    setSaving(true);
    setFormError(null);
    const data = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      photoUri,
      ingredients: complete,
      cookedWeightG: cookedG && cookedG > 0 ? cookedG : undefined,
      servings: servingsN && servingsN > 0 ? servingsN : undefined,
    };
    try {
      const saved = recipe ? await recipesRepo.update(recipe.id, data) : await recipesRepo.create(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (recipe) router.back();
      else router.replace(href(routes.recipe(saved.id)));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const confirmRemove = (ing: DraftIngredient) =>
    Alert.alert(`Remove ${ing.name || 'ingredient'}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setIngredients((l) => l.filter((x) => x.id !== ing.id)) },
    ]);

  return (
    <Screen footer={<Button label={recipe ? 'Save changes' : 'Save recipe'} onPress={save} loading={saving} />}>
      {mode === 'create' ? (
        <Segmented
          options={[
            { value: 'describe', label: 'Describe it' },
            { value: 'manual', label: 'Enter manually' },
          ]}
          value={entry}
          onChange={setEntry}
        />
      ) : null}

      {entry === 'describe' && mode === 'create' ? (
        <Card>
          <Field
            label="Describe the dish"
            value={describeText}
            onChangeText={setDescribeText}
            multiline
            placeholder="My mom made chicken adobo with 1 kg chicken, soy sauce, vinegar, garlic, some oil"
            hint="Include amounts when you know them. You will review every ingredient before saving."
          />
          {extractError ? (
            <Notice tone="error" title="Could not read that description" text={`${extractError} You can enter the recipe manually instead.`} />
          ) : null}
          <Button label="Prefill from description" onPress={describe} loading={extracting} />
          <Button label="Enter manually instead" variant="ghost" small onPress={() => setEntry('manual')} />
        </Card>
      ) : (
        <>
          {clarification ? <Notice tone="info" title="One question" text={clarification} /> : null}

          <Field label="Name" value={name} onChangeText={setName} placeholder="Mom's chicken adobo" />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Cooking method, who made it, what to remember" />

          <View style={layout.stack}>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Recipe photo" /> : null}
            <View style={layout.row}>
              <Button label={photoUri ? 'Replace photo' : 'Add photo'} variant="secondary" small onPress={choosePhoto} style={layout.grow} />
              {photoUri ? <Button label="Remove photo" variant="ghost" small onPress={() => setPhotoUri(undefined)} /> : null}
            </View>
            {photoError ? <Notice tone="error" text={photoError} /> : null}
          </View>

          <SectionHeader title="Ingredients" />
          {ingredients.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Add each ingredient with its raw weight. Nutrition comes from a food database lookup or values you enter.
            </ThemedText>
          ) : null}
          {ingredients.map((ing) => (
            <IngredientRow key={ing.id} ing={ing} onEdit={() => setEditing(ing)} onRemove={() => confirmRemove(ing)} />
          ))}
          <Button label="Add ingredient" variant="secondary" onPress={() => setEditing('new')} />

          <SectionHeader title="Cooked batch" />
          <View style={layout.row}>
            <Field
              style={layout.grow}
              label="Cooked weight (optional)"
              value={cooked}
              onChangeText={setCooked}
              keyboardType="decimal-pad"
              suffix="g"
              placeholder="e.g. 1450"
            />
            <Field
              style={layout.grow}
              label="Servings (optional)"
              value={servings}
              onChangeText={setServings}
              keyboardType="decimal-pad"
              placeholder="e.g. 6"
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Weigh the whole finished dish (pot excluded). Cooking changes water weight, so cooked and raw per-100 g values differ.
          </ThemedText>

          {ingredients.length > 0 ? (
            <>
              <SectionHeader title="Totals" />
              <NutritionPanel
                ingredients={complete}
                cookedWeightG={cookedG && cookedG > 0 ? cookedG : undefined}
                servings={servingsN && servingsN > 0 ? servingsN : undefined}
                incompleteCount={incompleteCount}
              />
            </>
          ) : null}

          {formError ? <Notice tone="error" text={formError} /> : null}
        </>
      )}

      {editing ? (
        <IngredientSheet
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={upsertIngredient}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ingMain: { gap: Spacing.half },
  ingName: { flex: 1, fontWeight: 600 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md },
});
