import { describe, expect, it } from 'vitest';

import type { Macros, Meal, MealItem } from '../types';
import {
  choosePortion,
  distributePlateWeight,
  normalizeFoodName,
  rangeForEstimate,
  sameFood,
  sanitizeRange,
  scaleGrams,
  typicalGramsFor,
  typicalPortions,
} from './portions';

const per: Macros = { calories: 100, protein: 10, carbs: 10, fat: 1 };

function item(name: string, grams: number, status: MealItem['estimateStatus'] = 'measured'): MealItem {
  return { id: `${name}-${grams}`, mealId: 'm', name, ref: { kind: 'none' }, grams, per100g: per, totals: per, source: 'usda', estimateStatus: status };
}

function meal(timestamp: string, items: MealItem[]): Meal {
  return { id: timestamp, date: timestamp.slice(0, 10), timestamp, mealType: 'lunch', items, createdAt: '', updatedAt: '' };
}

describe('scaleGrams / ranges', () => {
  it('scales and rounds to one decimal', () => {
    expect(scaleGrams(150, 1.25)).toBe(187.5);
    expect(scaleGrams(33.3, 0.5)).toBe(16.7);
    expect(() => scaleGrams(10, 0)).toThrow(RangeError);
  });

  it('sanitizes model ranges around the likely weight', () => {
    expect(sanitizeRange({ low: 250, high: 150 }, 200)).toEqual({ low: 150, high: 250 });
    expect(sanitizeRange({ low: 210, high: 260 }, 200)).toEqual({ low: 200, high: 260 });
    expect(sanitizeRange({ low: -5, high: 100 }, 50)).toEqual({ low: 0, high: 100 });
    expect(sanitizeRange({ low: 100, high: 100 }, null)).toBeNull();
    expect(sanitizeRange({ low: 1, high: 99999 }, 50)).toBeNull();
    expect(sanitizeRange(null, 50)).toBeNull();
  });

  it('widens the fallback range as confidence drops', () => {
    expect(rangeForEstimate(100, 1)).toEqual({ low: 75, high: 125 });
    expect(rangeForEstimate(100, 0)).toEqual({ low: 40, high: 160 });
    const mid = rangeForEstimate(200, 0.5);
    expect(mid.low).toBeLessThan(200);
    expect(mid.high).toBeGreaterThan(200);
  });
});

describe('distributePlateWeight', () => {
  it('splits proportionally to the estimates and sums exactly to the total', () => {
    expect(distributePlateWeight([200, 100, 100], 450)).toEqual([225, 112.5, 112.5]);
    const parts = distributePlateWeight([333, 333, 334], 1000);
    expect(parts.reduce((s, p) => s + p, 0)).toBeCloseTo(1000, 5);
  });

  it('gives unknown items the average of the known ones, or an equal split', () => {
    expect(distributePlateWeight([300, null, 100], 600)).toEqual([300, 200, 100]);
    expect(distributePlateWeight([null, null], 300)).toEqual([150, 150]);
    expect(distributePlateWeight([], 300)).toEqual([]);
    expect(() => distributePlateWeight([1], 0)).toThrow(RangeError);
  });
});

describe('food name matching', () => {
  it('normalizes punctuation and case', () => {
    expect(normalizeFoodName('White Rice, cooked')).toBe('white rice cooked');
  });

  it('matches the same food with different descriptors', () => {
    expect(sameFood('white rice, cooked', 'White rice')).toBe(true);
    expect(sameFood('chicken breast, grilled', 'grilled chicken breast')).toBe(true);
    expect(sameFood('chicken breast', 'chicken thigh')).toBe(false);
    expect(sameFood('rice', 'rice cake')).toBe(true); // containment is deliberately lenient on short names
    expect(sameFood('', 'rice')).toBe(false);
  });
});

describe('typical portions from history', () => {
  const history = [
    item('white rice, cooked', 180),
    item('white rice, cooked', 150),
    item('white rice, cooked', 400, 'estimated'), // estimates never feed the prior
    item('chicken breast, grilled', 200),
    item('white rice, cooked', 160),
  ];

  it('uses the median of measured entries only', () => {
    expect(typicalGramsFor(history, 'White rice')).toEqual({ name: 'White rice', grams: 160, samples: 3 });
    expect(typicalGramsFor(history, 'salmon')).toBeNull();
    expect(typicalGramsFor([item('rice', 500, 'estimated')], 'rice')).toBeNull();
  });

  it('lists one typical portion per distinct food, newest meals first', () => {
    const meals = [
      meal('2026-10-20T12:00:00Z', [item('white rice, cooked', 150), item('salmon', 120)]),
      meal('2026-10-27T12:00:00Z', [item('white rice, cooked', 180), item('chicken breast', 200, 'estimated')]),
    ];
    const typ = typicalPortions(meals);
    expect(typ.map((t) => t.name)).toEqual(['white rice, cooked', 'salmon']);
    expect(typ[0]).toEqual({ name: 'white rice, cooked', grams: 165, samples: 2 });
  });
});

describe('choosePortion', () => {
  const typical = { name: 'rice', grams: 160, samples: 3 };

  it('prefers a confident visual estimate and keeps its range', () => {
    const c = choosePortion({ aiGrams: 220, aiConfidence: 0.9, aiRange: { low: 180, high: 260 }, aiBasis: 'standard plate', typical });
    expect(c).toEqual({ grams: 220, range: { low: 180, high: 260 }, basis: 'ai', label: 'standard plate' });
  });

  it('falls back to history for a weak or missing estimate', () => {
    const weak = choosePortion({ aiGrams: 300, aiConfidence: 0.3, aiRange: null, aiBasis: null, typical });
    expect(weak?.basis).toBe('history');
    expect(weak?.grams).toBe(160);
    expect(weak?.range).toEqual({ low: 20, high: 300 }); // widened to include the AI guess
    const none = choosePortion({ aiGrams: null, aiConfidence: 0, aiRange: null, aiBasis: null, typical });
    expect(none).toMatchObject({ grams: 160, basis: 'history', range: { low: 128, high: 192 } });
  });

  it('derives a fallback range for an AI estimate without one, and null with nothing', () => {
    const c = choosePortion({ aiGrams: 100, aiConfidence: 1, aiRange: null, aiBasis: null, typical: null });
    expect(c).toEqual({ grams: 100, range: { low: 75, high: 125 }, basis: 'ai', label: 'visual estimate' });
    expect(choosePortion({ aiGrams: null, aiConfidence: 0, aiRange: null, aiBasis: null, typical: null })).toBeNull();
  });
});
