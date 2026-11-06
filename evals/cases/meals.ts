/**
 * Meal-logging eval cases with reference nutrition.
 *
 * References are USDA FoodData Central (SR Legacy / FNDDS) values for the stated portion, so a
 * case measures the whole pipeline: Claude's recognition and gram estimate, the food-database
 * match the app picks, and the engine's totals.
 */

export interface RefItem {
  /** Lower-case keywords; the item counts as found if any analyzed item name contains one. */
  match: string[];
  /** Reference grams for the portion described. */
  grams: number;
  /** Reference calories per 100 g, to judge the database match the app picked. */
  kcalPer100g: number;
}

export interface MealCase {
  id: string;
  /** What the user typed or dictated. */
  text: string;
  /** Plate weight the user typed, if any. */
  statedTotalGrams?: number;
  items: RefItem[];
  /** Reference totals for the whole meal. */
  calories: number;
  protein: number;
  /**
   * Allowed relative error on total calories. Tighter when the user stated quantities, wider
   * when the portion itself is a guess ("a bowl of rice").
   */
  tolerance: number;
  note?: string;
}

const egg = (count: number): RefItem => ({ match: ['egg'], grams: 50 * count, kcalPer100g: 155 });
const banana: RefItem = { match: ['banana'], grams: 118, kcalPer100g: 89 };
const chicken = (g: number): RefItem => ({ match: ['chicken'], grams: g, kcalPer100g: 165 });
const riceCup: RefItem = { match: ['rice'], grams: 158, kcalPer100g: 130 };
const pb: RefItem = { match: ['peanut butter'], grams: 16, kcalPer100g: 588 };

/** Typed descriptions with explicit quantities. */
export const TEXT_CASES: MealCase[] = [
  { id: 'banana', text: '1 medium banana', items: [banana], calories: 105, protein: 1.3, tolerance: 0.15 },
  { id: 'eggs-boiled', text: '2 large hard boiled eggs', items: [egg(2)], calories: 155, protein: 12.6, tolerance: 0.15 },
  { id: 'chicken-150g', text: '150 g grilled chicken breast', items: [chicken(150)], calories: 248, protein: 46.5, tolerance: 0.15 },
  { id: 'rice-cup', text: '1 cup of cooked white rice', items: [riceCup], calories: 205, protein: 4.3, tolerance: 0.15 },
  { id: 'apple', text: 'a medium apple', items: [{ match: ['apple'], grams: 182, kcalPer100g: 52 }], calories: 95, protein: 0.5, tolerance: 0.15 },
  { id: 'peanut-butter', text: '1 tablespoon of peanut butter', items: [pb], calories: 94, protein: 4, tolerance: 0.2 },
  {
    id: 'greek-yogurt',
    text: '200 g plain nonfat greek yogurt',
    items: [{ match: ['yogurt', 'yoghurt'], grams: 200, kcalPer100g: 59 }],
    calories: 118,
    protein: 20.4,
    tolerance: 0.15,
  },
  {
    id: 'ww-bread',
    text: 'a slice of whole wheat bread',
    items: [{ match: ['bread', 'toast'], grams: 32, kcalPer100g: 252 }],
    calories: 81,
    protein: 4,
    tolerance: 0.2,
  },
  {
    id: 'whole-milk',
    text: '1 cup of whole milk',
    items: [{ match: ['milk'], grams: 244, kcalPer100g: 61 }],
    calories: 149,
    protein: 7.7,
    tolerance: 0.15,
  },
  {
    id: 'almonds',
    text: '30 g almonds',
    items: [{ match: ['almond'], grams: 30, kcalPer100g: 579 }],
    calories: 174,
    protein: 6.3,
    tolerance: 0.15,
  },
  {
    id: 'coke-can',
    text: 'a 12 oz can of Coca-Cola',
    items: [{ match: ['coca', 'coke', 'cola'], grams: 368, kcalPer100g: 38 }],
    calories: 140,
    protein: 0,
    tolerance: 0.2,
  },
  {
    id: 'bowl-mixed',
    text: 'Chicken rice bowl with 150 g grilled chicken breast, 1 cup of white rice and half an avocado',
    items: [chicken(150), riceCup, { match: ['avocado'], grams: 80, kcalPer100g: 160 }],
    calories: 581,
    protein: 52,
    tolerance: 0.2,
    note: 'Half an avocado is 68–100 g of flesh depending on size; reference uses 80 g.',
  },
  {
    id: 'oatmeal-breakfast',
    text: 'a cup of oatmeal made with water, a medium banana and a tablespoon of peanut butter',
    items: [{ match: ['oat'], grams: 234, kcalPer100g: 71 }, banana, pb],
    calories: 365,
    protein: 11.2,
    tolerance: 0.2,
  },
  {
    id: 'vague-rice-bowl',
    text: 'a bowl of white rice',
    items: [{ match: ['rice'], grams: 200, kcalPer100g: 130 }],
    calories: 260,
    protein: 5.4,
    tolerance: 0.4,
    note: 'No quantity given: a bowl is 150–300 g, so the band is wide.',
  },
  {
    id: 'vague-chicken-breast',
    text: 'a grilled chicken breast',
    items: [chicken(172)],
    calories: 284,
    protein: 53,
    tolerance: 0.35,
    note: 'USDA "1/2 breast, cooked" is 172 g.',
  },
  {
    id: 'plate-weight',
    text: 'white rice',
    statedTotalGrams: 250,
    items: [{ match: ['rice'], grams: 250, kcalPer100g: 130 }],
    calories: 325,
    protein: 6.8,
    tolerance: 0.1,
    note: 'Weighed plate: the stated 250 g must be used exactly.',
  },
];

/**
 * Voice-style transcripts: the same foods phrased the way speech recognition returns them
 * (fillers, number words, self-corrections, no punctuation). Voice input reaches the AI as text,
 * so this covers everything after the on-device transcription.
 */
export const VOICE_CASES: MealCase[] = [
  {
    id: 'voice-eggs-banana',
    text: 'um so for breakfast I had two hard boiled eggs and uh a banana a medium one',
    items: [egg(2), banana],
    calories: 260,
    protein: 13.9,
    tolerance: 0.15,
  },
  {
    id: 'voice-number-words',
    text: 'lunch was like a hundred and fifty grams of chicken breast grilled with a cup of white rice',
    items: [chicken(150), riceCup],
    calories: 453,
    protein: 50.8,
    tolerance: 0.15,
  },
  {
    id: 'voice-two-hundred-grams',
    text: 'I had two hundred grams of plain nonfat greek yogurt with thirty grams of almonds',
    items: [{ match: ['yogurt', 'yoghurt'], grams: 200, kcalPer100g: 59 }, { match: ['almond'], grams: 30, kcalPer100g: 579 }],
    calories: 292,
    protein: 26.7,
    tolerance: 0.15,
  },
  {
    id: 'voice-self-correction',
    text: 'a glass of whole milk no wait make that skim milk one cup',
    items: [{ match: ['skim', 'nonfat', 'fat free', 'fat-free'], grams: 245, kcalPer100g: 34 }],
    calories: 83,
    protein: 8.3,
    tolerance: 0.2,
    note: 'Must log skim milk only, not whole milk.',
  },
  {
    id: 'voice-run-on',
    text: 'had an apple and a tablespoon of peanut butter as a snack',
    items: [{ match: ['apple'], grams: 182, kcalPer100g: 52 }, pb],
    calories: 189,
    protein: 4.5,
    tolerance: 0.15,
  },
];
