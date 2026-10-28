/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Semantic nutrition accents. */
    calories: '#F26B21',
    protein: '#E5484D',
    carbs: '#E5A00D',
    fat: '#3E7BFA',
    /** Over-target / destructive. */
    warning: '#D93025',
    /** Unfilled ring / bar track. */
    track: '#E6E7EB',
    /** Text on a filled accent or primary surface. */
    onPrimary: '#ffffff',
    /** Primary button / strong surface. */
    primary: '#111214',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    calories: '#FF8A4C',
    protein: '#FF6B70',
    carbs: '#F5B93A',
    fat: '#6A9BFF',
    warning: '#FF6B61',
    track: '#2E3135',
    onPrimary: '#000000',
    primary: '#ffffff',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Font sizes / line heights for the UI kit (ThemedText keeps its own presets). */
export const Typography = {
  caption: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 15, lineHeight: 21 },
  bodyLarge: { fontSize: 17, lineHeight: 24 },
  headline: { fontSize: 20, lineHeight: 26 },
  title: { fontSize: 28, lineHeight: 34 },
  display: { fontSize: 44, lineHeight: 48 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
