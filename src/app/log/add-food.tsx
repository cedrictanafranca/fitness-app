import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { per100gFromTotals } from '@/core/nutrition/engine';
import { foodsRepo } from '@/data/repos';
import { Button, Chip, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import { createdFoodStore } from '@/features/log/created-food-store';
import { errorMessage } from '@/features/log/format';
import { useTheme } from '@/hooks/use-theme';

function num(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

type Basis = '100g' | 'serving';

/** Label on the left, input on the right with a unit suffix: the "Add Food" row layout. */
function Field({
  label,
  required,
  suffix,
  children,
}: {
  label: string;
  required?: boolean;
  suffix?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
        {required ? '*' : ''}
      </ThemedText>
      <View style={styles.fieldInput}>{children}</View>
      {suffix ? (
        <ThemedText type="small" themeColor="textSecondary">
          {suffix}
        </ThemedText>
      ) : null}
    </View>
  );
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [basis, setBasis] = useState<Basis>('100g');
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calories = num(cal);
  const sg = num(servingGrams);
  const servingOk = sg != null && !Number.isNaN(sg) && sg > 0;
  const canSave =
    name.trim().length > 0 &&
    calories != null &&
    !Number.isNaN(calories) &&
    (basis === '100g' || servingOk) &&
    !saving;

  const save = async () => {
    if (!canSave || calories == null) return;
    const p = num(protein) ?? 0;
    const c = num(carbs) ?? 0;
    const f = num(fat) ?? 0;
    const label = servingLabel.trim();

    if ([p, c, f].some(Number.isNaN)) return setError('Protein, carbs and fat must be numbers, 0 or more.');
    if (basis === 'serving' && !label) return setError('Name the serving (for example "1 cup") so it can be reused.');
    if (basis === '100g' && label && !servingOk) return setError('Enter the serving size in grams.');
    if (basis === '100g' && !label && sg != null) return setError('Add a serving label (for example "1 cup").');

    const entered = { calories, protein: p, carbs: c, fat: f };
    const per100g = basis === 'serving' && sg ? per100gFromTotals(entered, sg) : entered;

    setSaving(true);
    setError(null);
    try {
      const food = await foodsRepo.create({
        name: name.trim(),
        brand: brand.trim() || undefined,
        per100g,
        source: 'custom',
        servings: label && servingOk && sg ? [{ label, grams: sg }] : [],
        saved: true,
      });
      createdFoodStore.set(food);
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Could not save this food.'));
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text }];
  const unit = basis === 'serving' ? 'per serving' : 'per 100 g';

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Field label="Brand name">
            <TextField value={brand} onChangeText={setBrand} placeholder="ex. Campbell's" accessibilityLabel="Brand" style={inputStyle} />
          </Field>
          <Field label="Description" required>
            <TextField value={name} onChangeText={setName} placeholder="ex. Chicken noodle soup" accessibilityLabel="Food name" style={inputStyle} />
          </Field>
          <Field label="Serving size" required={basis === 'serving'}>
            <TextField value={servingLabel} onChangeText={setServingLabel} placeholder="ex. 1 cup" accessibilityLabel="Serving label" style={inputStyle} />
          </Field>
          <Field label="Serving weight" required={basis === 'serving'} suffix="g">
            <TextField
              value={servingGrams}
              onChangeText={setServingGrams}
              placeholder="ex. 240"
              keyboardType="decimal-pad"
              accessibilityLabel="Serving grams"
              style={inputStyle}
            />
          </Field>

          <SectionLabel>Nutrition</SectionLabel>
          <View style={styles.chips}>
            <Chip label="Per 100 g" selected={basis === '100g'} onPress={() => setBasis('100g')} />
            <Chip label="Per serving" selected={basis === 'serving'} onPress={() => setBasis('serving')} />
          </View>
          <Field label="Calories" required suffix="kcal">
            <TextField value={cal} onChangeText={setCal} placeholder="0" keyboardType="decimal-pad" accessibilityLabel={`Calories ${unit}`} style={inputStyle} />
          </Field>
          <Field label="Protein" suffix="(g)">
            <TextField value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" accessibilityLabel={`Protein ${unit}`} style={inputStyle} />
          </Field>
          <Field label="Carbs" suffix="(g)">
            <TextField value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" accessibilityLabel={`Carbs ${unit}`} style={inputStyle} />
          </Field>
          <Field label="Total fat" suffix="(g)">
            <TextField value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" accessibilityLabel={`Fat ${unit}`} style={inputStyle} />
          </Field>
          <ThemedText type="small" themeColor="textSecondary">
            {basis === 'serving'
              ? 'Values are what the label shows for one serving; the app converts them to per 100 g.'
              : 'Values are per 100 g. Foods you create are saved to My foods.'}
          </ThemedText>
          {error ? <Notice tone="bad">{error}</Notice> : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.backgroundSelected, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <Button label="Save food" onPress={save} disabled={!canSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
    minHeight: 52,
  },
  fieldLabel: { width: 120 },
  fieldInput: { flex: 1 },
  input: { backgroundColor: 'transparent', paddingHorizontal: 0, minHeight: 44, textAlign: 'right' },
  chips: { flexDirection: 'row', gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
});
