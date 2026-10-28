import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { foodsRepo } from '@/data/repos';
import { Button, Field, Notice, Screen, layout } from '@/features/recipes/components/ui';
import { parseNum } from '@/features/recipes/format';
import { EMPTY_PER100, parsePer100 } from '@/features/recipes/validation';

export default function CustomFoodScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [per100, setPer100] = useState(EMPTY_PER100);
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setMacro = (key: keyof typeof EMPTY_PER100) => (t: string) => setPer100((p) => ({ ...p, [key]: t }));

  const save = async () => {
    if (!name.trim()) return setError('Enter a name.');
    const parsed = parsePer100(per100);
    if (!parsed.value) return setError(parsed.error ?? 'Check the nutrition values.');

    const label = servingLabel.trim();
    const sg = parseNum(servingGrams);
    if ((label && (sg == null || sg <= 0)) || (!label && servingGrams.trim())) {
      return setError('A serving needs both a label and a weight in grams.');
    }

    setSaving(true);
    setError(null);
    try {
      await foodsRepo.create({
        name: name.trim(),
        brand: brand.trim() || undefined,
        per100g: parsed.value,
        source: 'custom',
        servings: label && sg ? [{ label, grams: sg }] : [],
        saved: true,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button label="Save food" onPress={save} loading={saving} />}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Greek yogurt" autoCapitalize="sentences" />
      <Field label="Brand (optional)" value={brand} onChangeText={setBrand} />
      <Notice tone="info" text="Enter values exactly as printed on the label, per 100 g." />
      <Field label="Calories" value={per100.calories} onChangeText={setMacro('calories')} keyboardType="decimal-pad" suffix="kcal / 100 g" />
      <View style={layout.row}>
        <Field style={layout.grow} label="Protein" value={per100.protein} onChangeText={setMacro('protein')} keyboardType="decimal-pad" suffix="g" />
        <Field style={layout.grow} label="Carbs" value={per100.carbs} onChangeText={setMacro('carbs')} keyboardType="decimal-pad" suffix="g" />
        <Field style={layout.grow} label="Fat" value={per100.fat} onChangeText={setMacro('fat')} keyboardType="decimal-pad" suffix="g" />
      </View>
      <View style={layout.row}>
        <Field style={layout.grow} label="Serving (optional)" value={servingLabel} onChangeText={setServingLabel} placeholder="1 slice" />
        <Field style={layout.grow} label="Serving weight" value={servingGrams} onChangeText={setServingGrams} keyboardType="decimal-pad" suffix="g" />
      </View>
      {error ? <Notice tone="error" text={error} /> : null}
    </Screen>
  );
}
