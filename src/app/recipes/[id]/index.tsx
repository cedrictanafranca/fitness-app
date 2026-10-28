import { useLocalSearchParams } from 'expo-router';

import { RecipeDetail } from '@/features/recipes/components/RecipeDetail';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetail id={id} />;
}
