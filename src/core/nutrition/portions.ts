/**
 * Portion estimation helpers (PRD §3.2 quantity priority, §5 personal portions, Phase 4).
 * Pure functions: the AI proposes visual estimates and ranges, the user's own history
 * supplies personal priors, and a weighed plate can be split into a clearly-labeled
 * approximate breakdown. Nothing here talks to the model or the database.
 */

import type { Meal, MealItem, PortionRange } from '../types';

const MAX_GRAMS = 20000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface PortionAdjustment {
  label: string;
  factor: number;
}

/** Quick multipliers offered on an estimated item ("looked more like 1½ of that"). */
export const PORTION_ADJUSTMENTS: readonly PortionAdjustment[] = [
  { label: '½', factor: 0.5 },
  { label: '¾', factor: 0.75 },
  { label: '1¼', factor: 1.25 },
  { label: '1½', factor: 1.5 },
  { label: '2×', factor: 2 },
];

export function scaleGrams(grams: number, factor: number): number {
  if (!Number.isFinite(grams) || grams < 0) throw new RangeError(`grams must be non-negative, got ${grams}`);
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError(`factor must be positive, got ${factor}`);
  return round1(grams * factor);
}

/**
 * Sanitize a model-provided range around a likely weight. Returns null when the range is
 * unusable; otherwise low ≤ likely ≤ high, both positive and bounded.
 */
export function sanitizeRange(range: PortionRange | null | undefined, likely: number | null): PortionRange | null {
  if (!range) return null;
  let { low, high } = range;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  if (low > high) [low, high] = [high, low];
  if (likely != null && Number.isFinite(likely)) {
    low = Math.min(low, likely);
    high = Math.max(high, likely);
  }
  if (high <= 0 || high > MAX_GRAMS) return null;
  low = Math.max(0, low);
  if (low === high) return null;
  return { low: round1(low), high: round1(high) };
}

/**
 * Fallback range when the model gave none: ±25 % at full confidence widening to ±60 % at
 * zero confidence. Visual estimates are rarely better than that.
 */
export function rangeForEstimate(grams: number, confidence = 0.5): PortionRange {
  if (!Number.isFinite(grams) || grams <= 0) throw new RangeError(`grams must be positive, got ${grams}`);
  const c = Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0;
  const spread = 0.6 - 0.35 * c;
  return { low: round1(grams * (1 - spread)), high: round1(grams * (1 + spread)) };
}

/**
 * Split a weighed plate across its components in proportion to the estimates. Items with
 * no estimate share the average of the known ones (equal split when nothing is known).
 * The parts always add up to `totalGrams` exactly (rounding residual goes to the largest).
 */
export function distributePlateWeight(estimates: (number | null | undefined)[], totalGrams: number): number[] {
  if (!Number.isFinite(totalGrams) || totalGrams <= 0) {
    throw new RangeError(`totalGrams must be positive, got ${totalGrams}`);
  }
  if (estimates.length === 0) return [];
  const known = estimates.filter((e): e is number => e != null && Number.isFinite(e) && e > 0);
  const fill = known.length ? known.reduce((s, e) => s + e, 0) / known.length : 1;
  const weights = estimates.map((e) => (e != null && Number.isFinite(e) && e > 0 ? e : fill));
  const sum = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => round1((w / sum) * totalGrams));
  const residual = round1(totalGrams - parts.reduce((s, p) => s + p, 0));
  if (residual !== 0) {
    const i = parts.indexOf(Math.max(...parts));
    parts[i] = round1(parts[i] + residual);
  }
  return parts;
}

// ---------- Personal portion history ----------

/** "white rice, cooked" → "white rice cooked"; strips punctuation and extra spaces. */
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name: string): string[] {
  return normalizeFoodName(name)
    .split(' ')
    .filter((t) => t.length > 2 && !GENERIC.has(t));
}

const GENERIC = new Set(['cooked', 'raw', 'grilled', 'fried', 'boiled', 'with', 'and', 'the', 'plain', 'fresh', 'large', 'small', 'medium']);

/** True when two food names refer to the same food closely enough to share a portion prior. */
export function sameFood(a: string, b: string): boolean {
  const na = normalizeFoodName(a);
  const nb = normalizeFoodName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

export interface TypicalPortion {
  name: string;
  grams: number;
  /** Number of measured entries the value is based on. */
  samples: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The user's usual weight for a food: median of grams from previously logged entries that
 * were measured (never from earlier estimates, which would compound guesses). Newest
 * `maxSamples` entries count.
 */
export function typicalGramsFor(history: Pick<MealItem, 'name' | 'grams' | 'estimateStatus'>[], foodName: string, maxSamples = 10): TypicalPortion | null {
  const grams = history
    .filter((h) => h.estimateStatus === 'measured' && h.grams != null && h.grams > 0 && sameFood(h.name, foodName))
    .slice(0, maxSamples)
    .map((h) => h.grams as number);
  if (grams.length === 0) return null;
  return { name: foodName, grams: round1(median(grams)), samples: grams.length };
}

/**
 * Typical portions for every distinct food in recent meals (newest first), for the model
 * prompt and the review screen. Capped so the prompt stays small.
 */
export function typicalPortions(meals: Pick<Meal, 'items' | 'timestamp'>[], limit = 40): TypicalPortion[] {
  const items = [...meals]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
    .flatMap((m) => m.items);
  const out: TypicalPortion[] = [];
  for (const item of items) {
    if (item.estimateStatus !== 'measured' || item.grams == null || !(item.grams > 0)) continue;
    if (out.some((t) => sameFood(t.name, item.name))) continue;
    const t = typicalGramsFor(items, item.name);
    if (t) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export type PortionBasisKind = 'ai' | 'history';

export interface ChosenPortion {
  grams: number;
  range: PortionRange;
  basis: PortionBasisKind;
  label: string;
}

/**
 * Pick the weight for an item that has no measured quantity. The user's own measured
 * history beats a weak visual estimate (confidence < 0.6) or no estimate at all; a
 * confident visual estimate wins because it saw this plate. Returns null when neither exists.
 */
export function choosePortion(input: {
  aiGrams: number | null;
  aiConfidence: number;
  aiRange: PortionRange | null;
  aiBasis: string | null;
  typical: TypicalPortion | null;
}): ChosenPortion | null {
  const { aiGrams, aiConfidence, aiRange, aiBasis, typical } = input;
  const ai = aiGrams != null && aiGrams > 0 ? aiGrams : null;
  const useHistory = typical != null && (ai == null || aiConfidence < 0.6);
  if (useHistory) {
    const half = Math.max(typical.grams * 0.2, ai != null ? Math.abs(ai - typical.grams) : 0);
    return {
      grams: typical.grams,
      range: { low: round1(Math.max(0, typical.grams - half)), high: round1(typical.grams + half) },
      basis: 'history',
      label: `your usual portion (${typical.samples} ${typical.samples === 1 ? 'entry' : 'entries'})`,
    };
  }
  if (ai == null) return null;
  return {
    grams: ai,
    range: sanitizeRange(aiRange, ai) ?? rangeForEstimate(ai, aiConfidence),
    basis: 'ai',
    label: aiBasis?.trim() || 'visual estimate',
  };
}
