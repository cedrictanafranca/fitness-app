import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Bottom sheet built on Modal (works in light/dark, above other modals). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
          {title ? (
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SheetRow({
  title,
  subtitle,
  onPress,
  destructive,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
      <ThemedText type="default" style={destructive ? { color: '#D14343' } : undefined}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  content: { gap: Spacing.two, paddingBottom: Spacing.two },
  row: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 14, gap: 2 },
});
