import { describe, expect, it } from 'vitest';

import { standardUnitGrams } from './units';

describe('standardUnitGrams', () => {
  it('converts standard weights and volumes', () => {
    expect(standardUnitGrams('oz')).toBe(28.35);
    expect(standardUnitGrams('fl. oz')).toBe(29.57);
    expect(standardUnitGrams('ML')).toBe(1);
    expect(standardUnitGrams('lb')).toBe(453.6);
  });

  it('leaves household units to calibrations and estimates', () => {
    expect(standardUnitGrams('cup')).toBeNull();
    expect(standardUnitGrams('scoop')).toBeNull();
    expect(standardUnitGrams('bottle')).toBeNull();
  });
});
