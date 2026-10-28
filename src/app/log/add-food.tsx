import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { foodsRepo } from '@/data/repos';
import { Button, Notice, SectionLabel, TextField } from '@/features/log/components/ui';
import { createdFoodStore } from '@/features/log/created-food-store';
import { errorMessage } from '@/features/log/format';

function num(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export default function AddFoodScreen() {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    const calories = num(cal);
    const p = num(protein) ?? 0;
    const c = num(carbs) ?? 0;
    const f = num(fat) ?? 0;
    const sg = num(servingGrams);
    const label = servingLabel.trim();

    if (!name.trim()) return setError('Give the food a name.');
    if (calories == null || Number.isNaN(calories)) return setError('Enter calories per 100 g (a number, 0 or more).');
    if ([p, c, f].some(Number.isNaN)) return setError('Protein, carbs and fat must be numbers, 0 or more.');
    if (label && (sg == null || Number.isNaN(sg) || sg <= 0)) return setError('Enter the serving size in grams.');
    if (!label && sg != null) return setError('Add a serving label (for example "1 cup").');

    setSaving(true);
    setError(null);
    try {
      const food = await foodsRepo.create({
        name: name.trim(),
        brand: brand.trim() || undefined,
        per100g: { calories, protein: p, carbs: c, fat: f },
        source: 'custom',
        servings: label && sg ? [{ label, grams: sg }] : [],
        saved: true,
      });
      createdFoodStore.set(food);
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Could not save this food.'));
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <TextField value={name} onChangeText={setName} placeholder="Name" accessibilityLabel="Food name" />
          <TextField value={brand} onChangeText={setBrand} placeholder="Brand (optional)" accessibilityLabel="Brand" />

          <SectionLabel>Per 100 g</SectionLabel>
          <TextField value={cal} onChangeText={setCal} placeholder="Calories (kcal)" keyboardType="decimal-pad" accessibilityLabel="Calories per 100 grams" />
          <View style={styles.row}>
            <TextField value={protein} onChangeText={setProtein} placeholder="Protein (g)" keyboardType="decimal-pad" style={styles.third} accessibilityLabel="Protein per 100 grams" />
            <TextField value={carbs} onChangeText={setCarbs} placeholder="Carbs (g)" keyboardType="decimal-pad" style={styles.third} accessibilityLabel="Carbs per 100 grams" />
            <TextField value={fat} onChangeText={setFat} placeholder="Fat (g)" keyboardType="decimal-pad" style={styles.third} accessibilityLabel="Fat per 100 grams" />
          </View>

          <SectionLabel>Serving (optional)</SectionLabel>
          <View style={styles.row}>
            <TextField value={servingLabel} onChangeText={setServingLabel} placeholder="e.g. 1 scoop" style={styles.grow} accessibilityLabel="Serving label" />
            <TextField value={servingGrams} onChangeText={setServingGrams} placeholder="Grams" keyboardType="decimal-pad" style={styles.grams} accessibilityLabel="Serving grams" />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Values are stored per 100 g. Foods you create are saved to My foods.
          </ThemedText>

          {error ? <Notice tone="bad">{error}</Notice> : null}
          <Button label="Save food" onPress={save} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  third: { flex: 1 },
  grow: { flex: 1 },
  grams: { width: 110 },
});
