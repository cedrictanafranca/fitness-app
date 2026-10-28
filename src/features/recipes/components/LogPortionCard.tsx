import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { buildMealItem } from '@/core/nutrition/build';
import { inferMealType, itemTotals, recipeNutrition, toDateKey } from '@/core/nutrition/engine';
import type { MealItemRef, MealType, Recipe, RecipeBatch } from '@/core/types';
import { newId } from '@/data/ids';
import { mealsRepo } from '@/data/repos';

import { basisLabel, formatDate, fmtG, href, parseNum, routes } from '../format';
import { Button, Card, Chip, Field, MacroSummary, Notice, Segmented, layout } from './ui';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

type AmountMode = 'grams' | 'servings';

/** "Log a portion": weigh what you ate (or count servings) and save it as a meal. */
export function LogPortionCard({
  recipe,
  batches,
  selectedId,
  onSelect,
}: {
  recipe: Recipe;
  batches: RecipeBatch[];
  /** 'recipe' or a batch id. */
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AmountMode>('grams');
  const [amount, setAmount] = useState('');
  const [mealType, setMealType] = useState<MealType>(() => inferMealType(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const batch = selectedId === 'recipe' ? undefined : batches.find((b) => b.id === selectedId);

  const source = useMemo(() => {
    if (batch) {
      const n = recipeNutrition(batch.ingredients, batch.cookedWeightG);
      return {
        ref: { kind: 'batch', id: batch.id } as MealItemRef,
        per100g: batch.per100g,
        hasEstimates: n.hasEstimates,
        basis: 'cooked' as const,
        basisWeight: batch.cookedWeightG,
        label: `Batch from ${formatDate(batch.createdAt)}`,
      };
    }
    const n = recipeNutrition(recipe.ingredients, recipe.cookedWeightG);
    return {
      ref: { kind: 'recipe', id: recipe.id } as MealItemRef,
      per100g: n.per100g,
      hasEstimates: n.hasEstimates,
      basis: n.basis,
      basisWeight: n.basis === 'cooked' ? (recipe.cookedWeightG ?? 0) : n.rawWeightG,
      label: 'Recipe',
    };
  }, [batch, recipe]);

  const servingCount = recipe.servings && recipe.servings > 0 ? recipe.servings : undefined;
  const canUseServings = !!servingCount && source.basisWeight > 0;
  const gramsPerServing = canUseServings && servingCount ? source.basisWeight / servingCount : 0;

  const amountN = parseNum(amount);
  const grams = amountN != null && amountN > 0 ? (mode === 'servings' ? amountN * gramsPerServing : amountN) : undefined;
  const preview = grams ? itemTotals(source.per100g, grams) : undefined;
  const estimated = source.hasEstimates || source.basis === 'raw';

  const log = async () => {
    if (!grams) return setError(mode === 'grams' ? 'Enter how many grams you ate.' : 'Enter how many servings you ate.');
    setSaving(true);
    setError(null);
    try {
      const now = new Date();
      const item = buildMealItem({
        id: newId(),
        mealId: '',
        name: recipe.name,
        ref: source.ref,
        per100g: source.per100g,
        source: 'recipe',
        estimateStatus: estimated ? 'estimated' : 'measured',
        grams,
        ...(mode === 'servings' && amountN ? { quantity: amountN, unitLabel: 'serving' } : {}),
      });
      await mealsRepo.create({
        date: toDateKey(now),
        timestamp: now.toISOString(),
        mealType,
        name: recipe.name,
        items: [item],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAmount('');
      setSaving(false);
      Alert.alert(
        'Logged',
        `${recipe.name}: ${fmtG(item.grams ?? 0)}, ${Math.round(item.totals.calories)} kcal, ${fmtG(item.totals.protein)} protein added to ${mealType}.`,
        [{ text: 'OK', onPress: () => router.navigate(href(routes.home)) }],
        { cancelable: false }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Card>
      <ThemedText type="subtitle" style={{ fontSize: 22, lineHeight: 28 }}>
        Log a portion
      </ThemedText>

      {batches.length > 0 ? (
        <View style={layout.stack}>
          <ThemedText type="small" themeColor="textSecondary">
            Use values from
          </ThemedText>
          <View style={layout.wrap}>
            <Chip label="Recipe" selected={!batch} onPress={() => onSelect('recipe')} />
            {batches.map((b) => (
              <Chip key={b.id} label={`Batch ${formatDate(b.createdAt)}`} selected={batch?.id === b.id} onPress={() => onSelect(b.id)} />
            ))}
          </View>
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        {source.label}: {Math.round(source.per100g.calories)} kcal · {fmtG(source.per100g.protein)} protein {basisLabel(source.basis)}
      </ThemedText>

      {source.basis === 'raw' ? (
        <Notice
          tone="warn"
          text="This recipe has no cooked weight, so values are per 100 g of raw ingredients. The portion will be logged as an estimate. Edit the recipe to add the cooked weight."
        />
      ) : null}

      {canUseServings ? (
        <Segmented
          options={[
            { value: 'grams', label: 'Grams' },
            { value: 'servings', label: 'Servings' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setAmount('');
          }}
        />
      ) : null}

      <Field
        label={mode === 'grams' ? 'Portion weight' : 'Servings eaten'}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        suffix={mode === 'grams' ? 'g' : 'servings'}
        placeholder={mode === 'grams' ? 'e.g. 250' : 'e.g. 1'}
        hint={
          mode === 'servings' && gramsPerServing > 0
            ? `1 serving ≈ ${fmtG(gramsPerServing)}${grams ? `, so ${fmtG(grams)} total` : ''}`
            : undefined
        }
      />

      <View style={layout.wrap}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m.value} label={m.label} selected={mealType === m.value} onPress={() => setMealType(m.value)} />
        ))}
      </View>

      {preview ? (
        <MacroSummary
          caption={estimated ? 'This portion (estimate)' : 'This portion'}
          calories={preview.calories}
          protein={preview.protein}
          carbs={preview.carbs}
          fat={preview.fat}
        />
      ) : null}

      {error ? <Notice tone="error" text={error} /> : null}
      <Button label="Log portion" onPress={log} loading={saving} disabled={!grams} />
    </Card>
  );
}
