/**
 * Design tokens, taken from the reference board (docs/PLAN.md): white elevated cards on a white
 * canvas, flat light-grey surfaces for secondary rows, pure black primary actions, soft shadows,
 * and the red / tan / blue macro accents.
 */

import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    /** Elevated card surface (white, with `Elevation.card`). */
    surface: '#FFFFFF',
    /** Flat secondary surface: list rows, selected tab circle, intensity card. */
    backgroundElement: '#F4F4F6',
    backgroundSelected: '#E9E9EC',
    /** Hairline borders and outlined inputs. */
    border: '#E4E4E7',
    textSecondary: '#8E8E93',
    /** Semantic nutrition accents. */
    calories: '#111111',
    protein: '#E0635A',
    carbs: '#E3A160',
    fat: '#5E8DEA',
    /** Over-target / destructive. */
    warning: '#D9534F',
    /** Unfilled ring / bar track. */
    track: '#ECECEE',
    /** Text on a filled accent or primary surface. */
    onPrimary: '#FFFFFF',
    /** Primary button / strong surface. */
    primary: '#000000',
    /** Disabled primary button. */
    primaryDisabled: '#B8B8BC',
    /** Positive state (healthy BMI, saved). */
    success: '#4DAE65',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    surface: '#141416',
    backgroundElement: '#1C1C1F',
    backgroundSelected: '#2A2A2E',
    border: '#2E2E33',
    textSecondary: '#A1A1A8',
    calories: '#FFFFFF',
    protein: '#F07A72',
    carbs: '#EDB178',
    fat: '#7BA3F2',
    warning: '#F06B66',
    track: '#2A2A2E',
    onPrimary: '#000000',
    primary: '#FFFFFF',
    primaryDisabled: '#5A5A60',
    success: '#5FC27A',
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
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Soft shadows from the reference: cards barely lift; floating controls lift more. */
export const Elevation: Record<'card' | 'float', ViewStyle> = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  float: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
};

/** Font sizes / line heights for the UI kit (ThemedText keeps its own presets). */
export const Typography = {
  caption: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 15, lineHeight: 21 },
  bodyLarge: { fontSize: 17, lineHeight: 24 },
  headline: { fontSize: 20, lineHeight: 26 },
  title: { fontSize: 28, lineHeight: 34 },
  display: { fontSize: 44, lineHeight: 48 },
} as const;

/** Height of the floating tab bar plus its margin; scrolling screens pad their bottom by this. */
export const BottomTabInset = 96;
export const MaxContentWidth = 800;
