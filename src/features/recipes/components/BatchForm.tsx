import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Recipe, RecipeIngredient } from '@/core/types';
import { recipesRepo } from '@/data/repos';
import { useTheme } from '@/hooks/use-theme';

import { fromRecipeIngredient, toRecipeIngredient, type CompleteIngredient, type DraftIngredient } from '../draft';
import { numText, parseNum, sourceLabel } from '../format';
import { IngredientSheet } from './IngredientSheet';
import { NutritionPanel } from './NutritionPanel';
import { Button, Card, Chip, Field, Notice, Screen, SectionHeader, layout } from './ui';

interface Row {
  ing: DraftIngredient;
  gramsText: string;
}

/** A specific cooked batch: start from the recipe, adjust this time's amounts and the weighed cooked weight. */
export function BatchForm({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const theme = useTheme();
  const [rows, setRows] = useState<Row[]>(() =>
    recipe.ingredients.map((i) => ({ ing: fromRecipeIngredient(i), gramsText: numText(i.grams) }))
  );
  const [cooked, setCooked] = useState(numText(recipe.cookedWeightG));
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current: RecipeIngredient[] = useMemo(
    () =>
      rows.flatMap((r) => {
        const g = parseNum(r.gramsText);
        if (g == null || g <= 0 || !r.ing.per100g) return [];
        return [toRecipeIngredient({ ...r.ing, grams: g } as CompleteIngredient)];
      }),
    [rows]
  );
  const cookedG = parseNum(cooked);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.ing.id === id ? { ...r, ...patch } : r)));

  const save = async () => {
    if (rows.length === 0) return setError('A batch needs at least one ingredient.');
    if (current.length !== rows.length) return setError('Every ingredient needs an amount in grams. Remove the ones you did not use.');
    if (cookedG == null || cookedG <= 0) return setError('Enter the cooked weight of this batch in grams.');
    setSaving(true);
    setError(null);
    try {
      await recipesRepo.createBatch({
        recipeId: recipe.id,
        ingredients: current,
        cookedWeightG: cookedG,
        note: note.trim() || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button label="Save batch" onPress={save} loading={saving} />}>
      <ThemedText type="subtitle" style={styles.title}>
        {recipe.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Record what you actually used this time. A saved batch never changes, and meals logged from it keep these numbers.
      </ThemedText>

      <SectionHeader title="Ingredients used" />
      {rows.map((r) => (
        <Card key={r.ing.id}>
          <View style={layout.row}>
            <ThemedText type="default" style={styles.name} numberOfLines={2}>
              {r.ing.name}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${r.ing.name}`}
              hitSlop={8}
              onPress={() =>
                Alert.alert(`Remove ${r.ing.name}?`, 'It will not be part of this batch.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => setRows((l) => l.filter((x) => x.ing.id !== r.ing.id)) },
                ])
              }>
              <ThemedText type="small" style={{ color: theme.warning }}>
                Remove
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {r.ing.per100g ? `${Math.round(r.ing.per100g.calories)} kcal / 100 g · ${sourceLabel(r.ing.source)}` : ''}
          </ThemedText>
          <Field label="Amount" value={r.gramsText} onChangeText={(t) => update(r.ing.id, { gramsText: t })} keyboardType="decimal-pad" suffix="g" />
          <View style={layout.row}>
            <Chip
              label={r.ing.estimateStatus === 'estimated' ? 'Estimated amount' : 'Measured amount'}
              selected={r.ing.estimateStatus === 'estimated'}
              onPress={() =>
                update(r.ing.id, {
                  ing: { ...r.ing, estimateStatus: r.ing.estimateStatus === 'estimated' ? 'measured' : 'estimated' },
                })
              }
            />
          </View>
        </Card>
      ))}
      <Button label="Add ingredient" variant="secondary" onPress={() => setAdding(true)} />

      <SectionHeader title="This batch" />
      <Field
        label="Cooked weight"
        value={cooked}
        onChangeText={setCooked}
        keyboardType="decimal-pad"
        suffix="g"
        hint="Required. Weigh the whole finished dish."
      />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. extra vinegar, less oil" />

      {current.length > 0 ? (
        <NutritionPanel
          ingredients={current}
          cookedWeightG={cookedG && cookedG > 0 ? cookedG : undefined}
          servings={recipe.servings}
          incompleteCount={rows.length - current.length}
        />
      ) : null}

      {error ? <Notice tone="error" text={error} /> : null}

      {adding ? (
        <IngredientSheet
          onClose={() => setAdding(false)}
          onSave={(d) => {
            setRows((l) => [...l, { ing: d, gramsText: numText(d.grams) }]);
            setAdding(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 32 },
  name: { flex: 1, fontWeight: 600, marginBottom: Spacing.half },
});
