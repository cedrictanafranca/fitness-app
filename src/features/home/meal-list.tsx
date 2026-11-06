import { Link, router, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, EstimateBadge, Icon, SectionHeader, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { mealTotals } from '@/core/nutrition/engine';
import type { Meal, MealType } from '@/core/types';
import { mealsRepo } from '@/data/repos';
import { useTheme } from '@/hooks/use-theme';

import { MEAL_TYPES, formatNumber, itemAmount, mealHasEstimates, mealTitle } from './format';

/** The Log tab; cast because typed-route definitions regenerate when the dev server runs. */
const LOG_HREF = '/log' as unknown as Href;

const MEAL_ICONS: Record<MealType, IconName> = {
  breakfast: 'coffee',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'cookie',
};

export function MealList({ meals }: { meals: Meal[] }) {
  const theme = useTheme();
  return (
    <View style={styles.list}>
      <SectionHeader title="Meals" />
      {meals.length === 0 && (
        <Card variant="flat" padding={Spacing.four} style={styles.empty}>
          <View style={[styles.illustration, { backgroundColor: theme.surface }]}>
            <Icon name="bowl" size={28} color={theme.text} />
            <View style={styles.lines}>
              <View style={[styles.line, { backgroundColor: theme.backgroundSelected, width: '80%' }]} />
              <View style={[styles.line, { backgroundColor: theme.backgroundSelected, width: '55%' }]} />
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Tap + to add your first meal of the day
          </ThemedText>
        </Card>
      )}
      {MEAL_TYPES.map(({ type, label }) => (
        <MealGroup key={type} type={type} label={label} meals={meals.filter((m) => m.mealType === type)} />
      ))}
    </View>
  );
}

function MealGroup({ type, label, meals }: { type: MealType; label: string; meals: Meal[] }) {
  const theme = useTheme();
  const calories = meals.reduce((s, m) => s + mealTotals(m).calories, 0);

  return (
    <Card padding={0}>
      <View style={styles.groupHeader}>
        <Icon name={MEAL_ICONS[type]} size={22} color={theme.text} />
        <View style={styles.groupTitle}>
          <ThemedText type="default" style={styles.groupLabel}>
            {label}
          </ThemedText>
          {meals.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {`${formatNumber(calories)} cal`}
            </ThemedText>
          )}
        </View>
        <Link href={LOG_HREF} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Log ${label.toLowerCase()}`}
            style={({ pressed }) => [styles.logButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
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
    <View style={[styles.mealWrap, { borderTopColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${mealTitle(meal)}, ${formatNumber(totals.calories)} calories`}
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.mealRow, pressed && styles.pressed]}>
        {meal.photoUri != null ? (
          <Image source={{ uri: meal.photoUri }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="bowl" size={22} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.mealText}>
          <ThemedText type="default" numberOfLines={1} style={styles.mealName}>
            {mealTitle(meal)}
          </ThemedText>
          <View style={styles.calLine}>
            <Icon name="flame" size={14} filled color={theme.text} />
            <ThemedText type="small">{`${formatNumber(totals.calories)} calories`}</ThemedText>
          </View>
          <View style={styles.macroLine}>
            <Macro icon="drumstick" color={theme.protein} value={totals.protein} />
            <Macro icon="wheat" color={theme.carbs} value={totals.carbs} />
            <Macro icon="drop" color={theme.fat} value={totals.fat} />
            {mealHasEstimates(meal) && <EstimateBadge status="estimated" />}
          </View>
        </View>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
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
                <ThemedText type="small">{`${formatNumber(item.totals.calories)} cal`}</ThemedText>
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

function Macro({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View style={styles.macro}>
      <Icon name={icon} size={13} color={color} strokeWidth={2} />
      <ThemedText type="small" style={styles.macroText}>{`${Math.round(value)}g`}</ThemedText>
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
  list: { gap: Spacing.two + Spacing.one },
  empty: { alignItems: 'center', gap: Spacing.three },
  illustration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '85%',
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  lines: { flex: 1, gap: Spacing.two },
  line: { height: 8, borderRadius: 4 },
  emptyText: { textAlign: 'center', fontSize: 15 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one, padding: Spacing.three },
  groupTitle: { flex: 1, gap: Spacing.half },
  groupLabel: { fontWeight: 600, fontSize: 17 },
  logButton: { paddingHorizontal: Spacing.three + Spacing.one, paddingVertical: Spacing.two, borderRadius: Radius.pill },
  pressed: { opacity: 0.6 },
  mealWrap: { borderTopWidth: StyleSheet.hairlineWidth },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  thumb: { width: 60, height: 60, borderRadius: Radius.md },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  mealText: { flex: 1, gap: Spacing.one },
  mealName: { fontWeight: 600 },
  calLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  macroLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one, flexWrap: 'wrap' },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  macroText: { fontSize: 13 },
  details: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  itemText: { flex: 1 },
  itemName: { fontWeight: 600 },
  itemNumbers: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
});
