/**
 * Meal-logging eval cases with reference nutrition.
 *
 * References are USDA FoodData Central (SR Legacy / FNDDS) values for the stated portion, so a
 * case measures the whole pipeline: Claude's recognition and gram estimate, the food-database
 * match the app picks, and the engine's totals.
 */

import type { Food, NutritionSource, PortionCalibration, Recipe } from '@/core/types';

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
  /** The user's own data the app would send along (saved foods, recipes, calibrated units). */
  context?: CaseContext;
  /** Nutrition source the first reference item must come from (e.g. 'custom' for a saved food). */
  expectSource?: NutritionSource;
  /** Words that must not appear in any logged item ("whole" after "no wait, skim"). */
  forbid?: string[];
}

export interface CaseContext {
  savedFoods?: Food[];
  recipes?: Recipe[];
  calibrations?: PortionCalibration[];
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
  {
    id: 'apple',
    text: 'a medium apple',
    items: [{ match: ['apple'], grams: 182, kcalPer100g: 57 }],
    calories: 104,
    protein: 0.5,
    tolerance: 0.15,
    note: 'USDA SR Legacy lists apples at 52 kcal/100 g; the newer Foundation data puts common varieties at 59-65.',
  },
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
    forbid: ['whole'],
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

// ---------- The user's own data, for cases that depend on it ----------

const stamp = { createdAt: '', updatedAt: '' };

/** A grocery the user saved from its label (test values, not the real product's label). */
export const SAVED_OAT_VANILLA: Food = {
  id: 'f-earths-own',
  name: "Earth's Own Oat Vanilla",
  per100g: { calories: 44, protein: 0.4, carbs: 7.6, fat: 1.2 },
  source: 'custom',
  servings: [{ label: '1 cup', grams: 250 }],
  saved: true,
  createdAt: '',
};

export const RECIPE_ADOBO: Recipe = {
  id: 'r-adobo',
  name: "Mom's chicken adobo",
  ingredients: [
    { id: 'i1', name: 'chicken thigh', grams: 1000, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, source: 'usda', estimateStatus: 'measured' },
    { id: 'i2', name: 'soy sauce', grams: 100, per100g: { calories: 53, protein: 8, carbs: 5, fat: 0 }, source: 'usda', estimateStatus: 'measured' },
  ],
  cookedWeightG: 900,
  servings: 4,
  ...stamp,
};

export const SCOOP: PortionCalibration = { id: 'c-scoop', name: 'scoop', foodName: 'rice', grams: 145, history: [], ...stamp };

/** Paths the first suites never touched: plant milks, the user's own data, ounces, alcohol, brands. */
export const MORE_CASES: MealCase[] = [
  {
    id: 'oat-milk-unsweetened',
    text: 'a cup of unsweetened oat milk',
    items: [{ match: ['oat'], grams: 240, kcalPer100g: 48 }],
    calories: 115,
    protein: 1.9,
    tolerance: 0.2,
    forbid: ['whole', 'cow', '2%', 'skim'],
    note: 'USDA "Oat milk, unsweetened, plain, refrigerated" (48 kcal/100 g). Must not be logged as dairy milk.',
  },
  {
    id: 'oat-milk-vanilla',
    text: 'a cup of vanilla oat milk',
    items: [{ match: ['oat'], grams: 240, kcalPer100g: 47 }],
    calories: 113,
    protein: 1.4,
    tolerance: 0.3,
    forbid: ['whole', 'cow', 'skim'],
    note: 'Not in USDA reference data; branded vanilla oat milks are 43-54 kcal/100 g.',
  },
  {
    id: 'oat-milk-latte',
    text: 'a 12 oz latte made with oat milk',
    items: [{ match: ['oat'], grams: 355, kcalPer100g: 48 }],
    calories: 170,
    protein: 3,
    tolerance: 0.45,
    note: 'A 12 oz oat-milk latte is about 170-190 kcal (most of the cup is oat milk; barista oat milks run richer than plain). Coffee may be logged as its own item.',
  },
  {
    id: 'saved-grocery',
    text: 'a cup of vanilla oat milk',
    context: { savedFoods: [SAVED_OAT_VANILLA] },
    items: [{ match: ['oat'], grams: 250, kcalPer100g: 44 }],
    calories: 110,
    protein: 1,
    tolerance: 0.15,
    expectSource: 'custom',
    note: "The user saved Earth's Own Oat Vanilla from its label; the app must use it, not a generic entry.",
  },
  {
    id: 'calibrated-scoop',
    text: '2 scoops of rice',
    context: { calibrations: [SCOOP] },
    items: [{ match: ['rice'], grams: 290, kcalPer100g: 130 }],
    calories: 377,
    protein: 7.8,
    tolerance: 0.1,
    note: 'The user calibrated a rice scoop at 145 g.',
  },
  {
    id: 'saved-recipe',
    text: "a serving of mom's adobo",
    context: { recipes: [RECIPE_ADOBO] },
    items: [{ match: ['adobo'], grams: 225, kcalPer100g: 189.2 }],
    calories: 426,
    protein: 79.5,
    tolerance: 0.1,
    expectSource: 'recipe',
    note: 'Recipe: 1,100 g of ingredients cooked down to 900 g, 4 servings of 225 g.',
  },
  {
    id: 'ounces',
    text: '6 oz grilled salmon',
    items: [{ match: ['salmon'], grams: 170, kcalPer100g: 206 }],
    calories: 350,
    protein: 37,
    tolerance: 0.2,
    note: '6 oz = 170 g; cooked Atlantic salmon 182-206 kcal/100 g depending on wild vs farmed.',
  },
  {
    id: 'beer',
    text: 'a 12 oz bottle of regular beer',
    items: [{ match: ['beer'], grams: 356, kcalPer100g: 43 }],
    calories: 153,
    protein: 1.6,
    tolerance: 0.2,
  },
  {
    id: 'red-wine',
    text: 'a 5 oz glass of red wine',
    items: [{ match: ['wine'], grams: 148, kcalPer100g: 85 }],
    calories: 125,
    protein: 0.1,
    tolerance: 0.2,
  },
  {
    id: 'cheddar-oz',
    text: '1 oz of cheddar cheese',
    items: [{ match: ['cheddar', 'cheese'], grams: 28, kcalPer100g: 403 }],
    calories: 114,
    protein: 7,
    tolerance: 0.15,
  },
  {
    id: 'big-mac',
    text: 'a Big Mac',
    items: [{ match: ['big mac', 'burger', 'hamburger'], grams: 219, kcalPer100g: 257 }],
    calories: 563,
    protein: 26,
    tolerance: 0.2,
    note: 'USDA "McDONALD\'S, BIG MAC" 257 kcal/100 g x 219 g.',
  },
  {
    id: 'water',
    text: 'a glass of water',
    items: [],
    calories: 0,
    protein: 0,
    tolerance: 0,
    note: 'Must log nothing with calories.',
  },
];
