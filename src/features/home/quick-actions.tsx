import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui/sheet';
import { Icon, type IconName } from '@/components/ui/icons';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { resetDraft } from '@/features/log/draft-store';
import { goCapture, goSearch } from '@/features/log/nav';
import { useTheme } from '@/hooks/use-theme';

const href = (h: string) => h as unknown as Href;

interface QuickAction {
  key: string;
  label: string;
  icon: IconName;
  run: () => void;
}

const ACTIONS: QuickAction[] = [
  { key: 'exercise', label: 'Log exercise', icon: 'dumbbell', run: () => router.push(href('/exercise')) },
  { key: 'saved', label: 'Saved foods', icon: 'bookmark', run: () => router.navigate(href('/recipes')) },
  {
    key: 'search',
    label: 'Food Database',
    icon: 'search',
    run: () => {
      resetDraft();
      goSearch('start');
    },
  },
  {
    key: 'scan',
    label: 'Scan food',
    icon: 'scan',
    run: () => {
      router.navigate(href('/log'));
      goCapture();
    },
  },
  { key: 'describe', label: 'Describe or dictate', icon: 'text', run: () => router.navigate(href('/log')) },
  { key: 'assistant', label: 'Ask the assistant', icon: 'sparkles', run: () => router.push(href('/assistant')) },
];

/** The black "+" button next to the tab bar; opens the grid of logging shortcuts. */
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
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.primary }, Elevation.float, pressed && styles.pressed]}>
        <Icon name="plus" size={26} strokeWidth={2.2} color={theme.onPrimary} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => choose(a)}
              style={({ pressed }) => [styles.tile, { backgroundColor: theme.surface }, Elevation.card, pressed && styles.pressed]}>
              <Icon name={a.icon} size={26} strokeWidth={2} color={theme.text} />
              <ThemedText style={styles.tileLabel}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  tile: {
    width: '46%',
    flexGrow: 1,
    minHeight: 112,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two + Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 16, lineHeight: 20, fontWeight: 600, textAlign: 'center' },
});
