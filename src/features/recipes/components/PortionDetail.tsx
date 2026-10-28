import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { calibrationAverage } from '@/core/nutrition/engine';
import { calibrationsRepo } from '@/data/repos';

import { fmtG, formatDate, parseNum } from '../format';
import { useCalibration } from '../hooks';
import { Button, Card, EmptyState, Field, Loading, Notice, Screen, SectionHeader, layout } from './ui';

export function PortionDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: cal, loading } = useCalibration(id);
  const [grams, setGrams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading && !cal) return <Loading />;
  if (!cal) {
    return (
      <Screen>
        <EmptyState title="Portion not found" body="It may have been deleted." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const average = calibrationAverage(cal.history);
  const title = `1 ${cal.name}${cal.foodName ? ` of ${cal.foodName}` : ''}`;

  const reweigh = async () => {
    const g = parseNum(grams);
    if (g == null || g <= 0) return setError('Enter the new measured weight in grams.');
    setSaving(true);
    setError(null);
    try {
      await calibrationsRepo.addSample(cal.id, g);
      setGrams('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert(`Delete ${title}?`, 'Meals you already logged keep their numbers.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          calibrationsRepo
            .remove(cal.id)
            .then(() => router.back())
            .catch((e: unknown) => Alert.alert('Could not delete', String(e)));
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Portion' }} />
      <Card>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText type="default">Latest: {fmtG(cal.grams)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Average of {cal.history.length} weighing{cal.history.length === 1 ? '' : 's'}: {fmtG(average)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {cal.foodName
            ? `Tied to: ${cal.foodName}. Only used when logging ${cal.foodName}.`
            : 'Not tied to a food. Used only when no food-specific portion exists.'}
        </ThemedText>
      </Card>

      <SectionHeader title="Re-weigh" />
      <Field
        label="New measured weight"
        value={grams}
        onChangeText={setGrams}
        keyboardType="decimal-pad"
        suffix="g"
        placeholder={String(Math.round(cal.grams))}
        hint="The latest weighing becomes the weight used when logging. The average shows how consistent your portion is."
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <Button label="Save weighing" onPress={reweigh} loading={saving} />

      <SectionHeader title="History" />
      <View style={layout.stack}>
        {[...cal.history].reverse().map((s, i) => (
          <View key={`${s.at}-${i}`} style={layout.row}>
            <ThemedText type="default" style={layout.grow}>
              {fmtG(s.grams)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(s.at)}
            </ThemedText>
          </View>
        ))}
      </View>

      <Button label="Delete portion" variant="danger" onPress={remove} />
    </Screen>
  );
}
