import { Stack, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function RecipesLayout() {
  // The root stack would otherwise draw its own "recipes" header above this nested stack.
  const parent = useNavigation();
  useLayoutEffect(() => {
    parent.setOptions({ headerShown: false });
  }, [parent]);

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="new" options={{ title: 'New recipe' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Recipe' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit recipe' }} />
      <Stack.Screen name="[id]/batch" options={{ title: 'New batch' }} />
      <Stack.Screen name="foods" options={{ title: 'Add custom food' }} />
      <Stack.Screen name="calibrations" options={{ title: 'Portion' }} />
    </Stack>
  );
}
