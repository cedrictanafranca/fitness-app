import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PORTION_ADJUSTMENTS, type TypicalPortion } from '@/core/nutrition/portions';
import { useTheme } from '@/hooks/use-theme';
import type { MealItem } from '@/core/types';

import { SOURCE_LABELS, formatGrams, macroLine } from '../format';
import { Badge, Card, Chip, TextField } from './ui';

interface Props {
  item: MealItem;
  /** The user's usual measured weight for this food, when known. */
  hint?: TypicalPortion;
  onGramsChange: (id: string, grams: number | undefined) => void;
  /** Quick adjustment of an estimate (stays estimated). */
  onScale?: (id: string, factor: number) => void;
  /** Adopt a suggested estimate such as the usual portion (stays estimated). */
  onUseEstimate?: (id: string, grams: number, basis: string) => void;
  onRemove: (id: string) => void;
}

function parseGramsText(t: string): number | undefined {
  const n = Number(t.replace(',', '.'));
  return t.trim() === '' || !Number.isFinite(n) ? undefined : n;
}

function ItemRowImpl({ item, hint, onGramsChange, onScale, onUseEstimate, onRemove }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(formatGrams(item.grams));
  // Keep the field in sync when grams change from outside (chips, plate split), without
  // clobbering a weight the user is still typing.
  const [seenGrams, setSeenGrams] = useState(item.grams);
  if (item.grams !== seenGrams) {
    setSeenGrams(item.grams);
    if (parseGramsText(text) !== item.grams) setText(formatGrams(item.grams));
  }
  const missing = item.grams == null || !(item.grams > 0);
  const estimated = item.estimateStatus === 'estimated' && !missing;
  const showUsual = hint != null && (item.grams == null || Math.abs(hint.grams - item.grams) / hint.grams > 0.1);
  const noNutrition = item.source === 'ai_estimate' && item.per100g.calories === 0 && item.per100g.protein === 0;

  const change = (t: string) => {
    setText(t);
    onGramsChange(item.id, parseGramsText(t));
  };

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titleCol}>
          <ThemedText type="default" numberOfLines={2}>
            {item.name}
          </ThemedText>
          <View style={styles.badges}>
            <Badge label={SOURCE_LABELS[item.source]} tone="neutral" />
            <Badge
              label={item.estimateStatus === 'measured' ? 'Measured' : 'Estimated'}
              tone={item.estimateStatus === 'measured' ? 'good' : 'warn'}
            />
          </View>
        </View>
        <View style={styles.gramsCol}>
          <TextField
            value={text}
            onChangeText={change}
            keyboardType="decimal-pad"
            placeholder="grams"
            accessibilityLabel={`Grams of ${item.name}`}
            style={[styles.grams, missing ? { borderWidth: 1, borderColor: '#D14343' } : null]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            g
          </ThemedText>
        </View>
      </View>

      {item.quantity != null && item.unitLabel ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.quantity} × {item.unitLabel}
        </ThemedText>
      ) : null}

      {missing ? (
        <ThemedText type="small" style={{ color: '#D14343' }}>
          Enter the weight to include this item.
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {macroLine(item.totals)}
        </ThemedText>
      )}

      {estimated ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLabel={`Estimate range for ${item.name}`}>
          {[
            item.gramsRange ? `Likely ${Math.round(item.gramsRange.low)}–${Math.round(item.gramsRange.high)} g` : null,
            item.portionBasis ? `based on ${item.portionBasis}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Estimated weight — weigh it or adjust below.'}
        </ThemedText>
      ) : null}

      {(estimated && onScale) || (showUsual && onUseEstimate) ? (
        <View style={styles.chips}>
          {showUsual && onUseEstimate ? (
            <Chip
              label={`Usually ${Math.round(hint!.grams)} g`}
              onPress={() => onUseEstimate(item.id, hint!.grams, `your usual portion (${hint!.samples} ${hint!.samples === 1 ? 'entry' : 'entries'})`)}
            />
          ) : null}
          {estimated && onScale
            ? PORTION_ADJUSTMENTS.map((a) => (
                <Chip key={a.label} label={a.label} onPress={() => onScale(item.id, a.factor)} />
              ))
            : null}
        </View>
      ) : null}
      {noNutrition ? (
        <ThemedText type="small" style={{ color: '#C27A12' }}>
          No nutrition data found for this item. Remove it and add it from search.
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        onPress={() => onRemove(item.id)}
        hitSlop={8}
        style={styles.remove}>
        <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
          Remove
        </ThemedText>
      </Pressable>
    </Card>
  );
}

export const ItemRow = memo(ItemRowImpl);

const styles = StyleSheet.create({
  card: { gap: Spacing.one },
  top: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  titleCol: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap' },
  gramsCol: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, paddingTop: Spacing.one },
  grams: { width: 84, textAlign: 'right', minHeight: 44 },
  remove: { alignSelf: 'flex-end', paddingTop: Spacing.one },
});
