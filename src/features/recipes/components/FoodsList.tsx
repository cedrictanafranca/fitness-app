import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Food } from '@/core/types';
import { foodsRepo } from '@/data/repos';

import { fmtG, href, routes, sourceLabel } from '../format';
import { useSavedFoods } from '../hooks';
import { Badge, Button, Card, EmptyState, Loading, Notice, layout } from './ui';

function confirmDelete(food: Food) {
  Alert.alert(
    `Delete ${food.name}?`,
    'Meals you already logged keep their numbers. This only removes it from My foods.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          foodsRepo.remove(food.id).catch((e: unknown) => Alert.alert('Could not delete', String(e)));
        },
      },
    ]
  );
}

function FoodRow({ food }: { food: Food }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Long press to delete"
      accessibilityActions={[{ name: 'delete', label: 'Delete food' }]}
      onAccessibilityAction={() => confirmDelete(food)}
      onLongPress={() => confirmDelete(food)}
      delayLongPress={350}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={layout.row}>
          <ThemedText type="default" style={styles.name} numberOfLines={1}>
            {food.name}
          </ThemedText>
          <Badge label={sourceLabel(food.source)} />
        </View>
        {food.brand ? (
          <ThemedText type="small" themeColor="textSecondary">
            {food.brand}
          </ThemedText>
        ) : null}
        <ThemedText type="small">
          {Math.round(food.per100g.calories)} kcal · {fmtG(food.per100g.protein)} protein
          <ThemedText type="small" themeColor="textSecondary">
            {'  '}per 100 g
          </ThemedText>
        </ThemedText>
      </Card>
    </Pressable>
  );
}

export function FoodsList() {
  const router = useRouter();
  const { data, loading, error } = useSavedFoods();

  return (
    <View style={layout.stack}>
      <Button label="Add custom food" onPress={() => router.push(href(routes.customFood))} />
      {error ? <Notice tone="error" text={`Could not load foods: ${error.message}`} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No saved foods"
          body="Add foods you eat often, with their label values per 100 g, so you can reuse them in recipes and logs."
        />
      ) : null}
      {data && data.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Long-press a food to delete it.
        </ThemedText>
      ) : null}
      {data?.map((f) => <FoodRow key={f.id} food={f} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1, fontWeight: 600 },
  pressed: { opacity: 0.7 },
});
