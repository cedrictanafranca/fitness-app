import { useLocalSearchParams, useRouter } from 'expo-router';

import { RecipeForm } from '@/features/recipes/components/RecipeForm';
import { EmptyState, Loading, Screen } from '@/features/recipes/components/ui';
import { useRecipe } from '@/features/recipes/hooks';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, loading } = useRecipe(id);

  if (loading && !recipe) return <Loading />;
  if (!recipe) {
    return (
      <Screen>
        <EmptyState title="Recipe not found" body="It may have been deleted." actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }
  return <RecipeForm key={recipe.id} mode="edit" recipe={recipe} />;
}
