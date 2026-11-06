import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabSpec } from '@/components/ui/tab-bar';
import { QuickActions } from '@/features/home/quick-actions';
import { useTheme } from '@/hooks/use-theme';

/** Tabs shown in the floating pill; the Log tab stays routable but is reached through the "+" button. */
const TABS: TabSpec[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'progress', label: 'Progress', icon: 'chart' },
  { name: 'recipes', label: 'Recipes', icon: 'book' },
  { name: 'settings', label: 'Profile', icon: 'person' },
];

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.background } }}
      tabBar={(props) => <FloatingTabBar {...props} tabs={TABS} trailing={<QuickActions />} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
    </Tabs>
  );
}
