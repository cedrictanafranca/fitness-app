import { describe, expect, it } from 'vitest';

import type { WeightRecord } from '../types';
import { bmi, bmiCategory, loggingStreak, weightChanges, weightTrend } from './stats';

const w = (date: string, kg: number): WeightRecord => ({ id: date, date, weightKg: kg });

describe('loggingStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(loggingStreak(['2026-10-28', '2026-10-27', '2026-10-26', '2026-10-20'], '2026-10-28')).toBe(3);
  });
  it('keeps the streak alive when today is still empty', () => {
    expect(loggingStreak(['2026-10-27', '2026-10-26'], '2026-10-28')).toBe(2);
    expect(loggingStreak(['2026-10-26'], '2026-10-28')).toBe(0);
    expect(loggingStreak([], '2026-10-28')).toBe(0);
  });
});

describe('bmi', () => {
  it('computes and classifies', () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmiCategory(22.9)).toBe('healthy');
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(27)).toBe('overweight');
    expect(bmiCategory(31)).toBe('obese');
    expect(() => bmi(0, 175)).toThrow(RangeError);
  });
});

describe('weightChanges / weightTrend', () => {
  const history = [w('2026-10-28', 70), w('2026-10-20', 71.5), w('2026-09-25', 73), w('2026-07-01', 76)];

  it('compares the latest entry with the entry at or before each window start', () => {
    expect(weightChanges(history, '2026-10-28')).toEqual([
      { days: 7, deltaKg: -1.5 },
      { days: 30, deltaKg: -3 },
      { days: 90, deltaKg: -6 },
    ]);
  });

  it('returns null when there is no older entry', () => {
    expect(weightChanges([w('2026-10-28', 70)], '2026-10-28')).toEqual([
      { days: 7, deltaKg: null },
      { days: 30, deltaKg: null },
      { days: 90, deltaKg: null },
    ]);
    expect(weightChanges([], '2026-10-28')[0].deltaKg).toBeNull();
  });

  it('filters and orders the trend', () => {
    expect(weightTrend(history, '2026-10-28', 30).map((x) => x.date)).toEqual(['2026-09-28', '2026-10-20', '2026-10-28'].filter((d) => d !== '2026-09-28'));
    expect(weightTrend(history, '2026-10-28', null)).toHaveLength(4);
    expect(weightTrend(history, '2026-10-28', null)[0].date).toBe('2026-07-01');
  });
});
