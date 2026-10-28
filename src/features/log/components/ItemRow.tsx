import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealItem } from '@/core/types';

import { SOURCE_LABELS, formatGrams, macroLine } from '../format';
import { Badge, Card, TextField } from './ui';

interface Props {
  item: MealItem;
  onGramsChange: (id: string, grams: number | undefined) => void;
  onRemove: (id: string) => void;
}

function ItemRowImpl({ item, onGramsChange, onRemove }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(formatGrams(item.grams));
  const missing = item.grams == null || !(item.grams > 0);
  const noNutrition = item.source === 'ai_estimate' && item.per100g.calories === 0 && item.per100g.protein === 0;

  const change = (t: string) => {
    setText(t);
    const n = Number(t.replace(',', '.'));
    onGramsChange(item.id, t.trim() === '' || !Number.isFinite(n) ? undefined : n);
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
  grams: { width: 84, textAlign: 'right', minHeight: 44 },
  remove: { alignSelf: 'flex-end', paddingTop: Spacing.one },
});
