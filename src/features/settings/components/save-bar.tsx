import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DANGER_COLOR } from './colors';

export function SaveBar({
  canSave,
  saving,
  saved,
  dirty,
  hasErrors,
  saveError,
  onSave,
}: {
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  hasErrors: boolean;
  saveError: string | null;
  onSave: () => void;
}) {
  const theme = useTheme();

  let status = 'All changes saved';
  if (hasErrors) status = 'Fix the highlighted fields to save';
  else if (dirty) status = 'Unsaved changes';
  else if (saved) status = 'Saved';

  return (
    <View style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected }]}>
      <View style={styles.statusRow}>
        {saveError ? (
          <Text style={styles.error}>{saveError}</Text>
        ) : (
          <ThemedText type="small" themeColor={saved && !dirty ? 'text' : 'textSecondary'}>
            {saved && !dirty ? 'Saved' : status}
          </ThemedText>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={onSave}
        style={[
          styles.button,
          { backgroundColor: theme.text, opacity: canSave ? 1 : 0.35 },
        ]}>
        {saving ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <Text style={[styles.buttonLabel, { color: theme.background }]}>Save changes</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusRow: {
    minHeight: 20,
    alignItems: 'center',
  },
  error: {
    color: DANGER_COLOR,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
