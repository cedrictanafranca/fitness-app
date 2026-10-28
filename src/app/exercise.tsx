import { Stack, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ExerciseForm } from '@/features/exercise/exercise-form';

export default function ExerciseScreen() {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: 'Exercise',
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={8} style={styles.headerButton}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
          <View style={styles.column}>
            <ExerciseForm onSaved={close} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerButton: { paddingHorizontal: Spacing.two },
  content: { alignItems: 'center', padding: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth },
});
