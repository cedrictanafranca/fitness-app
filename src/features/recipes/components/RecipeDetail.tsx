import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { itemTotals, recipeNutrition } from '@/core/nutrition/engine';
import type { RecipeBatch } from '@/core/types';
import { recipesRepo } from '@/data/repos';
import { useTheme } from '@/hooks/use-theme';

import { fmtG, formatDate, href, routes, sourceLabel } from '../format';
import { useBatches, useRecipe } from '../hooks';
import { LogPortionCard } from './LogPortionCard';
import { NutritionPanel } from './NutritionPanel';
import { Badge, Button, Card, EmptyState, Loading, Screen, SectionHeader, layout } from './ui';

function BatchRow({ batch, selected, onPress }: { batch: RecipeBatch; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const n = useMemo(() => recipeNutrition(batch.ingredients, batch.cookedWeightG), [batch]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint="Use this batch's values for logging"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={selected ? { borderWidth: 2, borderColor: theme.primary } : undefined}>
        <View style={layout.row}>
          <ThemedText type="default" style={styles.name}>
            {formatDate(batch.createdAt)}
          </ThemedText>
          {n.hasEstimates ? <Badge label="estimate" tone="estimate" /> : null}
          {selected ? <Badge label="Selected for logging" /> : null}
        </View>
        <ThemedText type="small">
          {fmtG(batch.cookedWeightG)} cooked · {Math.round(batch.per100g.calories)} kcal · {fmtG(batch.per100g.protein)} protein
          <ThemedText type="small" themeColor="textSecondary">
            {'  '}per 100 g
          </ThemedText>
        </ThemedText>
        {batch.note ? (
          <ThemedText type="small" themeColor="textSecondary">
            {batch.note}
          </ThemedText>
        ) : null}
      </Card>
    </Pressable>
  );
}

export function RecipeDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: recipe, loading } = useRecipe(id);
  const { data: batchData } = useBatches(id);
  const batches = useMemo(() => batchData ?? [], [batchData]);
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (loading && !recipe) return <Loading />;
  if (!recipe) {
    return (
      <Screen>
        <EmptyState title="Recipe not found" body="It may have been deleted." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  // Default to the newest batch (real cooked weight) when one exists.
  const effectiveId = pickedId && batches.some((b) => b.id === pickedId) ? pickedId : pickedId === 'recipe' ? 'recipe' : (batches[0]?.id ?? 'recipe');

  const confirmDelete = () =>
    Alert.alert(
      `Delete ${recipe.name}?`,
      'Meals you already logged keep their numbers. The recipe and its batches are removed from this list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            recipesRepo
              .remove(recipe.id)
              .then(() => router.back())
              .catch((e: unknown) => Alert.alert('Could not delete', String(e)));
          },
        },
      ]
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: recipe.name }} />

      {recipe.photoUri ? (
        <Image source={{ uri: recipe.photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel={`${recipe.name} photo`} />
      ) : null}
      <View style={layout.stack}>
        <ThemedText type="subtitle" style={styles.title}>
          {recipe.name}
        </ThemedText>
        {recipe.notes ? <ThemedText themeColor="textSecondary">{recipe.notes}</ThemedText> : null}
      </View>

      <LogPortionCard recipe={recipe} batches={batches} selectedId={effectiveId} onSelect={setPickedId} />

      <SectionHeader title="Nutrition" />
      <NutritionPanel ingredients={recipe.ingredients} cookedWeightG={recipe.cookedWeightG} servings={recipe.servings} />

      <SectionHeader title="Ingredients" />
      {recipe.ingredients.map((i) => (
        <Card key={i.id}>
          <View style={layout.row}>
            <ThemedText type="default" style={styles.name} numberOfLines={2}>
              {i.name}
            </ThemedText>
            {i.estimateStatus === 'estimated' ? <Badge label="estimate" tone="estimate" /> : null}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {fmtG(i.grams)} · {Math.round(itemTotals(i.per100g, i.grams).calories)} kcal · {sourceLabel(i.source)}
          </ThemedText>
        </Card>
      ))}

      <SectionHeader title="Batches" />
      <ThemedText type="small" themeColor="textSecondary">
        A batch is one specific pot you cooked, with the amounts and cooked weight from that day. Batches never change.
      </ThemedText>
      {batches.map((b) => (
        <BatchRow key={b.id} batch={b} selected={effectiveId === b.id} onPress={() => setPickedId(b.id)} />
      ))}
      <Button label="New batch" variant="secondary" onPress={() => router.push(href(routes.newBatch(recipe.id)))} />

      <View style={styles.actions}>
        <Button label="Edit recipe" variant="secondary" onPress={() => router.push(href(routes.editRecipe(recipe.id)))} />
        <Button label="Delete recipe" variant="danger" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md },
  title: { fontSize: 28, lineHeight: 34 },
  name: { flex: 1, fontWeight: 600 },
  pressed: { opacity: 0.7 },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
