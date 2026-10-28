import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { PortionDetail } from '@/features/recipes/components/PortionDetail';
import { PortionForm } from '@/features/recipes/components/PortionForm';
import { Screen } from '@/features/recipes/components/ui';

/** `/recipes/calibrations` adds a portion; `/recipes/calibrations?id=…` shows and re-weighs one. */
export default function CalibrationsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  if (id) return <PortionDetail id={id} />;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Add portion' }} />
      <PortionForm onSaved={() => router.back()} />
    </Screen>
  );
}
