import { describe, expect, it } from 'vitest';
import {
  nameSimilarity,
  normalizeOffProduct,
  normalizeUsdaFood,
  rankFoods,
  tidyName,
  type NormalizedFood,
} from '../../server/normalize';
import { sanitizeAnalyzedMeal } from '../../server/sanitize';

// Shape of a /fdc/v1/foods/search result (nutrientId + nutrientName/unitName/value).
const usdaFoundation = {
  fdcId: 168878,
  description: 'Rice, white, long-grain, regular, enriched, cooked',
  dataType: 'SR Legacy',
  foodNutrients: [
    { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 2.69 },
    { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'G', value: 0.28 },
    { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 28.17 },
    { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 130 },
    { nutrientId: 1062, nutrientName: 'Energy', unitName: 'kJ', value: 544 },
  ],
};

const usdaBranded = {
  fdcId: 2345678,
  description: 'CHICKEN BREAST NUGGETS',
  dataType: 'Branded',
  brandOwner: 'ACME FOODS INC',
  servingSize: 85,
  servingSizeUnit: 'g',
  householdServingFullText: '5 pieces',
  foodNutrients: [
    // No nutrientId: only name + unit (older / alternate response format).
    { nutrientName: 'Protein', unitName: 'G', value: 14 },
    { nutrientName: 'Total lipid (fat)', unitName: 'G', value: 12 },
    { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 16 },
    { nutrientName: 'Energy', unitName: 'KCAL', value: 245 },
  ],
};

describe('normalizeUsdaFood', () => {
  it('maps nutrient ids to per-100 g macros', () => {
    const n = normalizeUsdaFood(usdaFoundation);
    expect(n?.tier).toBe(0);
    expect(n?.candidate).toMatchObject({
      source: 'usda',
      sourceRef: 'usda:168878',
      per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    });
  });

  it('falls back to nutrientName/unitName and reads branded servings', () => {
    const n = normalizeUsdaFood(usdaBranded);
    expect(n?.tier).toBe(1);
    expect(n?.candidate.name).toBe('Chicken Breast Nuggets');
    expect(n?.candidate.brand).toBe('Acme Foods Inc');
    expect(n?.candidate.per100g.calories).toBe(245);
    expect(n?.candidate.servings).toEqual([{ label: '5 pieces', grams: 85 }]);
  });

  it('does not mistake kJ for kcal and drops entries without calories', () => {
    expect(
      normalizeUsdaFood({
        fdcId: 1,
        description: 'Mystery',
        foodNutrients: [{ nutrientId: 1062, nutrientName: 'Energy', unitName: 'kJ', value: 500 }],
      }),
    ).toBeNull();
    expect(normalizeUsdaFood({ fdcId: 2, description: 'Empty', foodNutrients: [] })).toBeNull();
  });

  it('reads foodPortions as servings', () => {
    const n = normalizeUsdaFood({
      ...usdaFoundation,
      foodPortions: [{ gramWeight: 158, amount: 1, portionDescription: '1 cup' }, { gramWeight: 0 }],
    });
    expect(n?.candidate.servings).toEqual([{ label: '1 cup', grams: 158 }]);
  });
});

describe('normalizeOffProduct', () => {
  it('maps nutriments and serving info', () => {
    const n = normalizeOffProduct({
      code: '3017620422003',
      product_name: 'Hazelnut spread',
      brands: 'Nutella,Ferrero',
      serving_quantity: '15',
      serving_size: '15 g',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9,
      },
    });
    expect(n?.candidate).toMatchObject({
      name: 'Hazelnut spread',
      brand: 'Nutella',
      source: 'openfoodfacts',
      sourceRef: 'off:3017620422003',
      per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
      servings: [{ label: '1 serving (15 g)', grams: 15 }],
    });
  });

  it('falls back from kJ and drops products without energy', () => {
    const kj = normalizeOffProduct({
      code: '1',
      product_name: 'X',
      nutriments: { energy_100g: 418.4 },
    });
    expect(kj?.candidate.per100g.calories).toBe(100);
    expect(normalizeOffProduct({ code: '2', product_name: 'Y', nutriments: {} })).toBeNull();
    // Mis-entered kcal (1900) is replaced by the kJ-derived value; irreparable data is dropped.
    const bad = normalizeOffProduct({
      code: '3',
      product_name: 'Rice cakes',
      nutriments: { 'energy-kcal_100g': 1900, energy_100g: 1643.5 },
    });
    expect(bad?.candidate.per100g.calories).toBe(392.8);
    expect(normalizeOffProduct({ code: '4', product_name: 'Z', nutriments: { 'energy-kcal_100g': 5000 } })).toBeNull();
    expect(normalizeOffProduct({ product_name: 'No code', nutriments: { 'energy-kcal_100g': 1 } })).toBeNull();
  });
});

describe('ranking', () => {
  const mk = (name: string, ref: string, tier: 0 | 1): NormalizedFood => ({
    tier,
    candidate: {
      name,
      per100g: { calories: 1, protein: 0, carbs: 0, fat: 0 },
      source: tier === 0 ? 'usda' : 'openfoodfacts',
      sourceRef: ref,
      servings: [],
    },
  });

  it('puts reference data first, then closest name, caps and dedupes', () => {
    const ranked = rankFoods(
      'rice',
      [
        mk('Rice pudding with raisins', 'a', 1),
        mk('Rice', 'b', 1),
        mk('Beans, cooked', 'c', 0),
        mk('Rice, white, cooked', 'd', 0),
        mk('Rice', 'b', 1),
      ],
      3,
    );
    expect(ranked.map((r) => r.sourceRef)).toEqual(['d', 'c', 'b']);
  });

  it('scores exact above prefix above partial', () => {
    expect(nameSimilarity('rice', 'Rice')).toBe(1);
    expect(nameSimilarity('rice', 'Rice, white')).toBeGreaterThan(nameSimilarity('rice', 'Wild rice mix blend'));
    expect(nameSimilarity('rice', 'Apple')).toBe(0);
  });

  it('title-cases only all-caps names', () => {
    expect(tidyName('GREEK YOGURT')).toBe('Greek Yogurt');
    expect(tidyName('iPhone Cake')).toBe('iPhone Cake');
  });
});

describe('sanitizeAnalyzedMeal', () => {
  const base = {
    recipeNames: ["Mom's chicken adobo"],
    calibrations: [{ name: 'scoop', foodName: 'rice', grams: 145 }],
    localHour: 13,
  };
  const item = {
    name: 'white rice, cooked',
    estimatedGrams: null,
    statedGrams: null,
    quantity: 2,
    unitLabel: 'scoop',
    recipeMatch: null,
    confidence: 1.4,
    estimatedPer100g: null,
  };

  it('fills estimatedGrams from a matching calibration and clamps confidence', () => {
    const out = sanitizeAnalyzedMeal(
      { items: [item], mealType: 'lunch', clarification: '  ', notes: null },
      { ...base, text: '2 scoops of rice' },
    );
    expect(out.items[0]).toMatchObject({ estimatedGrams: 290, statedGrams: null, confidence: 1 });
    expect(out.clarification).toBeNull();
  });

  it('drops statedGrams without text and unknown recipe matches', () => {
    const out = sanitizeAnalyzedMeal(
      {
        items: [{ ...item, statedGrams: 200, recipeMatch: 'Invented stew' }],
        mealType: null,
        clarification: null,
        notes: null,
      },
      { ...base },
    );
    expect(out.items[0]?.statedGrams).toBeNull();
    expect(out.items[0]?.recipeMatch).toBeNull();
  });

  it('keeps an exact recipe match', () => {
    const out = sanitizeAnalyzedMeal(
      { items: [{ ...item, recipeMatch: "Mom's chicken adobo" }], mealType: null, clarification: null, notes: null },
      { ...base, text: 'mom adobo' },
    );
    expect(out.items[0]?.recipeMatch).toBe("Mom's chicken adobo");
  });
});
