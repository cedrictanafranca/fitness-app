import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { FoodsList } from '@/features/recipes/components/FoodsList';
import { PortionsList } from '@/features/recipes/components/PortionsList';
import { RecipesList } from '@/features/recipes/components/RecipesList';
import { Screen, Segmented } from '@/features/recipes/components/ui';

type Segment = 'recipes' | 'foods' | 'portions';

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'recipes', label: 'Recipes' },
  { value: 'foods', label: 'My foods' },
  { value: 'portions', label: 'Portions' },
];

export default function RecipesScreen() {
  const [segment, setSegment] = useState<Segment>('recipes');

  return (
    <Screen tab>
      <ThemedText type="subtitle">Recipes</ThemedText>
      <Segmented options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'recipes' ? <RecipesList /> : null}
      {segment === 'foods' ? <FoodsList /> : null}
      {segment === 'portions' ? <PortionsList /> : null}
    </Screen>
  );
}
