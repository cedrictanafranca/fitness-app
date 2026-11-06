import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
    <View style={[styles.bar, { backgroundColor: theme.background }]}>
      <View style={styles.statusRow}>
        {saveError ? (
          <Text style={[styles.error, { color: theme.warning }]}>{saveError}</Text>
        ) : (
          <ThemedText type="small" themeColor={saved && !dirty ? 'text' : 'textSecondary'}>
            {saved && !dirty ? 'Saved' : status}
          </ThemedText>
        )}
      </View>
      <Button label="Save changes" fullWidth disabled={!canSave} loading={saving} onPress={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.one,
    gap: Spacing.two,
  },
  statusRow: { minHeight: 20, alignItems: 'center' },
  error: { fontSize: 14, lineHeight: 20 },
});
