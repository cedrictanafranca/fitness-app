import type { Tabs } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icons';

/** Props expo-router hands a custom `tabBar`: `state`, `descriptors`, `emitter`, `navigateToTab`, `insets`. */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface TabSpec {
  name: string;
  label: string;
  icon: IconName;
}

export interface FloatingTabBarProps extends TabBarProps {
  tabs: TabSpec[];
  /** Rendered to the right of the pill (the "+" button). */
  trailing?: ReactNode;
}

/** The reference's floating white pill tab bar: selected tab sits in a grey circle with a filled icon. */
export function FloatingTabBar({ state, navigateToTab, tabs, trailing }: FloatingTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <View style={[styles.pill, { backgroundColor: theme.surface }, Elevation.float]}>
        {tabs.map((tab) => {
          const index = state.routes.findIndex((r) => r.name === tab.name);
          if (index < 0) return null;
          const route = state.routes[index];
          const selected = state.index === index;
          const onPress = () => navigateToTab(route.key);
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              onPress={onPress}
              style={[styles.tab, selected && { backgroundColor: theme.backgroundElement }]}>
              <Icon name={tab.icon} size={22} filled={selected} strokeWidth={selected ? 1.6 : 1.7} color={selected ? theme.text : theme.textSecondary} />
              <ThemedText
                style={[styles.label, { color: selected ? theme.text : theme.textSecondary }, selected && styles.labelSelected]}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  pill: {
    flex: 1,
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.pill,
    padding: 6,
  },
  tab: {
    flex: 1,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 11, lineHeight: 13, fontWeight: 500 },
  labelSelected: { fontWeight: 700 },
});
