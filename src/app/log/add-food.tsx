import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { per100gFromTotals } from '@/core/nutrition/engine';
import { foodsRepo } from '@/data/repos';
import { Button, Chip, Notice, TextField } from '@/features/log/components/ui';
import { createdFoodStore } from '@/features/log/created-food-store';
import { errorMessage } from '@/features/log/format';

function num(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

type Basis = '100g' | 'serving';

/** Reference "Add Food" row: outlined box, grey label on the left, value typed on the right, unit after it. */
function Field({
  label,
  required,
  suffix,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  required?: boolean;
  suffix?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
}) {
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      accessibilityLabel={label}
      style={styles.input}
      leading={
        <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
          {label}
          {required ? '*' : ''}
        </ThemedText>
      }
      trailing={
        suffix ? (
          <ThemedText type="small" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        ) : undefined
      }
    />
  );
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
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

  const unit = basis === 'serving' ? 'per serving' : 'per 100 g';

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Field label="Brand name" value={brand} onChangeText={setBrand} placeholder="ex. Campbell's" />
          <Field label="Description" required value={name} onChangeText={setName} placeholder="ex. Chicken noodle soup" />
          <Field label="Serving size" required={basis === 'serving'} value={servingLabel} onChangeText={setServingLabel} placeholder="ex. 1 cup" />
          <Field
            label="Serving weight"
            required={basis === 'serving'}
            suffix="(g)"
            value={servingGrams}
            onChangeText={setServingGrams}
            placeholder="ex. 240"
            keyboardType="decimal-pad"
          />

          <ThemedText type="small" themeColor="textSecondary" style={styles.basisLabel}>
            Nutrition facts
          </ThemedText>
          <View style={styles.chips}>
            <Chip label="Per 100 g" selected={basis === '100g'} onPress={() => setBasis('100g')} />
            <Chip label="Per serving" selected={basis === 'serving'} onPress={() => setBasis('serving')} />
          </View>
          <Field label="Calories" required value={cal} onChangeText={setCal} placeholder="0" keyboardType="decimal-pad" />
          <Field label="Protein" suffix="(g)" value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" />
          <Field label="Carbs" suffix="(g)" value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" />
          <Field label="Total fat" suffix="(g)" value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" />
          <ThemedText type="small" themeColor="textSecondary">
            {basis === 'serving'
              ? `Values are what the label shows ${unit}; the app converts them to per 100 g.`
              : 'Values are per 100 g. Foods you create are saved to My foods.'}
          </ThemedText>
          {error ? <Notice tone="bad">{error}</Notice> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
          <Button label="Save food" onPress={save} disabled={!canSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two + Spacing.one },
  fieldLabel: { fontSize: 15, minWidth: 110 },
  input: { textAlign: 'right' },
  basisLabel: { marginTop: Spacing.two },
  chips: { flexDirection: 'row', gap: Spacing.two },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
});
