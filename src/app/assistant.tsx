import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ASSISTANT_SUGGESTIONS, ActionCard, Composer, MessageBubble, useAssistant } from '@/features/assistant';
import { useTheme } from '@/hooks/use-theme';

export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const chat = useAssistant();
  const scroll = useRef<ScrollViewInstance>(null);
  const [text, setText] = useState('');

  // Keep the newest message in view.
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [chat.messages, chat.busy]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: 'Assistant',
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={8} style={styles.headerButton}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
          ),
          headerRight: () =>
            chat.messages.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="New conversation" onPress={chat.reset} hitSlop={8} style={styles.headerButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Clear
                </ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.content}>
          <View style={styles.column}>
            {chat.mode === 'mock' ? (
              <View style={[styles.banner, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Offline mode: no ANTHROPIC_API_KEY on the server, so a rule-based assistant is answering.
                </ThemedText>
              </View>
            ) : null}

            {chat.messages.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText style={styles.emptyTitle}>Ask about your log, or change it</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  I read your meals, recipes and targets. Changes are applied by the app, never by the AI.
                </ThemedText>
                <View style={styles.chips}>
                  {ASSISTANT_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      accessibilityRole="button"
                      onPress={() => chat.send(s)}
                      onLongPress={() => setText(s)}
                      style={({ pressed }) => [styles.chip, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                      <ThemedText type="small">{s}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {chat.messages.map((m) => (
              <View key={m.id} style={styles.message}>
                <MessageBubble role={m.role} text={m.text} />
                {m.proposal ? (
                  <ActionCard
                    state={m.proposal}
                    onConfirm={() => chat.confirm(m.id)}
                    onDismiss={() => chat.dismiss(m.id)}
                    onChoose={(c) => chat.choose(m.id, c)}
                  />
                ) : null}
              </View>
            ))}

            {chat.busy ? (
              <View style={styles.thinking} accessibilityLabel="Assistant is thinking">
                <ActivityIndicator size="small" color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Thinking…
                </ThemedText>
              </View>
            ) : null}

            {chat.error ? (
              <View style={[styles.banner, { backgroundColor: theme.backgroundElement, borderLeftColor: theme.warning, borderLeftWidth: 3 }]}>
                <ThemedText type="small" style={{ color: theme.warning }}>
                  {chat.error}
                </ThemedText>
                <Button
                  label="Retry"
                  variant="ghost"
                  small
                  onPress={() => {
                    const last = [...chat.messages].reverse().find((m) => m.role === 'user');
                    if (last) setText(last.text);
                  }}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: insets.bottom + Spacing.two, borderTopColor: theme.track }]}>
          <View style={styles.column}>
            <Composer busy={chat.busy} value={text} onChangeText={setText} onSend={chat.send} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerButton: { paddingHorizontal: Spacing.two },
  content: { alignItems: 'center', padding: Spacing.three, gap: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  banner: { borderRadius: Radius.md, padding: Spacing.two + Spacing.one, gap: Spacing.one },
  empty: { gap: Spacing.two, paddingVertical: Spacing.four },
  emptyTitle: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  pressed: { opacity: 0.6 },
  message: { gap: Spacing.two },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, alignItems: 'center' },
});
