import { useState } from 'react';
import { View } from 'react-native';

import { calibrationsRepo } from '@/data/repos';

import { parseNum } from '../format';
import { Button, Chip, Field, Notice, layout } from './ui';

const UNITS = ['scoop', 'bowl', 'plate', 'spoon'] as const;

/** Create a household-portion calibration: "1 scoop of rice = 145 g". Used in a sheet and as a route. */
export function PortionForm({ onSaved }: { onSaved: () => void }) {
  const [unit, setUnit] = useState<string>('scoop');
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [foodName, setFoodName] = useState('');
  const [grams, setGrams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const name = (custom ? customName : unit).trim();
  const g = parseNum(grams);

  const save = async () => {
    if (!name) return setError('Give the unit a name.');
    if (g == null || g <= 0) return setError('Enter the measured weight in grams.');
    setSaving(true);
    setError(null);
    try {
      await calibrationsRepo.create({
        name,
        grams: g,
        foodName: foodName.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <View style={layout.stack}>
      <View style={layout.wrap}>
        {UNITS.map((u) => (
          <Chip
            key={u}
            label={u}
            selected={!custom && unit === u}
            onPress={() => {
              setCustom(false);
              setUnit(u);
            }}
          />
        ))}
        <Chip label="Custom" selected={custom} onPress={() => setCustom(true)} />
      </View>
      {custom ? (
        <Field label="Unit name" value={customName} onChangeText={setCustomName} placeholder="e.g. ladle, cup, handful" autoFocus />
      ) : null}
      <Field
        label="Food (optional)"
        value={foodName}
        onChangeText={setFoodName}
        placeholder="e.g. rice"
        hint="A scoop of rice does not weigh the same as a scoop of oats. Tie the portion to a food so it is only used for that food."
      />
      <Field
        label="Measured weight"
        value={grams}
        onChangeText={setGrams}
        keyboardType="decimal-pad"
        suffix="g"
        placeholder="145"
        hint="Weigh one full portion on your scale."
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button label="Save portion" onPress={save} loading={saving} />
    </View>
  );
}
