import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Log flow: presented as a modal over the tabs. */
export default function LogLayout() {
  const theme = useTheme();
  return (
    <>
      {/* Configures this group's own route in the parent navigator. */}
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="capture" options={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
        <Stack.Screen name="review" options={{ title: 'Review meal' }} />
        <Stack.Screen name="search" options={{ title: 'Add food' }} />
        <Stack.Screen name="add-food" options={{ title: 'Add food' }} />
      </Stack>
    </>
  );
}
