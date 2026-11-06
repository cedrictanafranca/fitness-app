/**
 * Meal-logging accuracy: text, voice-style transcripts and photos, run through the same code
 * path as the app (Claude analysis → resolveAnalyzedMeal → engine totals).
 *
 * Each case reports three separate errors so a miss can be traced to its cause:
 * - portion: Claude's grams vs the reference grams (priced at reference nutrition),
 * - database: the nutrition entry the app picked vs reference nutrition (at reference grams),
 * - total: what the app would actually log.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AnalyzedMeal, MealItem } from '@/core/types';
import { LOW_CONFIDENCE } from '@/core/nutrition/portions';
import { resolveAnalyzedMeal } from '@/features/log/resolve';

import { MORE_CASES, TEXT_CASES, VOICE_CASES, type MealCase } from './cases/meals';
import { PHOTO_CASES } from './cases/photos';
import { analyzeMeal, health, searchRemote } from './lib/api';
import { fmtPct, pct, writeReport, type Row } from './lib/report';

/** Database entries seen, by sourceRef, so the report can name the entry the app picked. */
const seenFoods = new Map<string, string>();

vi.mock('@/data/ids', () => ({ newId: () => Math.random().toString(36).slice(2), nowIso: () => new Date().toISOString() }));
vi.mock('@/services/foods', () => ({
  // No saved foods in the eval: every lookup goes to the remote database, as on a fresh install.
  searchFoods: async (q: string) => {
    const remote = await searchRemote(q);
    for (const c of remote) seenFoods.set(c.sourceRef, `${c.name} (${c.source})`);
    return { local: [], remote };
  },
  // The cached food's id is its sourceRef, so the item's ref points back at the entry.
  cacheFood: async (c: { sourceRef: string }) => ({ ...c, id: c.sourceRef, saved: false, createdAt: '' }),
}));

const rows: Row[] = [];
let ready = false;

beforeAll(async () => {
  const h = await health();
  ready = !!h?.anthropic;
  if (!h) console.warn('Dev server not reachable: start it with `npx expo start` (or set EVAL_API_URL).');
  else if (!h.anthropic) console.warn('ANTHROPIC_API_KEY is not set on the server; meal evals skipped.');
});

afterAll(() => {
  if (!rows.length) return;
  const file = writeReport('meal-logging', 'Meal logging evals', rows, [
    'Reference nutrition: USDA FoodData Central values for the described portion.',
    'Portion error prices Claude\'s grams at reference nutrition; database error prices reference grams at the entry the app picked.',
  ]);
  console.log(`\nReport: ${file}`);
});

/** Built items always carry their resolved weight in `grams` (quantity × unit is folded in). */
function gramsOf(item: MealItem): number {
  return item.grams ?? 0;
}

/** Runs per case (EVAL_REPEATS=3 npm run eval); answers vary run to run, so repeats expose flaky cases. */
const REPEATS = Math.max(1, Number(process.env.EVAL_REPEATS ?? 1) || 1);

interface RunResult {
  failures: string[];
  cells: Record<string, string>;
  detail: unknown;
}

async function runOnce(c: MealCase, image?: { base64: string; mimeType: 'image/jpeg' | 'image/png' }): Promise<RunResult> {
  const ctx = c.context ?? {};
  let analyzed: AnalyzedMeal;
  try {
    analyzed = await analyzeMeal({
      text: c.text || undefined,
      imageBase64: image?.base64,
      imageMimeType: image?.mimeType,
      statedTotalGrams: c.statedTotalGrams,
      recipeNames: (ctx.recipes ?? []).map((r) => r.name),
      savedFoodNames: (ctx.savedFoods ?? []).map((x) => x.name),
      calibrations: (ctx.calibrations ?? []).map((x) => ({ name: x.name, foodName: x.foodName, grams: x.grams })),
    });
  } catch (err) {
    return { failures: [String(err)], cells: { Input: c.text || '(photo)' }, detail: null };
  }
  const items = await resolveAnalyzedMeal(analyzed, {
    recipes: ctx.recipes ?? [],
    calibrations: ctx.calibrations ?? [],
    savedFoods: ctx.savedFoods ?? [],
    statedTotalGrams: c.statedTotalGrams,
    recentItems: [],
  });

  const total = items.reduce((acc, i) => ({ cal: acc.cal + i.totals.calories, pro: acc.pro + i.totals.protein }), { cal: 0, pro: 0 });
  const used = new Set<number>();
  let portionCal = 0;
  let dbCal = 0;
  const missing: string[] = [];
  const perItem: string[] = [];
  const dbPicks: string[] = [];
  const failures: string[] = [];

  c.items.forEach((ref, refIndex) => {
    const idx = items.findIndex((it, i) => !used.has(i) && ref.match.some((k) => it.name.toLowerCase().includes(k)));
    if (idx < 0) {
      missing.push(ref.match[0]);
      return;
    }
    used.add(idx);
    const it = items[idx];
    const g = gramsOf(it);
    portionCal += (g * ref.kcalPer100g) / 100;
    dbCal += (ref.grams * it.per100g.calories) / 100;
    perItem.push(`${ref.match[0]} ${Math.round(g)}/${ref.grams} g`);
    const hit = it.ref.kind === 'food' ? (seenFoods.get(it.ref.id) ?? it.name + ' (' + it.source + ')') : it.source === 'ai_estimate' ? 'no match (AI estimate or none)' : it.source;
    dbPicks.push(`${hit}: ${Math.round(it.per100g.calories)}/${ref.kcalPer100g}`);
    if (refIndex === 0 && c.expectSource && it.source !== c.expectSource) failures.push(`used ${it.source} nutrition, expected ${c.expectSource}`);
  });
  const extras = items.filter((_, i) => !used.has(i)).map((i) => `${i.name} (${Math.round(i.totals.calories)} kcal)`);
  const refMatched = c.items.filter((r) => !missing.includes(r.match[0])).reduce((acc, r) => acc + (r.grams * r.kcalPer100g) / 100, 0);
  const totalErr = pct(total.cal, c.calories);
  const forbidden = (c.forbid ?? []).filter((w) => items.some((i) => i.name.toLowerCase().includes(w)));

  // A food the AI got wrong but marked as unsure is shown to the user to check (review screen),
  // so it is reported, not failed. Its calories still count toward the total check.
  const flagged = items.filter((it, i) => !used.has(i) && it.confidence != null && it.confidence < LOW_CONFIDENCE);
  if (missing.length && flagged.length >= missing.length) {
    perItem.push(`missed ${missing.join(', ')}, flagged for the user: ${flagged.map((f) => f.name).join(', ')}`);
  } else if (missing.length) {
    failures.push(`missed ${missing.join(', ')}`);
  }
  const calOk = c.calories === 0 ? total.cal <= 5 : Math.abs(totalErr) <= c.tolerance;
  if (!calOk) failures.push(`calories ${Math.round(total.cal)} vs ${c.calories} (${fmtPct(totalErr)}, allowed ±${Math.round(c.tolerance * 100)}%)`);
  if (forbidden.length) failures.push(`logged "${forbidden.join('", "')}", which the user did not have`);
  if (items.some((i) => i.grams == null)) failures.push('an item has no weight, so the user must type it');
  if (items.some((i) => i.grams != null && i.grams > 0 && i.totals.calories === 0 && i.per100g.protein === 0 && !/water|tea|coffee/i.test(i.name)))
    failures.push('an item was logged with no nutrition (0 kcal)');

  return {
    failures,
    cells: {
      Calories: `${Math.round(total.cal)} / ${c.calories}`,
      Total: fmtPct(totalErr),
      Portion: fmtPct(pct(portionCal, refMatched)),
      Database: fmtPct(pct(dbCal, refMatched)),
      Protein: `${Math.round(total.pro)} / ${Math.round(c.protein)} g`,
      Grams: perItem.join('; '),
      'Database entry (kcal/100 g: got/ref)': dbPicks.join('; '),
      Extra: extras.join('; '),
    },
    detail: { analyzed, items: items.map((i) => ({ name: i.name, grams: gramsOf(i), per100g: i.per100g, source: i.source, totals: i.totals })) },
  };
}

async function runCase(suite: string, c: MealCase, image?: { base64: string; mimeType: 'image/jpeg' | 'image/png' }) {
  const runs: RunResult[] = [];
  for (let i = 0; i < REPEATS; i++) runs.push(await runOnce(c, image));
  const passed = runs.filter((r) => r.failures.length === 0).length;
  const shown = runs.find((r) => r.failures.length) ?? runs[runs.length - 1];
  const failures = [...new Set(runs.flatMap((r) => r.failures))];
  rows.push({
    suite,
    id: c.id,
    pass: passed === runs.length,
    cells: { ...(REPEATS > 1 ? { Runs: `${passed}/${runs.length}${passed > 0 && passed < runs.length ? ' (flaky)' : ''}` } : {}), ...shown.cells },
    detail: runs.map((r) => r.detail),
    failure: failures.join('; ') || undefined,
  });
}

describe('text logging', () => {
  for (const c of TEXT_CASES) {
    it(c.id, async (ctx) => {
      if (!ready) ctx.skip();
      await runCase('Text descriptions', c);
      expect(rows.length).toBeGreaterThan(0);
    });
  }
});

describe('voice-style transcripts', () => {
  for (const c of VOICE_CASES) {
    it(c.id, async (ctx) => {
      if (!ready) ctx.skip();
      await runCase('Voice-style transcripts', c);
    });
  }
});

describe('more paths', () => {
  for (const c of MORE_CASES) {
    it(c.id, async (ctx) => {
      if (!ready) ctx.skip();
      await runCase('Plant milks, own data, units, brands', c);
    });
  }
});

describe('photos', () => {
  const dir = join(__dirname, 'photos');
  const available = existsSync(dir) ? new Set(readdirSync(dir)) : new Set<string>();
  for (const c of PHOTO_CASES) {
    it(c.id, async (ctx) => {
      if (!ready || !available.has(c.file)) ctx.skip();
      const bytes = readFileSync(join(dir, c.file));
      const mimeType = c.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
      await runCase('Photos', { ...c, text: c.text ?? '' }, { base64: bytes.toString('base64'), mimeType });
    });
  }
});
