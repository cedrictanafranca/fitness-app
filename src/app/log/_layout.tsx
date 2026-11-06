import { Stack } from 'expo-router';

import { HeaderIconButton, screenHeaderOptions } from '@/components/ui/header';
import { cancelLogFlow } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';

/** Log flow: presented as a modal over the tabs. */
export default function LogLayout() {
  const theme = useTheme();
  return (
    <>
      {/* Configures this group's own route in the parent navigator. */}
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <Stack screenOptions={screenHeaderOptions(theme)}>
        <Stack.Screen name="capture" options={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
        <Stack.Screen
          name="review"
          options={{
            title: 'Create Meal',
            headerLeft: () => <HeaderIconButton icon="back" accessibilityLabel="Cancel" onPress={cancelLogFlow} />,
          }}
        />
        <Stack.Screen name="search" options={{ title: 'Log Food' }} />
        <Stack.Screen name="add-food" options={{ title: 'Add Food' }} />
      </Stack>
    </>
  );
}
