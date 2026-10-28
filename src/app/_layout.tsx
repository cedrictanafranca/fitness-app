import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="log" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="recipes" options={{ headerShown: false }} />
        <Stack.Screen name="assistant" options={{ presentation: 'modal', title: 'Assistant' }} />
        <Stack.Screen name="exercise" options={{ presentation: 'modal', title: 'Exercise' }} />
      </Stack>
    </ThemeProvider>
  );
}
