import { useLocalSearchParams, useRouter } from 'expo-router';

import { BatchForm } from '@/features/recipes/components/BatchForm';
import { EmptyState, Loading, Screen } from '@/features/recipes/components/ui';
import { useRecipe } from '@/features/recipes/hooks';

export default function NewBatchScreen() {
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
  return <BatchForm key={recipe.id} recipe={recipe} />;
}
