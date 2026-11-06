import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HeaderIconButton } from '@/components/ui/header';
import { Icon as LineIcon } from '@/components/ui/icons';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import type { Food, MealItem } from '@/core/types';
import { foodsRepo, mealsRepo, recipesRepo } from '@/data/repos';
import { QuantitySheet } from '@/features/log/components/QuantitySheet';
import { Button, Notice, TextField } from '@/features/log/components/ui';
import { createdFoodStore } from '@/features/log/created-food-store';
import { addDraftItem, getDraft } from '@/features/log/draft-store';
import { SOURCE_LABELS, errorMessage, macroLine } from '@/features/log/format';
import { cancelLogFlow, goAddFood, replaceWithReview } from '@/features/log/nav';
import {
  fromCandidate,
  fromFood,
  fromMealItem,
  fromRecipe,
  type Pickable,
} from '@/features/log/pickable';
import { useTheme } from '@/hooks/use-theme';
import { searchFoods, type FoodCandidate } from '@/services/foods';

interface Section {
  title: string;
  data: Pickable[];
}

const DEBOUNCE_MS = 350;

type Filter = 'all' | 'recent' | 'foods' | 'recipes';
const FILTERS: { value: Filter; label: string; sections: string[] }[] = [
  { value: 'all', label: 'All', sections: [] },
  { value: 'recent', label: 'Recent', sections: ['Recent'] },
  { value: 'foods', label: 'My foods', sections: ['My foods'] },
  { value: 'recipes', label: 'Recipes', sections: ['Recipes'] },
];

export default function SearchScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fromReview = from === 'review';

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<Pickable | null>(null);
  const requestId = useRef(0);

  const run = useCallback(async (q: string) => {
    const id = ++requestId.current;
    const term = q.trim();
    setLoading(true);
    setError(null);
    setRemoteError(null);
    try {
      let next: Section[];
      if (!term) {
        const [recent, saved, recipes] = await Promise.all([
          mealsRepo.listRecent(30),
          foodsRepo.listSaved(),
          recipesRepo.list(),
        ]);
        const seen = new Set<string>();
        const recentPicks: Pickable[] = [];
        for (const item of recent.flatMap((m) => [...m.items].reverse())) {
          const p = fromMealItem(item);
          if (seen.has(p.key)) continue;
          seen.add(p.key);
          recentPicks.push(p);
          if (recentPicks.length >= 12) break;
        }
        next = [
          { title: 'Recent', data: recentPicks },
          { title: 'My foods', data: saved.map(fromFood) },
          { title: 'Recipes', data: recipes.map(fromRecipe) },
        ];
      } else {
        const [foodsRes, recipesRes] = await Promise.allSettled([searchFoods(term), recipesRepo.searchByName(term)]);
        let local: Food[];
        let remote: FoodCandidate[];
        if (foodsRes.status === 'fulfilled') {
          local = foodsRes.value.local;
          remote = foodsRes.value.remote;
        } else {
          remote = [];
          local = await foodsRepo.search(term);
          setRemoteError(`Couldn't reach the food database (${errorMessage(foodsRes.reason, 'unknown error')}).`);
        }
        const recipes = recipesRes.status === 'fulfilled' ? recipesRes.value : [];
        next = [
          { title: 'My foods', data: local.map(fromFood) },
          { title: 'Recipes', data: recipes.map(fromRecipe) },
          { title: 'Database', data: remote.map(fromCandidate) },
        ];
      }
      if (id === requestId.current) setSections(next.filter((s) => s.data.length > 0));
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e, 'Search failed.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // Debounced search (immediate for the empty-query suggestions).
  useEffect(() => {
    const t = setTimeout(() => void run(query), query.trim() ? DEBOUNCE_MS : 0);
    return () => clearTimeout(t);
  }, [query, run]);

  // When coming back from add-food, open the quantity sheet for the food just created.
  useFocusEffect(
    useCallback(() => {
      const f = createdFoodStore.get();
      if (f) {
        createdFoodStore.set(null);
        setTarget(fromFood(f));
        if (!query.trim()) void run('');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onConfirm = (item: MealItem) => {
    addDraftItem({ ...item, mealId: getDraft().mealId ?? '' });
    setTarget(null);
    if (fromReview) router.back();
    else replaceWithReview();
  };

  const allowed = FILTERS.find((f) => f.value === filter)?.sections ?? [];
  const visible = filter === 'all' ? sections : sections.filter((s) => allowed.includes(s.title));

  const emptyTitle =
    filter === 'foods' ? 'My Foods' : filter === 'recipes' ? 'Recipes' : filter === 'recent' ? 'Recent' : query.trim() ? 'No matches' : 'Nothing yet';
  const emptyText =
    filter === 'foods'
      ? 'Add a custom food to your personal list.'
      : filter === 'recipes'
        ? 'Save family dishes under Recipes to log them by weight.'
        : filter === 'recent'
          ? 'Foods you log show up here for quick re-adding.'
          : query.trim()
            ? 'Try another name, or create a custom food.'
            : 'Search above, or create a custom food.';

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: 'Log Food',
          ...(fromReview
            ? {}
            : { headerLeft: () => <HeaderIconButton icon="back" accessibilityLabel="Close" onPress={cancelLogFlow} /> }),
        }}
      />
      <View style={[styles.tabs, { borderBottomColor: theme.border }]} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const selected = filter === f.value;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(f.value)}
              style={[styles.tab, selected && { borderBottomColor: theme.text }]}>
              <ThemedText style={[styles.tabLabel, { color: selected ? theme.text : theme.textSecondary }, selected && styles.tabSelected]}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.header}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Describe what you ate"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search foods"
          leading={<LineIcon name="search" size={18} color={theme.textSecondary} />}
        />
        {remoteError ? <Notice tone="warn">{remoteError}</Notice> : null}
        {error ? <Notice tone="bad">{error}</Notice> : null}
      </View>

      <SectionList
        sections={visible}
        keyExtractor={(p, i) => `${p.key}:${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText style={styles.sectionTitle} accessibilityRole="header">
            {section.title === 'Recent' && !query.trim() ? 'Suggestions' : section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTarget(item)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <View style={styles.rowText}>
              <ThemedText style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <View style={styles.rowMeta}>
                <LineIcon name="flame" size={13} filled color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowMetaText}>
                  {`${Math.round(item.per100g.calories)} cal · 100 g`}
                  {item.brand ? ` · ${item.brand}` : ''}
                  {` · ${SOURCE_LABELS[item.source]}`}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.rowMacros}>
                {macroLine(item.per100g)}
              </ThemedText>
            </View>
            <View style={[styles.plus, { backgroundColor: theme.surface }, Elevation.card]}>
              <LineIcon name="plus" size={18} strokeWidth={2.2} color={theme.text} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
                <LineIcon name={filter === 'recipes' ? 'book' : filter === 'recent' ? 'timer' : 'bowl'} size={34} color={theme.text} />
              </View>
              <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                {emptyText}
              </ThemedText>
              {filter === 'foods' || (filter === 'all' && !query.trim() && sections.length === 0) ? (
                <Button label="Add food" onPress={() => goAddFood()} style={styles.emptyButton} />
              ) : null}
            </View>
          )
        }
        ListFooterComponent={loading && sections.length > 0 ? <ActivityIndicator style={styles.spinner} /> : undefined}
      />

      <View style={[styles.bottom, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View style={styles.bottomRow}>
          <Button
            label="Manual Add"
            variant="secondary"
            onPress={() => goAddFood()}
            style={styles.bottomButton}
            leading={<LineIcon name="pencil" size={18} color={theme.text} />}
          />
          {!fromReview ? (
            <Button
              label="Describe it"
              variant="secondary"
              onPress={cancelLogFlow}
              style={styles.bottomButton}
              leading={<LineIcon name="mic" size={18} color={theme.text} />}
            />
          ) : null}
        </View>
      </View>

      <QuantitySheet target={target} mealId={getDraft().mealId} onClose={() => setTarget(null)} onConfirm={onConfirm} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { paddingVertical: Spacing.two + Spacing.one, marginRight: Spacing.four, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 16, lineHeight: 20, fontWeight: 500 },
  tabSelected: { fontWeight: 700 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: 700, marginTop: Spacing.three, marginBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { flex: 1, fontSize: 13 },
  rowMacros: { fontSize: 12 },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginVertical: Spacing.four },
  empty: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.six + Spacing.four, paddingHorizontal: Spacing.four },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  emptyTitle: { fontWeight: 700, fontSize: 22, lineHeight: 28 },
  emptyText: { textAlign: 'center' },
  emptyButton: { marginTop: Spacing.two, alignSelf: 'stretch' },
  bottom: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  bottomRow: { flexDirection: 'row', gap: Spacing.two },
  bottomButton: { flex: 1, paddingHorizontal: Spacing.two },
});
