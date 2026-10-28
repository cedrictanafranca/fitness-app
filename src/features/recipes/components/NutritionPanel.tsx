import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { recipeNutrition, recipePerServing } from '@/core/nutrition/engine';
import type { Macros, RecipeIngredient } from '@/core/types';

import { basisLabel, fmtG } from '../format';
import { Badge, Card, MacroSummary, Notice, layout } from './ui';

function MacroLine({ label, m, extra }: { label: string; m: Macros; extra?: string }) {
  return (
    <View style={styles.line}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText type="small">
        {Math.round(m.calories)} kcal · P {fmtG(m.protein)} · C {fmtG(m.carbs)} · F {fmtG(m.fat)}
      </ThemedText>
      {extra ? (
        <ThemedText type="small" themeColor="textSecondary">
          {extra}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Live recipe totals: whole batch, per 100 g (raw or cooked basis) and per serving. */
export function NutritionPanel({
  ingredients,
  cookedWeightG,
  servings,
  incompleteCount = 0,
}: {
  ingredients: RecipeIngredient[];
  cookedWeightG?: number;
  servings?: number;
  incompleteCount?: number;
}) {
  const n = useMemo(() => recipeNutrition(ingredients, cookedWeightG), [ingredients, cookedWeightG]);
  const perServing = servings && servings > 0 ? recipePerServing(n, servings) : null;
  const basisWeight = n.basis === 'cooked' && cookedWeightG ? cookedWeightG : n.rawWeightG;

  return (
    <View style={layout.stack}>
      <Card>
        <View style={layout.row}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={layout.grow}>
            WHOLE BATCH · {fmtG(n.rawWeightG)} raw{n.basis === 'cooked' ? ` → ${fmtG(basisWeight)} cooked` : ''}
          </ThemedText>
          {n.hasEstimates ? <Badge label="estimate" tone="estimate" /> : null}
        </View>
        <MacroSummary calories={n.totals.calories} protein={n.totals.protein} carbs={n.totals.carbs} fat={n.totals.fat} />
        <View style={styles.divider} />
        <MacroLine label={`Per 100 g`} m={n.per100g} extra={basisLabel(n.basis)} />
        {perServing && servings ? (
          <MacroLine
            label={`Per serving (${servings})`}
            m={perServing}
            extra={basisWeight > 0 ? `≈ ${fmtG(basisWeight / servings)} per serving` : undefined}
          />
        ) : null}
      </Card>
      {n.basis === 'raw' && ingredients.length > 0 ? (
        <Notice
          tone="warn"
          text="No cooked weight yet, so per 100 g is based on the raw ingredients. Weigh the finished dish and add it for accurate portions."
        />
      ) : null}
      {n.hasEstimates ? (
        <Notice tone="info" text="Some amounts are estimated, so these totals are approximate." />
      ) : null}
      {incompleteCount > 0 ? (
        <Notice
          tone="warn"
          text={`${incompleteCount} ingredient${incompleteCount === 1 ? ' is' : 's are'} missing grams or nutrition values and not counted yet.`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { gap: 2, marginTop: Spacing.one },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#8884', marginVertical: Spacing.one },
});
