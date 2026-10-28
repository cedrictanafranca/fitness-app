import { Link, router, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, EstimateBadge, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { mealTotals } from '@/core/nutrition/engine';
import type { Meal } from '@/core/types';
import { mealsRepo } from '@/data/repos';
import { useTheme } from '@/hooks/use-theme';

import { MEAL_TYPES, formatNumber, itemAmount, mealHasEstimates, mealTitle } from './format';

/** The Log tab; cast because typed-route definitions regenerate when the dev server runs. */
const LOG_HREF = '/log' as unknown as Href;

export function MealList({ meals }: { meals: Meal[] }) {
  return (
    <View style={styles.list}>
      <SectionHeader title="Meals" />
      {meals.length === 0 && (
        <Card>
          <EmptyState title="Nothing logged yet" message="Snap a photo, type it or say it, and it shows up here.">
            <Link href={LOG_HREF} asChild>
              <Button label="Log your first meal" small />
            </Link>
          </EmptyState>
        </Card>
      )}
      {MEAL_TYPES.map(({ type, label }) => (
        <MealGroup key={type} label={label} meals={meals.filter((m) => m.mealType === type)} />
      ))}
    </View>
  );
}

function MealGroup({ label, meals }: { label: string; meals: Meal[] }) {
  const theme = useTheme();
  const calories = meals.reduce((s, m) => s + mealTotals(m).calories, 0);

  return (
    <Card padding={0}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitle}>
          <ThemedText type="default" style={styles.groupLabel}>
            {label}
          </ThemedText>
          {meals.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {`${formatNumber(calories)} kcal`}
            </ThemedText>
          )}
        </View>
        <Link href={LOG_HREF} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${label.toLowerCase()}`}
            style={({ pressed }) => [styles.logButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">Log</ThemedText>
          </Pressable>
        </Link>
      </View>
      {meals.map((meal) => (
        <MealRow key={meal.id} meal={meal} />
      ))}
    </Card>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const totals = mealTotals(meal);

  return (
    <View style={[styles.mealWrap, { borderTopColor: theme.track }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${mealTitle(meal)}, ${formatNumber(totals.calories)} calories`}
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.mealRow, pressed && styles.pressed]}>
        {meal.photoUri != null && (
          <Image source={{ uri: meal.photoUri }} style={styles.thumb} contentFit="cover" transition={150} />
        )}
        <View style={styles.mealText}>
          <ThemedText type="default" numberOfLines={1} style={styles.mealName}>
            {mealTitle(meal)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`${formatNumber(totals.calories)} kcal  ·  ${Math.round(totals.protein)} g protein`}
          </ThemedText>
          {mealHasEstimates(meal) && <EstimateBadge status="estimated" />}
        </View>
        <ThemedText themeColor="textSecondary" style={styles.caret}>
          {expanded ? '⌃' : '⌄'}
        </ThemedText>
      </Pressable>

      {expanded && (
        <View style={styles.details}>
          {meal.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemText}>
                <ThemedText type="small" numberOfLines={2} style={styles.itemName}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[itemAmount(item), item.estimateStatus === 'estimated' ? 'estimated' : '']
                    .filter(Boolean)
                    .join('  ·  ')}
                </ThemedText>
              </View>
              <View style={styles.itemNumbers}>
                <ThemedText type="small">{`${formatNumber(item.totals.calories)} kcal`}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {`${Math.round(item.totals.protein * 10) / 10} g protein`}
                </ThemedText>
              </View>
            </View>
          ))}
          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="secondary"
              small
              onPress={() => router.push({ pathname: '/log/review', params: { mealId: meal.id } } as never)}
            />
            <Button label="Delete" variant="destructive" small onPress={() => confirmDelete(meal)} />
          </View>
        </View>
      )}
    </View>
  );
}

function confirmDelete(meal: Meal) {
  const remove = () => {
    mealsRepo.remove(meal.id).catch(() => Alert.alert('Could not delete', 'Please try again.'));
  };
  const title = `Delete "${mealTitle(meal)}"?`;
  if (Platform.OS === 'web') {
    if (window.confirm(title)) remove();
    return;
  }
  Alert.alert(title, 'This removes the meal from your log.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: remove },
  ]);
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three },
  groupTitle: { gap: Spacing.half },
  groupLabel: { fontWeight: 700 },
  logButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + Spacing.half, borderRadius: Radius.pill },
  pressed: { opacity: 0.6 },
  mealWrap: { borderTopWidth: StyleSheet.hairlineWidth },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  thumb: { width: 52, height: 52, borderRadius: Radius.md },
  mealText: { flex: 1, gap: Spacing.half },
  mealName: { fontWeight: 600 },
  caret: { fontSize: 18, width: 20, textAlign: 'center' },
  details: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  itemText: { flex: 1 },
  itemName: { fontWeight: 600 },
  itemNumbers: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
