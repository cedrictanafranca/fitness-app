import { Stack, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

import { screenHeaderOptions } from '@/components/ui/header';
import { useTheme } from '@/hooks/use-theme';

export default function RecipesLayout() {
  const theme = useTheme();
  // The root stack would otherwise draw its own "recipes" header above this nested stack.
  const parent = useNavigation();
  useLayoutEffect(() => {
    parent.setOptions({ headerShown: false });
  }, [parent]);

  return (
    <Stack screenOptions={screenHeaderOptions(theme)}>
      <Stack.Screen name="new" options={{ title: 'New Recipe' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Recipe' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Recipe' }} />
      <Stack.Screen name="[id]/batch" options={{ title: 'New Batch' }} />
      <Stack.Screen name="foods" options={{ title: 'Add Food' }} />
      <Stack.Screen name="calibrations" options={{ title: 'Portion' }} />
    </Stack>
  );
}
