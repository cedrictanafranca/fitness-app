import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Food, Macros, NutritionSource } from '@/core/types';
import { useTheme } from '@/hooks/use-theme';
import { cacheFood, searchFoods, type FoodCandidate, type FoodSearchResult } from '@/services/foods';

import { blankDraft, type DraftIngredient } from '../draft';
import { fmtG, numText, parseNum, sourceLabel } from '../format';
import { EMPTY_PER100, parsePer100, per100ToFields, type Per100Fields } from '../validation';
import { Badge, Button, Card, Field, Loading, Notice, SheetModal, ToggleRow, layout } from './ui';

interface Selection {
  foodId?: string;
  name: string;
  per100g: Macros;
  source: NutritionSource;
}

function MatchRow({
  name,
  brand,
  per100g,
  source,
  selected,
  onPress,
}: {
  name: string;
  brand?: string;
  per100g: Macros;
  source: NutritionSource;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.match,
        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.primary : 'transparent' },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={layout.row}>
        <ThemedText type="default" style={styles.matchName} numberOfLines={2}>
          {name}
        </ThemedText>
        <Badge label={sourceLabel(source)} />
      </View>
      {brand ? (
        <ThemedText type="small" themeColor="textSecondary">
          {brand}
        </ThemedText>
      ) : null}
      <ThemedText type="small">
        {Math.round(per100g.calories)} kcal · {fmtG(per100g.protein)} protein · {fmtG(per100g.carbs)} carbs ·{' '}
        {fmtG(per100g.fat)} fat
        <ThemedText type="small" themeColor="textSecondary">
          {'  '}per 100 g
        </ThemedText>
      </ThemedText>
    </Pressable>
  );
}

/** Add or edit one ingredient: look up nutrition (local, then remote) or enter per-100 g values by hand. */
export function IngredientSheet({
  initial,
  onClose,
  onSave,
}: {
  initial?: DraftIngredient;
  onClose: () => void;
  onSave: (d: DraftIngredient) => void;
}) {
  const start = initial ?? blankDraft();
  const [name, setName] = useState(start.name);
  const [selection, setSelection] = useState<Selection | null>(
    start.per100g && start.source !== 'custom'
      ? { foodId: start.foodId, name: start.name, per100g: start.per100g, source: start.source }
      : null
  );
  const [manual, setManual] = useState(start.source === 'custom' && !!start.per100g);
  const [fields, setFields] = useState<Per100Fields>(
    start.source === 'custom' ? per100ToFields(start.per100g) : EMPTY_PER100
  );
  const [grams, setGrams] = useState(numText(start.grams));
  const [estimated, setEstimated] = useState(start.estimateStatus === 'estimated');

  const [results, setResults] = useState<FoodSearchResult | null>(null);
  const autoLookup = !!start.name.trim() && !start.per100g;
  const [searching, setSearching] = useState(autoLookup);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const searchSeq = useRef(0);

  const fetchResults = async (q: string) => {
    const seq = ++searchSeq.current;
    try {
      const res = await searchFoods(q);
      if (seq === searchSeq.current) setResults(res);
    } catch (e) {
      if (seq === searchSeq.current) {
        setResults(null);
        setSearchError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  const lookUp = () => {
    const q = name.trim();
    if (!q) return setError('Type an ingredient name first.');
    setSearching(true);
    setSearchError(null);
    setError(null);
    void fetchResults(q);
  };

  // Prefilled names (from the AI) that still need nutrition get an automatic lookup.
  useEffect(() => {
    if (!autoLookup) return;
    let cancelled = false;
    searchFoods(start.name.trim())
      .then((res) => {
        if (!cancelled) setResults(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setSearchError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseLocal = (f: Food) => {
    setSelection({ foodId: f.id, name: f.name, per100g: f.per100g, source: f.source });
    setManual(false);
    setError(null);
  };

  const chooseRemote = async (c: FoodCandidate) => {
    setPicking(true);
    setError(null);
    try {
      const food = await cacheFood(c);
      setSelection({ foodId: food.id, name: food.name, per100g: food.per100g, source: food.source });
    } catch {
      // Still usable for this recipe even if it could not be cached locally.
      setSelection({ name: c.name, per100g: c.per100g, source: c.source });
    } finally {
      setManual(false);
      setPicking(false);
    }
  };

  const save = () => {
    const finalName = name.trim();
    if (!finalName) return setError('Enter an ingredient name.');
    const g = parseNum(grams);
    if (g == null || g <= 0) return setError('Enter the amount in grams.');

    let per100g: Macros;
    let source: NutritionSource;
    let foodId: string | undefined;
    if (manual) {
      const parsed = parsePer100(fields);
      if (!parsed.value) return setError(parsed.error ?? 'Check the nutrition values.');
      per100g = parsed.value;
      source = 'custom';
    } else if (selection) {
      per100g = selection.per100g;
      source = selection.source;
      foodId = selection.foodId;
    } else {
      return setError('Look up the food and pick a match, or enter the nutrition values manually.');
    }

    onSave({
      id: start.id,
      name: finalName,
      foodId,
      grams: g,
      per100g,
      source,
      estimateStatus: estimated ? 'estimated' : 'measured',
    });
  };

  const setField = (k: keyof Per100Fields) => (t: string) => setFields((f) => ({ ...f, [k]: t }));

  return (
    <SheetModal visible title={initial ? 'Edit ingredient' : 'Add ingredient'} onClose={onClose}>
      <Field
        label="Ingredient"
        value={name}
        onChangeText={setName}
        placeholder="e.g. chicken thigh, raw"
        autoFocus={!initial}
        returnKeyType="search"
        onSubmitEditing={lookUp}
      />
      {start.hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          You described this as: {start.hint}
        </ThemedText>
      ) : null}

      <View style={layout.row}>
        <Button label="Look up" small onPress={lookUp} loading={searching} style={layout.grow} />
        <Button
          label="Enter manually"
          small
          variant={manual ? 'primary' : 'secondary'}
          onPress={() => {
            setManual(true);
            setSelection(null);
          }}
          style={layout.grow}
        />
      </View>

      {searchError ? (
        <Notice tone="warn" title="Lookup unavailable" text={`${searchError} You can still enter the values manually.`} />
      ) : null}
      {searching ? <Loading /> : null}

      {selection && !manual ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            SELECTED
          </ThemedText>
          <ThemedText type="default" style={styles.matchName}>
            {selection.name}
          </ThemedText>
          <ThemedText type="small">
            {Math.round(selection.per100g.calories)} kcal · {fmtG(selection.per100g.protein)} protein per 100 g ·{' '}
            {sourceLabel(selection.source)}
          </ThemedText>
        </Card>
      ) : null}

      {manual ? (
        <View style={layout.stack}>
          <Notice tone="info" text="Per 100 g of this ingredient as you add it (raw weight for raw ingredients)." />
          <Field label="Calories" value={fields.calories} onChangeText={setField('calories')} keyboardType="decimal-pad" suffix="kcal / 100 g" />
          <View style={layout.row}>
            <Field style={layout.grow} label="Protein" value={fields.protein} onChangeText={setField('protein')} keyboardType="decimal-pad" suffix="g" />
            <Field style={layout.grow} label="Carbs" value={fields.carbs} onChangeText={setField('carbs')} keyboardType="decimal-pad" suffix="g" />
            <Field style={layout.grow} label="Fat" value={fields.fat} onChangeText={setField('fat')} keyboardType="decimal-pad" suffix="g" />
          </View>
        </View>
      ) : null}

      {results && !manual ? (
        <View style={layout.stack}>
          {results.local.length > 0 ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              YOUR FOODS
            </ThemedText>
          ) : null}
          {results.local.map((f) => (
            <MatchRow
              key={f.id}
              name={f.name}
              brand={f.brand}
              per100g={f.per100g}
              source={f.source}
              selected={selection?.foodId === f.id}
              onPress={() => chooseLocal(f)}
            />
          ))}
          {results.remote.length > 0 ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              FOOD DATABASES
            </ThemedText>
          ) : null}
          {results.remote.map((c) => (
            <MatchRow
              key={c.sourceRef}
              name={c.name}
              brand={c.brand}
              per100g={c.per100g}
              source={c.source}
              selected={false}
              onPress={() => void chooseRemote(c)}
            />
          ))}
          {results.local.length === 0 && results.remote.length === 0 ? (
            <Notice tone="info" text="No matches. Try a simpler name, or enter the values manually." />
          ) : null}
          {picking ? <Loading /> : null}
        </View>
      ) : null}

      <Field
        label="Amount"
        value={grams}
        onChangeText={setGrams}
        keyboardType="decimal-pad"
        suffix="g"
        placeholder="e.g. 1000"
        hint="Required. Weight as added to the pot (raw weight for raw ingredients)."
      />
      <ToggleRow
        label="Estimated amount"
        hint="Turn on when you are guessing the weight."
        value={estimated}
        onValueChange={setEstimated}
      />

      {error ? <Notice tone="error" text={error} /> : null}
      <Button label={initial ? 'Save ingredient' : 'Add ingredient'} onPress={save} />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  match: {
    borderRadius: Radius.md,
    borderWidth: 2,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  matchName: { flex: 1, fontWeight: 600 },
});
