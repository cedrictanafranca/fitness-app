import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Food, MealItem } from '@/core/types';
import { foodsRepo, mealsRepo, recipesRepo } from '@/data/repos';
import { QuantitySheet } from '@/features/log/components/QuantitySheet';
import { Button, Icon, Notice, TextField } from '@/features/log/components/ui';
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

export default function SearchScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fromReview = from === 'review';

  const [query, setQuery] = useState('');
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

  const emptyText = query.trim()
    ? 'No matches. Try another name, or create a custom food.'
    : 'No suggestions yet. Search above, or create a custom food.';

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: 'Add food',
          ...(fromReview
            ? {}
            : {
                headerLeft: () => (
                  <Pressable accessibilityRole="button" onPress={cancelLogFlow} hitSlop={8}>
                    <ThemedText type="default">Close</ThemedText>
                  </Pressable>
                ),
              }),
        }}
      />
      <View style={styles.header}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods and recipes"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search foods"
        />
        {remoteError ? <Notice tone="warn">{remoteError}</Notice> : null}
        {error ? <Notice tone="bad">{error}</Notice> : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(p, i) => `${p.key}:${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {section.title}
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
              <ThemedText type="default" numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {[item.brand, SOURCE_LABELS[item.source]].filter(Boolean).join(' · ')} · per 100 g {macroLine(item.per100g)}
              </ThemedText>
            </View>
            <Icon name="plus.circle.fill" fallback="+" size={26} color={theme.text} />
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              {emptyText}
            </ThemedText>
          )
        }
        ListFooterComponent={loading && sections.length > 0 ? <ActivityIndicator style={styles.spinner} /> : undefined}
      />

      <View
        style={[
          styles.bottom,
          { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected, paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}>
        <Button label="Create custom food" variant="secondary" onPress={() => goAddFood()} />
      </View>

      <QuantitySheet
        target={target}
        mealId={getDraft().mealId}
        onClose={() => setTarget(null)}
        onConfirm={onConfirm}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  sectionTitle: { marginTop: Spacing.three, marginBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  rowText: { flex: 1, gap: 2 },
  spinner: { marginVertical: Spacing.four },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  bottom: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
});
