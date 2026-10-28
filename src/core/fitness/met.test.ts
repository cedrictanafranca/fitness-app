import { describe, expect, it } from 'vitest';

import { ACTIVITY_KINDS, activityInfo, estimateCaloriesBurned } from './met';

describe('estimateCaloriesBurned', () => {
  it('uses MET × kg × hours, rounded to 5 kcal', () => {
    // 9.8 MET × 70 kg × 0.5 h = 343 → 345
    expect(estimateCaloriesBurned({ kind: 'run', intensity: 'medium', minutes: 30, weightKg: 70 })).toBe(345);
    // 3 MET × 60 kg × 0.25 h = 45
    expect(estimateCaloriesBurned({ kind: 'weights', intensity: 'low', minutes: 15, weightKg: 60 })).toBe(45);
  });

  it('scales with intensity and never returns below 5', () => {
    const low = estimateCaloriesBurned({ kind: 'cycle', intensity: 'low', minutes: 60, weightKg: 70 });
    const high = estimateCaloriesBurned({ kind: 'cycle', intensity: 'high', minutes: 60, weightKg: 70 });
    expect(high).toBeGreaterThan(low);
    expect(estimateCaloriesBurned({ kind: 'walk', intensity: 'low', minutes: 1, weightKg: 40 })).toBe(5);
  });

  it('rejects impossible inputs and falls back to "other" for unknown kinds', () => {
    expect(() => estimateCaloriesBurned({ kind: 'run', intensity: 'low', minutes: 0, weightKg: 70 })).toThrow(RangeError);
    expect(() => estimateCaloriesBurned({ kind: 'run', intensity: 'low', minutes: 10, weightKg: 0 })).toThrow(RangeError);
    expect(activityInfo('nope' as never).kind).toBe('other');
    expect(ACTIVITY_KINDS.map((a) => a.kind)).toEqual(['run', 'walk', 'cycle', 'weights', 'other']);
  });
});
