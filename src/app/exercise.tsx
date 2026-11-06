import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { HeaderIconButton, goBackOrHome, screenHeaderOptions } from '@/components/ui/header';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ExerciseForm } from '@/features/exercise/exercise-form';
import { useTheme } from '@/hooks/use-theme';

export default function ExerciseScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activity, setActivity] = useState<string | null>(null);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          ...screenHeaderOptions(theme),
          title: activity ?? 'Exercise',
          headerLeft: () => <HeaderIconButton icon="back" accessibilityLabel="Close" onPress={goBackOrHome} />,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
          <View style={styles.column}>
            <ExerciseForm onKindChange={setActivity} onSaved={goBackOrHome} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { alignItems: 'center', padding: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth },
});
