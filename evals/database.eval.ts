/**
 * Database matching across common foods, without Claude: each name (phrased the way the AI names
 * foods) goes through the app's real lookup (search terms, relevance, ranking, fallbacks) and the
 * picked entry's calories per 100 g are compared with the USDA SR Legacy reference.
 * Cheap and broad: it finds wrong-entry bugs ("glutinous rice", "buttermilk") in seconds.
 */

import { afterAll, beforeAll, describe, it, vi } from 'vitest';

import type { AnalyzedMeal } from '@/core/types';
import { resolveAnalyzedMeal } from '@/features/log/resolve';

import { health, searchRemote } from './lib/api';
import { fmtPct, pct, writeReport, type Row } from './lib/report';

const seenFoods = new Map<string, string>();

vi.mock('@/data/ids', () => ({ newId: () => Math.random().toString(36).slice(2), nowIso: () => new Date().toISOString() }));
vi.mock('@/services/foods', () => ({
  searchFoods: async (q: string) => {
    const remote = await searchRemote(q);
    for (const c of remote) seenFoods.set(c.sourceRef, `${c.name}${c.brand ? ` [${c.brand}]` : ''} (${c.source})`);
    return { local: [], remote };
  },
  cacheFood: async (c: { sourceRef: string }) => ({ ...c, id: c.sourceRef, saved: false, createdAt: '' }),
}));

interface DbCase {
  name: string;
  /** USDA SR Legacy kcal per 100 g for the common form. */
  kcal: number;
  /** Relative tolerance (default 15%); absolute kcal tolerance for near-zero foods. */
  tol?: number;
  absTol?: number;
}

const CASES: DbCase[] = [
  // Fruit and vegetables
  { name: 'banana, raw', kcal: 89 },
  { name: 'apple, raw', kcal: 52 },
  { name: 'orange, raw', kcal: 47 },
  { name: 'strawberries, raw', kcal: 32 },
  { name: 'blueberries, raw', kcal: 57 },
  // USDA Foundation green seedless 80, SR Legacy 69.
  { name: 'grapes, raw', kcal: 74, tol: 0.15 },
  { name: 'watermelon, raw', kcal: 30 },
  { name: 'mango, raw', kcal: 60 },
  // USDA Foundation 60, SR Legacy "all varieties" 50.
  { name: 'pineapple, raw', kcal: 55, tol: 0.15 },
  { name: 'avocado, raw', kcal: 160 },
  { name: 'broccoli, cooked', kcal: 35 },
  { name: 'carrots, raw', kcal: 41 },
  { name: 'spinach, raw', kcal: 23 },
  { name: 'tomato, raw', kcal: 18 },
  { name: 'cucumber, raw', kcal: 15, absTol: 5 },
  { name: 'eggplant, cooked', kcal: 35 },
  { name: 'potato, baked', kcal: 93 },
  { name: 'sweet potato, baked', kcal: 90 },
  { name: 'corn, sweet, cooked', kcal: 96 },
  { name: 'green beans, cooked', kcal: 35 },
  // Grains and legumes
  { name: 'white rice, cooked', kcal: 130 },
  { name: 'brown rice, cooked', kcal: 117, tol: 0.15 },
  { name: 'pasta, cooked', kcal: 158 },
  { name: 'oats, cooked with water', kcal: 71 },
  { name: 'white bread', kcal: 266 },
  { name: 'quinoa, cooked', kcal: 120 },
  { name: 'black beans, cooked', kcal: 132 },
  { name: 'lentils, cooked', kcal: 116 },
  { name: 'chickpeas, cooked', kcal: 164 },
  // Commercial hummus is 229-237 in USDA Foundation data (home-made 177).
  { name: 'hummus', kcal: 230, tol: 0.25 },
  // Protein
  { name: 'egg, hard-boiled', kcal: 155 },
  { name: 'egg, fried', kcal: 196 },
  { name: 'egg, scrambled', kcal: 149 },
  { name: 'chicken breast, grilled', kcal: 165 },
  { name: 'chicken thigh, roasted, with skin', kcal: 232 },
  { name: 'ground beef, 85% lean, cooked', kcal: 250 },
  { name: 'salmon, cooked', kcal: 195, tol: 0.15 },
  // Newer USDA Foundation data: light tuna 86-90, white 128; the older SR value was 116.
  { name: 'tuna, canned in water', kcal: 100, tol: 0.3 },
  { name: 'shrimp, cooked', kcal: 99, tol: 0.2 },
  { name: 'bacon, cooked', kcal: 541, tol: 0.15 },
  { name: 'turkey breast, roasted', kcal: 140, tol: 0.15 },
  // Dairy and plant milks
  { name: 'milk, whole', kcal: 61 },
  { name: 'milk, skim', kcal: 34 },
  { name: 'milk, 2%', kcal: 50 },
  { name: 'buttermilk', kcal: 40, tol: 0.25 },
  { name: 'oat milk, unsweetened', kcal: 48 },
  { name: 'oat milk', kcal: 48, tol: 0.25 },
  { name: 'oat milk, vanilla', kcal: 47, tol: 0.25 },
  { name: 'almond milk, unsweetened', kcal: 17, absTol: 6 },
  { name: 'soy milk, unsweetened', kcal: 33, tol: 0.3 },
  { name: 'greek yogurt, plain, nonfat', kcal: 59 },
  { name: 'cheddar cheese', kcal: 403 },
  { name: 'butter, salted', kcal: 717 },
  { name: 'ice cream, vanilla', kcal: 207 },
  // Fats, sweets, nuts
  { name: 'almonds', kcal: 579 },
  { name: 'peanut butter', kcal: 588 },
  { name: 'olive oil', kcal: 884 },
  { name: 'sugar, granulated', kcal: 387 },
  { name: 'honey', kcal: 304 },
  { name: 'dark chocolate, 70-85% cacao', kcal: 598 },
  // Drinks
  { name: 'orange juice', kcal: 45 },
  { name: 'cola, regular', kcal: 40 },
  { name: 'beer, regular', kcal: 43 },
  { name: 'wine, red', kcal: 85 },
  { name: 'coffee, brewed', kcal: 1, absTol: 5 },
  { name: 'tea, brewed', kcal: 1, absTol: 5 },
  // Prepared
  // Plain "french fries" is ambiguous (home oven fries ~150-195, fast food ~280-320), so name the place.
  { name: 'french fries, fast food', kcal: 300, tol: 0.15 },
  { name: 'pizza, cheese', kcal: 266, tol: 0.2 },
];

const rows: Row[] = [];
let ready = false;

beforeAll(async () => {
  ready = !!(await health());
  if (!ready) console.warn('Dev server not reachable: start it with `npx expo start` (or set EVAL_API_URL).');
});

afterAll(() => {
  if (!rows.length) return;
  const file = writeReport('database', 'Database matching evals', rows, [
    'Each name goes through the app\'s lookup (no AI call) at 100 g; reference is USDA SR Legacy kcal/100 g.',
    'Default tolerance ±15%.',
  ]);
  console.log(`\nReport: ${file}`);
});

describe('database matching', () => {
  for (const c of CASES) {
    it(c.name, async (ctx) => {
      if (!ready) ctx.skip();
      const analyzed: AnalyzedMeal = {
        items: [
          {
            name: c.name,
            estimatedGrams: null,
            statedGrams: 100,
            quantity: null,
            unitLabel: null,
            recipeMatch: null,
            savedFoodMatch: null,
            confidence: 0.9,
            estimatedPer100g: null,
            gramsRange: null,
            portionBasis: null,
          },
        ],
        mealType: null,
        clarification: null,
        notes: null,
      };
      const [item] = await resolveAnalyzedMeal(analyzed, { recipes: [], calibrations: [] });
      const got = item.per100g.calories;
      const err = pct(got, c.kcal);
      const ok = c.absTol != null ? Math.abs(got - c.kcal) <= c.absTol : Math.abs(err) <= (c.tol ?? 0.15);
      const entry = item.ref.kind === 'food' ? (seenFoods.get(item.ref.id) ?? item.source) : item.source === 'ai_estimate' ? 'no match' : item.source;
      rows.push({
        suite: 'Common foods',
        id: c.name,
        pass: ok,
        cells: { 'kcal/100 g': `${Math.round(got)} / ${c.kcal}`, Error: fmtPct(err), Entry: entry },
        failure: ok ? undefined : `picked ${entry} at ${Math.round(got)} kcal/100 g (reference ${c.kcal})`,
      });
    });
  }
});
