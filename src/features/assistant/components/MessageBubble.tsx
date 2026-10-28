import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MessageBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const theme = useTheme();
  const mine = role === 'user';
  return (
    <View style={[styles.row, mine ? styles.right : styles.left]}>
      <View
        accessibilityRole="text"
        accessibilityLabel={`${mine ? 'You' : 'Assistant'}: ${text}`}
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: theme.primary, borderBottomRightRadius: Radius.sm }
            : { backgroundColor: theme.backgroundElement, borderBottomLeftRadius: Radius.sm },
        ]}>
        <ThemedText style={{ color: mine ? theme.onPrimary : theme.text }} selectable>
          {text}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  left: { justifyContent: 'flex-start', paddingRight: Spacing.five },
  right: { justifyContent: 'flex-end', paddingLeft: Spacing.five },
  bubble: { maxWidth: '100%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + Spacing.half, borderRadius: Radius.lg },
});
