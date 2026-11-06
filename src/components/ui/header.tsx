import { router, Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icons';

export interface HeaderIconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}

/** Circular light-grey header button (back arrow, close, "more") from the reference. */
export function HeaderIconButton({ icon, accessibilityLabel, onPress }: HeaderIconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <Icon name={icon} size={20} strokeWidth={2} color={theme.text} />
    </Pressable>
  );
}

/** Goes back, or home when the screen was deep-linked. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Back-arrow header button that pops the stack. */
export function HeaderBackButton({ onPress = goBackOrHome, label = 'Back' }: { onPress?: () => void; label?: string }) {
  return <HeaderIconButton icon="back" accessibilityLabel={label} onPress={onPress} />;
}

/** Plain-object form of a Stack screen's `options`. */
export type StackScreenOptions = Exclude<ComponentProps<typeof Stack.Screen>['options'], undefined | ((...args: never[]) => unknown)>;

/** Shared native-stack header look: centered title, no hairline, screen background. */
export function screenHeaderOptions(theme: { background: string; text: string }): StackScreenOptions {
  return {
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.text,
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    headerTitleStyle: { fontSize: 17, fontWeight: '600' },
    headerBackVisible: false,
    headerLeft: () => <HeaderBackButton />,
    contentStyle: { backgroundColor: theme.background },
  };
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.half,
  },
  pressed: { opacity: 0.6 },
});
