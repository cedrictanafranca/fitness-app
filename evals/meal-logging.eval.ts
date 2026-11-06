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
import { resolveAnalyzedMeal } from '@/features/log/resolve';

import { TEXT_CASES, VOICE_CASES, type MealCase } from './cases/meals';
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

async function runCase(suite: string, c: MealCase, image?: { base64: string; mimeType: 'image/jpeg' | 'image/png' }) {
  let analyzed: AnalyzedMeal;
  try {
    analyzed = await analyzeMeal({
      text: c.text || undefined,
      imageBase64: image?.base64,
      imageMimeType: image?.mimeType,
      statedTotalGrams: c.statedTotalGrams,
    });
  } catch (err) {
    rows.push({ suite, id: c.id, pass: false, cells: { Input: c.text || '(photo)' }, failure: String(err) });
    return;
  }
  const items = await resolveAnalyzedMeal(analyzed, {
    recipes: [],
    calibrations: [],
    statedTotalGrams: c.statedTotalGrams,
    recentItems: [],
  });

  const total = items.reduce((s, i) => ({ cal: s.cal + i.totals.calories, pro: s.pro + i.totals.protein }), { cal: 0, pro: 0 });
  const used = new Set<number>();
  let portionCal = 0;
  let dbCal = 0;
  const missing: string[] = [];
  const perItem: string[] = [];
  const dbPicks: string[] = [];

  for (const ref of c.items) {
    const idx = items.findIndex((it, i) => !used.has(i) && ref.match.some((k) => it.name.toLowerCase().includes(k)));
    if (idx < 0) {
      missing.push(ref.match[0]);
      continue;
    }
    used.add(idx);
    const it = items[idx];
    const g = gramsOf(it);
    portionCal += (g * ref.kcalPer100g) / 100;
    dbCal += (ref.grams * it.per100g.calories) / 100;
    perItem.push(`${ref.match[0]} ${Math.round(g)}/${ref.grams} g`);
    const hit = it.ref.kind === 'food' ? (seenFoods.get(it.ref.id) ?? it.source) : it.source === 'ai_estimate' ? 'no match (AI estimate or none)' : it.source;
    dbPicks.push(`${hit}: ${Math.round(it.per100g.calories)}/${ref.kcalPer100g}`);
  }
  const extras = items.filter((_, i) => !used.has(i)).map((i) => `${i.name} (${Math.round(i.totals.calories)} kcal)`);
  const refCal = c.calories;
  const totalErr = pct(total.cal, refCal);
  const portionErr = pct(portionCal, c.items.filter((r) => !missing.includes(r.match[0])).reduce((s, r) => s + (r.grams * r.kcalPer100g) / 100, 0));
  const dbErr = pct(dbCal, c.items.filter((r) => !missing.includes(r.match[0])).reduce((s, r) => s + (r.grams * r.kcalPer100g) / 100, 0));

  const forbidden = c.id === 'voice-self-correction' && items.some((i) => /whole/.test(i.name.toLowerCase()));
  const failures: string[] = [];
  if (missing.length) failures.push(`missed ${missing.join(', ')}`);
  if (Math.abs(totalErr) > c.tolerance) failures.push(`calories ${Math.round(total.cal)} vs ${refCal} (${fmtPct(totalErr)}, allowed ±${Math.round(c.tolerance * 100)}%)`);
  if (forbidden) failures.push('logged whole milk after the user corrected it to skim');
  if (items.some((i) => i.grams == null)) failures.push('an item has no weight, so the user must type it');

  rows.push({
    suite,
    id: c.id,
    pass: failures.length === 0,
    cells: {
      Calories: `${Math.round(total.cal)} / ${refCal}`,
      Total: fmtPct(totalErr),
      Portion: fmtPct(portionErr),
      Database: fmtPct(dbErr),
      Protein: `${Math.round(total.pro)} / ${Math.round(c.protein)} g`,
      Grams: perItem.join('; '),
      'Database entry (kcal/100 g: got/ref)': dbPicks.join('; '),
      Extra: extras.join('; '),
    },
    detail: { analyzed, items: items.map((i) => ({ name: i.name, grams: gramsOf(i), per100g: i.per100g, source: i.source, totals: i.totals })) },
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
