/**
 * Grams in one standard weight or volume unit. Volumes assume a water-like density (1 ml ≈ 1 g),
 * right for drinks and close for milk and soups. Household units (cup, scoop, bowl) are not here:
 * they vary, so they come from calibrations, database servings or the AI's estimate.
 */
const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  pound: 453.6,
  pounds: 453.6,
  'fl oz': 29.57,
  'fluid ounce': 29.57,
  'fluid ounces': 29.57,
  ml: 1,
  milliliter: 1,
  millilitre: 1,
  cl: 10,
  l: 1000,
  liter: 1000,
  litre: 1000,
};

/** Grams per unit for a standard weight/volume label ("oz", "fl. oz", "ml"); null for anything else. */
export function standardUnitGrams(unitLabel: string): number | null {
  const u = unitLabel.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  return GRAMS_PER_UNIT[u] ?? null;
}
