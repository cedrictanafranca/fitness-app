import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { Icon } from '@/features/log/components/ui';
import { resetDraft } from '@/features/log/draft-store';
import { goCapture, goSearch } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';

const href = (h: string) => h as unknown as Href;

interface QuickAction {
  key: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  fallback: string;
  run: () => void;
}

const ACTIONS: QuickAction[] = [
  {
    key: 'scan',
    label: 'Scan food',
    icon: 'camera.viewfinder',
    fallback: '◎',
    run: () => {
      router.navigate(href('/log'));
      goCapture();
    },
  },
  { key: 'describe', label: 'Describe or dictate', icon: 'text.bubble', fallback: '✎', run: () => router.navigate(href('/log')) },
  {
    key: 'search',
    label: 'Food database',
    icon: 'magnifyingglass',
    fallback: '⌕',
    run: () => {
      resetDraft();
      goSearch('start');
    },
  },
  { key: 'saved', label: 'Saved foods & recipes', icon: 'bookmark', fallback: '☆', run: () => router.navigate(href('/recipes')) },
  { key: 'exercise', label: 'Log exercise', icon: 'figure.run', fallback: '⚡', run: () => router.push(href('/exercise')) },
  { key: 'assistant', label: 'Ask the assistant', icon: 'sparkles', fallback: '✦', run: () => router.push(href('/assistant')) },
];

/** Floating "+" that opens the logging shortcuts (scan, describe, search, saved, exercise, assistant). */
export function QuickActions() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const choose = (a: QuickAction) => {
    setOpen(false);
    // Let the sheet close before navigating so the modal stack starts from the tab.
    setTimeout(a.run, 220);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log something"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
        <ThemedText style={[styles.plus, { color: theme.onPrimary }]}>+</ThemedText>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Log">
        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => choose(a)}
              style={({ pressed }) => [styles.tile, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
              <Icon name={a.icon} fallback={a.fallback} size={22} color={theme.text} />
              <ThemedText type="smallBold" style={styles.tileLabel}>
                {a.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.three,
    bottom: BottomTabInset + Spacing.three,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  plus: { fontSize: 32, lineHeight: 36, fontWeight: 500 },
  pressed: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  tile: {
    width: '48%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  tileLabel: { fontSize: 15 },
});
