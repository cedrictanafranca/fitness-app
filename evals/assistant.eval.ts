/**
 * Assistant evals: each request must become the right action on the right meal or item (or no
 * action for questions), and answers must quote the app's own numbers.
 */

import { afterAll, beforeAll, describe, it } from 'vitest';

import { buildSnapshot } from '@/core/assistant/snapshot';
import type { Macros, Meal, MealItem, PortionCalibration, Recipe, UserProfile } from '@/core/types';

import { chat, health } from './lib/api';
import { writeReport, type Row } from './lib/report';

// ---------- A small, realistic log (same shape as the unit-test fixtures) ----------

const chicken: Macros = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };
const rice: Macros = { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
const shake: Macros = { calories: 120, protein: 24, carbs: 3, fat: 1.5 };
const oats: Macros = { calories: 71, protein: 2.5, carbs: 12, fat: 1.5 };
const salmon: Macros = { calories: 206, protein: 22, carbs: 0, fat: 12 };

let seq = 0;
const id = () => `id-${++seq}`;

function item(mealId: string, name: string, per100g: Macros, grams: number): MealItem {
  const f = grams / 100;
  return {
    id: id(),
    mealId,
    name,
    ref: { kind: 'none' },
    grams,
    per100g,
    totals: {
      calories: Math.round(per100g.calories * f),
      protein: Math.round(per100g.protein * f * 10) / 10,
      carbs: Math.round(per100g.carbs * f * 10) / 10,
      fat: Math.round(per100g.fat * f * 10) / 10,
    },
    source: 'usda',
    estimateStatus: 'measured',
  };
}

function meal(date: string, mealType: Meal['mealType'], build: (m: string) => MealItem[], name?: string): Meal {
  const mealId = id();
  return { id: mealId, date, timestamp: `${date}T12:00:00.000Z`, mealType, name, items: build(mealId), createdAt: '', updatedAt: '' };
}

const profile: UserProfile = {
  id: 'me',
  heightCm: 175,
  weightKg: 70,
  goal: 'recomposition',
  calorieTarget: 2500,
  proteinTarget: 145,
  units: 'metric',
  activityCreditEnabled: true,
  activityCreditPercent: 50,
  updatedAt: '',
};

// Tuesday 2026-10-27, 13:00 local.
const now = new Date(2026, 9, 27, 13, 0, 0);
const yesterdayLunch = meal('2026-10-26', 'lunch', (m) => [item(m, 'chicken adobo', chicken, 200), item(m, 'white rice, cooked', rice, 150)], 'Adobo lunch');
// A 200 g shake leaves ~24 g of protein to go, so "how much protein do I need" has a real answer.
const todayBreakfast = meal('2026-10-27', 'breakfast', (m) => [item(m, 'oatmeal', oats, 250), item(m, 'protein shake', shake, 200)]);
const todayDinner = meal('2026-10-27', 'dinner', (m) => [item(m, 'chicken breast, grilled', chicken, 200), item(m, 'white rice, cooked', rice, 180)]);
const lastTuesdayDinner = meal('2026-10-20', 'dinner', (m) => [item(m, 'salmon', salmon, 150)]);
const meals = [yesterdayLunch, todayBreakfast, todayDinner, lastTuesdayDinner];

const adobo: Recipe = {
  id: 'r-adobo',
  name: "Mom's chicken adobo",
  ingredients: [
    { id: 'i1', name: 'chicken thigh', grams: 1000, per100g: chicken, source: 'usda', estimateStatus: 'measured' },
    { id: 'i2', name: 'soy sauce', grams: 100, per100g: { calories: 53, protein: 8, carbs: 5, fat: 0 }, source: 'usda', estimateStatus: 'measured' },
  ],
  cookedWeightG: 900,
  servings: 4,
  createdAt: '',
  updatedAt: '',
};
const scoop: PortionCalibration = { id: 'c1', name: 'scoop', foodName: 'rice', grams: 145, history: [], createdAt: '', updatedAt: '' };

const snapshot = buildSnapshot({ now, meals, profile, recipes: [adobo], calibrations: [scoop], activityByDate: {} });
const today = snapshot.days[0];
const riceAtDinner = todayDinner.items[1];
const shakeItem = todayBreakfast.items[1];
const adoboServing = snapshot.recipes[0].perServing!;

// ---------- Cases ----------

type Reply = Awaited<ReturnType<typeof chat>>;
interface AssistantCase {
  id: string;
  message: string;
  expect: string;
  check: (r: Reply) => string | null;
}

const num = (text: string) => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
const mentions = (text: string, value: number, slack: number) => num(text).some((n) => Math.abs(n - value) <= slack);

const CASES: AssistantCase[] = [
  {
    id: 'protein-left',
    message: 'How much protein do I still need today?',
    expect: `No action; quotes ${Math.round(today.remainingProtein)} g`,
    check: (r) =>
      r.proposal ? `proposed ${r.proposal.action.type}` : mentions(r.reply, today.remainingProtein, 2) ? null : `reply does not state ${Math.round(today.remainingProtein)} g`,
  },
  {
    id: 'calories-left',
    message: 'How many calories do I have left?',
    expect: `No action; quotes ${Math.round(today.remainingCalories)} kcal`,
    check: (r) =>
      r.proposal ? `proposed ${r.proposal.action.type}` : mentions(r.reply, today.remainingCalories, 5) ? null : `reply does not state ${Math.round(today.remainingCalories)}`,
  },
  {
    id: 'last-tuesday',
    message: 'What did I eat last Tuesday?',
    expect: 'No action; mentions salmon',
    check: (r) => (r.proposal ? `proposed ${r.proposal.action.type}` : /salmon/i.test(r.reply) ? null : 'reply does not mention salmon'),
  },
  {
    id: 'recipe-serving',
    message: "How many calories are in a serving of Mom's chicken adobo?",
    expect: `No action; quotes ${Math.round(adoboServing.calories)} kcal`,
    check: (r) =>
      r.proposal ? `proposed ${r.proposal.action.type}` : mentions(r.reply, adoboServing.calories, 3) ? null : `reply does not state ${Math.round(adoboServing.calories)}`,
  },
  {
    id: 'log-eggs',
    message: 'Log 2 hard boiled eggs as a snack',
    expect: 'log_meal, snack, eggs × 2 or ~100 g',
    check: (r) => {
      const a = r.proposal?.action;
      if (a?.type !== 'log_meal') return `expected log_meal, got ${a?.type ?? 'no action'}`;
      if (a.mealType !== 'snack') return `meal type ${a.mealType}`;
      const egg = a.items.find((i) => /egg/i.test(i.name));
      if (!egg) return 'no egg item';
      const ok = egg.quantity === 2 || (egg.grams != null && egg.grams >= 80 && egg.grams <= 120);
      return ok ? null : `egg amount quantity=${egg.quantity} grams=${egg.grams}`;
    },
  },
  {
    id: 'repeat-lunch',
    message: 'Log the same lunch as yesterday',
    expect: 'repeat_meal of yesterday\'s lunch',
    check: (r) => {
      const a = r.proposal?.action;
      if (a?.type !== 'repeat_meal') return `expected repeat_meal, got ${a?.type ?? 'no action'}`;
      return a.sourceMealId === yesterdayLunch.id ? null : `wrong source meal ${a.sourceMealId}`;
    },
  },
  {
    id: 'update-grams',
    message: 'Change the rice at dinner to 250 g',
    expect: 'update_item_grams on dinner rice → 250',
    check: (r) => {
      const a = r.proposal?.action;
      if (a?.type !== 'update_item_grams') return `expected update_item_grams, got ${a?.type ?? 'no action'}`;
      if (a.itemId !== riceAtDinner.id) return `wrong item ${a.itemId}`;
      return a.grams === 250 ? null : `grams ${a.grams}`;
    },
  },
  {
    id: 'delete-item',
    message: 'Remove the protein shake I had this morning',
    expect: 'delete_item on the breakfast shake',
    check: (r) => {
      const a = r.proposal?.action;
      if (a?.type !== 'delete_item') return `expected delete_item, got ${a?.type ?? 'no action'}`;
      return a.itemId === shakeItem.id ? null : `wrong item ${a.itemId}`;
    },
  },
  {
    id: 'delete-meal',
    message: "Delete today's dinner",
    expect: 'delete_meal on dinner, needs confirmation',
    check: (r) => {
      const a = r.proposal?.action;
      if (a?.type !== 'delete_meal') return `expected delete_meal, got ${a?.type ?? 'no action'}`;
      if (a.mealId !== todayDinner.id) return `wrong meal ${a.mealId}`;
      return r.proposal?.needsConfirmation ? null : 'did not ask for confirmation';
    },
  },
  {
    id: 'ambiguous-rice',
    message: 'Change the rice to 200 g',
    expect: 'Asks which rice (two today/yesterday) or offers candidates',
    check: (r) => {
      const a = r.proposal?.action;
      if (!a) return /which|lunch|dinner/i.test(r.reply) ? null : 'no action and no clarifying question';
      if (a.type !== 'update_item_grams') return `unexpected ${a.type}`;
      // Today has only one rice (dinner), so picking it directly is also acceptable.
      return a.itemId === riceAtDinner.id || (r.proposal?.candidates.length ?? 0) > 1 ? null : `picked ${a.itemId}`;
    },
  },
  {
    id: 'no-invented-log',
    message: 'Is white rice or brown rice better for building muscle?',
    expect: 'No action (general question)',
    check: (r) => (r.proposal ? `proposed ${r.proposal.action.type}` : null),
  },
];

// ---------- Runner ----------

const rows: Row[] = [];
let ready = false;

beforeAll(async () => {
  const h = await health();
  ready = !!h?.anthropic;
  if (!ready) console.warn('Assistant evals need the dev server running with ANTHROPIC_API_KEY.');
});

afterAll(() => {
  if (!rows.length) return;
  const file = writeReport('assistant', 'Assistant evals', rows, [
    `Snapshot: ${meals.length} meals over 8 days; today has ${today.mealCount} meals, ${Math.round(today.consumed.calories)} kcal eaten.`,
  ]);
  console.log(`\nReport: ${file}`);
});

describe('assistant', () => {
  for (const c of CASES) {
    it(c.id, async (ctx) => {
      if (!ready) ctx.skip();
      let r: Reply;
      try {
        r = await chat({ messages: [{ role: 'user', content: c.message }], snapshot });
      } catch (err) {
        rows.push({ suite: 'Assistant', id: c.id, pass: false, cells: { Request: c.message, Expected: c.expect }, failure: String(err) });
        return;
      }
      const problem = r.mode !== 'claude' ? 'answered by the offline mock, not Claude' : c.check(r);
      rows.push({
        suite: 'Assistant',
        id: c.id,
        pass: !problem,
        cells: {
          Request: c.message,
          Expected: c.expect,
          Action: r.proposal ? r.proposal.action.type : 'none',
          Reply: r.reply.replace(/\s+/g, ' ').slice(0, 140),
        },
        detail: r,
        failure: problem ?? undefined,
      });
    });
  }
});
