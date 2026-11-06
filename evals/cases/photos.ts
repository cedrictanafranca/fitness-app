/**
 * Photo eval cases. Images live in evals/photos/ (sources and licenses in evals/README.md).
 * A photo has no stated portion, so references come from counting what is visible and pricing
 * standard portions; tolerances are wider than for typed quantities.
 */

import type { MealCase } from './meals';

export interface PhotoCase extends Omit<MealCase, 'text'> {
  file: string;
  /** Optional caption sent with the photo, as when the user also types something. */
  text?: string;
}

export const PHOTO_CASES: PhotoCase[] = [
  {
    id: 'photo-banana',
    file: 'banana.jpg',
    items: [{ match: ['banana'], grams: 118, kcalPer100g: 89 }],
    calories: 105,
    protein: 1.3,
    tolerance: 0.3,
    note: 'One medium banana on a white background.',
  },
  {
    id: 'photo-apple',
    file: 'apple.jpg',
    items: [{ match: ['apple'], grams: 182, kcalPer100g: 52 }],
    calories: 95,
    protein: 0.5,
    tolerance: 0.3,
    note: 'One medium red apple.',
  },
  {
    id: 'photo-fried-eggs',
    file: 'eggs.jpg',
    items: [{ match: ['egg'], grams: 92, kcalPer100g: 196 }],
    calories: 180,
    protein: 12.5,
    tolerance: 0.3,
    note: 'Two sunny-side-up eggs on a plate (USDA fried egg, 46 g each).',
  },
  {
    id: 'photo-rice-bowl',
    file: 'rice.jpg',
    items: [{ match: ['rice'], grams: 200, kcalPer100g: 130 }],
    calories: 260,
    protein: 5.4,
    tolerance: 0.4,
    note: 'A full rice bowl, about 200 g cooked; the bowl size is ambiguous.',
  },
  {
    id: 'photo-plated-meal',
    file: 'porkchop.jpg',
    items: [
      { match: ['rice'], grams: 250, kcalPer100g: 130 },
      { match: ['egg'], grams: 92, kcalPer100g: 196 },
      { match: ['pork', 'chop', 'meat'], grams: 120, kcalPer100g: 231 },
      { match: ['bok choy', 'choy', 'green', 'vegetable', 'cabbage'], grams: 80, kcalPer100g: 13 },
      { match: ['tea'], grams: 200, kcalPer100g: 40 },
    ],
    calories: 875,
    protein: 54,
    tolerance: 0.4,
    note: 'HK-style pork chop over rice with two fried eggs and greens, and a cup of sweetened tea on the table (the water glass should not be logged). The source names the meat as pork.',
  },
];
