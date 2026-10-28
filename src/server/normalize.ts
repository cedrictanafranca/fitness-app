/**
 * Pure normalizers + ranking for food-database responses (USDA FoodData Central, Open Food Facts).
 * No I/O here so they are unit-testable (see src/core/foods/normalize.test.ts).
 */

import type { RemoteFoodCandidate } from './schemas';

export interface NormalizedFood {
  candidate: RemoteFoodCandidate;
  /** 0 = curated reference data (Foundation / SR Legacy), 1 = branded / crowd-sourced. */
  tier: 0 | 1;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** "CHICKEN BREAST, GRILLED" -> "Chicken Breast, Grilled"; mixed-case names pass through. */
export function tidyName(name: string): string {
  const n = name.trim().replace(/\s+/g, ' ');
  if (n && n === n.toUpperCase() && /[A-Z]/.test(n)) {
    return n.toLowerCase().replace(/(^|[\s(,/-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());
  }
  return n;
}

// ---------- USDA ----------

interface UsdaNutrient {
  nutrientId?: number;
  nutrientNumber?: string | number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: { id?: number; name?: string; unitName?: string };
}

export interface UsdaFood {
  fdcId?: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
  foodPortions?: {
    gramWeight?: number;
    amount?: number;
    portionDescription?: string;
    modifier?: string;
    measureUnit?: { name?: string };
  }[];
}

function nutrientValue(n: UsdaNutrient): number | null {
  return num(n.value) ?? num(n.amount);
}

function nutrientId(n: UsdaNutrient): number | null {
  return num(n.nutrientId) ?? num(n.nutrient?.id) ?? num(n.nutrientNumber);
}

/** Find a nutrient by FDC id, falling back to a name + unit match (search vs. detail formats differ). */
function findNutrient(
  nutrients: UsdaNutrient[],
  ids: number[],
  nameMatch: RegExp,
  unit: RegExp,
): number | null {
  for (const id of ids) {
    const hit = nutrients.find((n) => nutrientId(n) === id);
    const v = hit ? nutrientValue(hit) : null;
    if (v !== null) return v;
  }
  const byName = nutrients.find((n) => {
    const name = n.nutrientName ?? n.nutrient?.name ?? '';
    const u = n.unitName ?? n.nutrient?.unitName ?? '';
    return nameMatch.test(name) && unit.test(u);
  });
  return byName ? nutrientValue(byName) : null;
}

function usdaServings(food: UsdaFood): { label: string; grams: number }[] {
  const out: { label: string; grams: number }[] = [];
  for (const p of food.foodPortions ?? []) {
    const grams = num(p.gramWeight);
    if (grams === null || grams <= 0) continue;
    const desc = str(p.portionDescription) ?? [num(p.amount) ?? 1, str(p.measureUnit?.name), str(p.modifier)]
      .filter((x) => x !== undefined && x !== 'undetermined')
      .join(' ');
    if (!desc) continue;
    out.push({ label: desc, grams: round1(grams) });
  }
  const size = num(food.servingSize);
  const unit = (food.servingSizeUnit ?? '').toLowerCase();
  if (size !== null && size > 0 && (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt')) {
    out.push({ label: str(food.householdServingFullText) ?? `1 serving (${round1(size)} ${unit === 'g' || unit === 'grm' ? 'g' : 'ml'})`, grams: round1(size) });
  }
  return out;
}

/** Normalize one USDA search result; null when it has no usable calorie value or id. */
export function normalizeUsdaFood(food: UsdaFood): NormalizedFood | null {
  const nutrients = food.foodNutrients ?? [];
  const name = str(food.description);
  const fdcId = num(food.fdcId);
  if (!name || fdcId === null) return null;

  // 1008 = Energy (kcal); Foundation foods may only carry Atwater energy 2047 / 2048.
  const calories = findNutrient(nutrients, [1008, 2047, 2048], /^energy/i, /^kcal$/i);
  if (calories === null) return null;
  const protein = findNutrient(nutrients, [1003], /^protein/i, /^g$/i) ?? 0;
  const carbs = findNutrient(nutrients, [1005], /^carbohydrate, by difference/i, /^g$/i) ?? 0;
  const fat = findNutrient(nutrients, [1004], /^total lipid/i, /^g$/i) ?? 0;

  const dataType = food.dataType ?? '';
  const tier: 0 | 1 = dataType === 'Foundation' || dataType === 'SR Legacy' ? 0 : 1;
  const brand = str(food.brandName) ?? str(food.brandOwner);

  return {
    tier,
    candidate: {
      name: tidyName(name),
      ...(brand ? { brand: tidyName(brand) } : {}),
      per100g: { calories: round1(calories), protein: round1(protein), carbs: round1(carbs), fat: round1(fat) },
      source: 'usda',
      sourceRef: `usda:${fdcId}`,
      servings: usdaServings(food),
    },
  };
}

// ---------- Open Food Facts ----------

export interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, unknown>;
}

/** Normalize one Open Food Facts product; null when it has no name, code or calorie value. */
export function normalizeOffProduct(p: OffProduct): NormalizedFood | null {
  const name = str(p.product_name);
  const code = str(p.code);
  if (!name || !code) return null;
  const n = p.nutriments ?? {};

  // Crowd-sourced data: kcal is sometimes mis-entered (e.g. 1900), and nothing exceeds ~900 kcal/100 g.
  // Prefer kcal when plausible, else derive from kJ, else drop the product.
  const plausible = (v: number | null): v is number => v !== null && v >= 0 && v <= 900;
  const kcal = num(n['energy-kcal_100g']);
  const kj = num(n['energy_100g']);
  const fromKj = kj !== null ? kj / 4.184 : null;
  const calories = plausible(kcal) ? kcal : plausible(fromKj) ? fromKj : null;
  if (calories === null) return null;

  const servings: { label: string; grams: number }[] = [];
  const sq = num(p.serving_quantity);
  if (sq !== null && sq > 0) {
    const sizeText = str(p.serving_size);
    servings.push({ label: sizeText ? `1 serving (${sizeText})` : '1 serving', grams: round1(sq) });
  }

  // OFF "brands" is a comma-separated list; the first is the primary brand.
  const brand = str(p.brands)?.split(',')[0]?.trim();

  return {
    tier: 1,
    candidate: {
      name: tidyName(name),
      ...(brand ? { brand } : {}),
      per100g: {
        calories: round1(calories),
        protein: round1(num(n['proteins_100g']) ?? 0),
        carbs: round1(num(n['carbohydrates_100g']) ?? 0),
        fat: round1(num(n['fat_100g']) ?? 0),
      },
      source: 'openfoodfacts',
      sourceRef: `off:${code}`,
      servings,
    },
  };
}

// ---------- Ranking ----------

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** 0..1 similarity of a food name to the query. Rewards exact / prefix matches and token coverage. */
export function nameSimilarity(query: string, name: string): number {
  const q = query.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!q || !n) return 0;
  if (n === q) return 1;
  const qt = tokens(q);
  const nt = tokens(n);
  if (!qt.length || !nt.length) return 0;
  const covered = qt.filter((t) => nt.some((x) => x === t || x.startsWith(t))).length / qt.length;
  // Extra (unmatched) words in the food name dilute the score slightly: "Rice" beats "Rice pudding with raisins".
  const precision = qt.length / Math.max(nt.length, qt.length);
  if (covered === 0) return 0;
  const prefixBonus = n.startsWith(q) ? 0.15 : 0;
  return Math.min(0.99, covered * 0.7 + precision * 0.15 + prefixBonus);
}

/** Dedupe, rank (reference data first, then similarity) and cap. */
export function rankFoods(query: string, foods: NormalizedFood[], cap = 20): RemoteFoodCandidate[] {
  const seen = new Set<string>();
  const unique = foods.filter((f) => {
    if (seen.has(f.candidate.sourceRef)) return false;
    seen.add(f.candidate.sourceRef);
    return true;
  });
  return unique
    .map((f) => ({ f, score: nameSimilarity(query, f.candidate.name) }))
    .sort(
      (a, b) =>
        a.f.tier - b.f.tier ||
        b.score - a.score ||
        a.f.candidate.name.length - b.f.candidate.name.length,
    )
    .slice(0, cap)
    .map((x) => x.f.candidate);
}
