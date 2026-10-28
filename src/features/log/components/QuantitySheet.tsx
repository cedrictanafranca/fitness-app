import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { buildMealItem } from '@/core/nutrition/build';
import { itemTotals } from '@/core/nutrition/engine';
import type { MealItem } from '@/core/types';
import { newId } from '@/data/ids';
import { cacheFood } from '@/services/foods';

import { SOURCE_LABELS, errorMessage, macroLine } from '../format';
import type { Pickable } from '../pickable';
import { Sheet } from './Sheet';
import { Button, Chip, Notice, TextField } from './ui';

/** Pick grams or serving × quantity for a food/recipe, then hand back a MealItem. */
export function QuantitySheet({
  target,
  mealId,
  onClose,
  onConfirm,
}: {
  target: Pickable | null;
  mealId?: string;
  onClose: () => void;
  onConfirm: (item: MealItem) => void;
}) {
  return (
    <Sheet visible={!!target} onClose={onClose} title={target?.name}>
      {target ? <QuantityBody key={target.key} target={target} mealId={mealId} onConfirm={onConfirm} /> : null}
    </Sheet>
  );
}

function QuantityBody({
  target,
  mealId,
  onConfirm,
}: {
  target: Pickable;
  mealId?: string;
  onConfirm: (item: MealItem) => void;
}) {
  const [mode, setMode] = useState<'grams' | number>(target.servings.length > 0 ? 0 : 'grams');
  const [value, setValue] = useState(target.servings.length > 0 ? '1' : '100');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = Number(value.replace(',', '.'));
  const validAmount = Number.isFinite(amount) && amount > 0;
  const serving = mode !== 'grams' ? target.servings[mode] : undefined;
  const grams = !validAmount ? 0 : serving ? amount * serving.grams : amount;

  const preview = useMemo(
    () => (validAmount ? itemTotals(target.per100g, grams) : null),
    [target, validAmount, grams]
  );

  const confirm = async () => {
    if (!target || !validAmount || busy) return;
    setBusy(true);
    setError(null);
    try {
      let ref = target.ref;
      if (target.candidate) {
        const food = await cacheFood(target.candidate);
        ref = { kind: 'food', id: food.id };
      }
      const item = buildMealItem({
        id: newId(),
        mealId: mealId ?? '',
        name: target.name,
        ref,
        per100g: target.per100g,
        source: target.source,
        estimateStatus: target.source === 'ai_estimate' ? 'estimated' : 'measured',
        ...(serving
          ? { quantity: amount, unitLabel: serving.label, unitGrams: serving.grams }
          : { grams: amount }),
      });
      onConfirm(item);
    } catch (e) {
      setError(errorMessage(e, 'Could not add this food.'));
      setBusy(false);
    }
  };

  return (
    <>
      {target ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {[target.brand, SOURCE_LABELS[target.source]].filter(Boolean).join(' · ')} · per 100 g:{' '}
            {macroLine(target.per100g)}
          </ThemedText>

          <View style={styles.chips}>
            <Chip label="Grams" selected={mode === 'grams'} onPress={() => { setMode('grams'); setValue('100'); }} />
            {target.servings.map((s, i) => (
              <Chip
                key={`${s.label}-${i}`}
                label={`${s.label} (${Math.round(s.grams)} g)`}
                selected={mode === i}
                onPress={() => { setMode(i); setValue('1'); }}
              />
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextField
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel={mode === 'grams' ? 'Grams' : 'Quantity'}
              selectTextOnFocus
            />
            <ThemedText type="default" themeColor="textSecondary">
              {mode === 'grams' ? 'g' : '× serving'}
            </ThemedText>
          </View>

          {preview ? (
            <ThemedText type="small">
              {Math.round(grams)} g · {macroLine(preview)}
            </ThemedText>
          ) : null}
          {error ? <Notice tone="bad">{error}</Notice> : null}
          <Button label="Add to meal" onPress={confirm} disabled={!validAmount} loading={busy} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1 },
});
