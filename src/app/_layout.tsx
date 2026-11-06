import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { screenHeaderOptions } from '@/components/ui/header';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const palette = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: palette.background, card: palette.background, text: palette.text, primary: palette.primary },
  };
  return (
    <ThemeProvider value={navTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={screenHeaderOptions(palette)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="log" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="recipes" options={{ headerShown: false }} />
        <Stack.Screen name="assistant" options={{ presentation: 'modal', title: 'Assistant' }} />
        <Stack.Screen name="exercise" options={{ presentation: 'modal', title: 'Exercise' }} />
      </Stack>
    </ThemeProvider>
  );
}
