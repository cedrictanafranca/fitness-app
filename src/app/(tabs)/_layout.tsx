import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

const tabs = [
  { name: 'index', label: 'Home', sf: 'house.fill', md: 'home' },
  { name: 'log', label: 'Log', sf: 'camera.fill', md: 'photo_camera' },
  { name: 'recipes', label: 'Recipes', sf: 'book.closed.fill', md: 'menu_book' },
  { name: 'progress', label: 'Progress', sf: 'chart.bar.fill', md: 'bar_chart' },
  { name: 'settings', label: 'Settings', sf: 'gearshape.fill', md: 'settings' },
] as const;

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {tabs.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
