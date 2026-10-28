import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { recipeNutrition } from '@/core/nutrition/engine';
import type { Recipe } from '@/core/types';

import { basisLabel, fmtG, href, routes } from '../format';
import { useRecipes } from '../hooks';
import { Badge, Button, Card, EmptyState, Loading, Notice, layout } from './ui';

function RecipeRow({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const n = useMemo(
    () => recipeNutrition(recipe.ingredients, recipe.cookedWeightG),
    [recipe.ingredients, recipe.cookedWeightG]
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}, ${Math.round(n.per100g.calories)} calories ${basisLabel(n.basis)}`}
      onPress={() => router.push(href(routes.recipe(recipe.id)))}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={layout.row}>
          <ThemedText type="default" style={styles.name} numberOfLines={1}>
            {recipe.name}
          </ThemedText>
          {n.hasEstimates ? <Badge label="estimate" tone="estimate" /> : null}
        </View>
        <ThemedText type="small">
          {Math.round(n.per100g.calories)} kcal · {fmtG(n.per100g.protein)} protein
          <ThemedText type="small" themeColor="textSecondary">
            {'  '}
            {basisLabel(n.basis)}
          </ThemedText>
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}
          {recipe.servings ? ` · ${recipe.servings} servings` : ''}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

export function RecipesList() {
  const router = useRouter();
  const { data, loading, error } = useRecipes();

  return (
    <View style={layout.stack}>
      <Button label="New recipe" onPress={() => router.push(href(routes.newRecipe))} />
      {error ? <Notice tone="error" text={`Could not load recipes: ${error.message}`} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No family recipes yet"
          body="Save the dishes Mom cooks once, then log by weight. Add the ingredients and the cooked batch weight and the app works out calories and protein per 100 g."
        />
      ) : null}
      {data?.map((r) => <RecipeRow key={r.id} recipe={r} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1, fontWeight: 600 },
  pressed: { opacity: 0.7, marginHorizontal: Spacing.half },
});
