import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { PortionCalibration } from '@/core/types';

import { fmtG, href, routes } from '../format';
import { useCalibrations } from '../hooks';
import { PortionForm } from './PortionForm';
import { Button, Card, EmptyState, Loading, Notice, SheetModal, layout } from './ui';

function PortionRow({ cal }: { cal: PortionCalibration }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href(routes.portion(cal.id)))}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <ThemedText type="default" style={styles.title}>
          1 {cal.name}
          {cal.foodName ? ` · ${cal.foodName}` : ''} · {fmtG(cal.grams)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {cal.foodName ? `Tied to: ${cal.foodName}` : 'Any food (no food set)'} · {cal.history.length} weighing
          {cal.history.length === 1 ? '' : 's'}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

export function PortionsList() {
  const { data, loading, error } = useCalibrations();
  const [adding, setAdding] = useState(false);

  return (
    <View style={layout.stack}>
      <Button label="Add portion" onPress={() => setAdding(true)} />
      {error ? <Notice tone="error" text={`Could not load portions: ${error.message}`} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No portions yet"
          body={'Weigh a scoop, bowl or spoon once, then log "2 scoops of rice" without the scale.'}
        />
      ) : null}
      {data?.map((c) => <PortionRow key={c.id} cal={c} />)}
      <SheetModal visible={adding} title="Add portion" onClose={() => setAdding(false)}>
        <PortionForm onSaved={() => setAdding(false)} />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: 600 },
  pressed: { opacity: 0.7 },
});
