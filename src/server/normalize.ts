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

/**
 * Phrases about the cut, turned into single marker words so "thigh, meat and skin" and "thigh with
 * skin" match each other, "meat only" matches "skinless", and a bare "skin" (the skin on its own)
 * stays visible as a part.
 */
const WITH_SKIN = /\b(meat and skin|with skin|in skin|skin on|skin-on)\b/g;
const NO_SKIN = /\b(meat only|without skin|skinless)\b/g;
/** "cooked, dry heat" is a cooking method, not a dry product. */
const HEAT_METHOD = /\b(dry|moist) heat\b/g;

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(WITH_SKIN, ' withskin ')
    .replace(NO_SKIN, ' noskin ')
    .replace(HEAT_METHOD, ' heatcooked ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Name words outside parentheses: USDA puts explanations there ("(Includes foods for …)"). */
function mainTokens(s: string): string[] {
  return tokens(s.replace(/\([^)]*\)/g, ' '));
}

/** "apples" → "apple", "tomatoes" → "tomato", "oats" → "oat"; leaves "glass" alone. */
function singular(t: string): string {
  if (t.length > 4 && t.endsWith('oes')) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  return t;
}

/** Words USDA and people use interchangeably for the same food. */
const SYNONYMS: Record<string, string[]> = {
  skim: ['nonfat'],
  nonfat: ['skim'],
  oatmeal: ['oats', 'oat'],
  porridge: ['oats', 'oat'],
  powder: ['dry', 'powdered'],
  powdered: ['dry', 'powder'],
  soy: ['soymilk', 'soya'],
  soya: ['soy', 'soymilk'],
  fries: ['fried'],
};

/** Plain cooking methods with similar calories: "grilled" salmon matches "cooked, dry heat". Fried is not one. */
const PLAIN_COOKING = new Set(['cooked', 'grilled', 'roasted', 'broiled', 'baked', 'steamed', 'boiled', 'heatcooked', 'poached']);

/** Same word: equal, plural / singular, a short suffix ("tomato" → "tomatoes"), or a synonym. */
function sameWord(queryToken: string, nameToken: string): boolean {
  return (
    nameToken === queryToken ||
    singular(nameToken) === singular(queryToken) ||
    (nameToken.startsWith(queryToken) && nameToken.length - queryToken.length <= 2) ||
    (SYNONYMS[queryToken]?.includes(nameToken) ?? false)
  );
}

/**
 * A longer word built on the query word: "buttermilk" for "milk", "eggplant" for "egg",
 * "pineapple" for "apple". Usually a different food; also what a half-typed word looks like
 * ("chick" → "chicken"), so it still counts toward coverage, at a cost.
 */
function compoundOf(queryToken: string, nameToken: string): boolean {
  return queryToken.length >= 3 && !sameWord(queryToken, nameToken) && nameToken.includes(queryToken);
}

function tokenMatches(queryToken: string, nameToken: string): boolean {
  return sameWord(queryToken, nameToken) || compoundOf(queryToken, nameToken);
}

/**
 * Words that describe the default, commonly eaten form of a food (or are filler), so their
 * presence in a database name does not make it a different food than the user asked for.
 * Cooking methods that change calories a lot (fried, breaded) are deliberately absent.
 */
const GENERIC = new Set([
  'raw', 'cooked', 'boiled', 'boiling', 'steamed', 'grilled', 'roasted', 'baked', 'broiled', 'microwaved', 'microwaving',
  'prepared', 'ready', 'to', 'eat', 'serve', 'drink', 'regular', 'enriched', 'unenriched', 'plain', 'fresh', 'all',
  'commercial', 'varieties', 'variety', 'with', 'without', 'and', 'or', 'of', 'in', 'from', 'the', 'a', 'salt', 'added',
  'meat', 'only', 'flesh', 'peeled', 'drained', 'solids', 'includes', 'nfs', 'ns', 'long', 'grain', 'medium',
  'quick', 'instant', 'carbonated', 'ripe', 'whole', 'unsalted', 'boneless', 'skinless', 'broiler', 'fryers',
  // Label words on reference entries ("Milk, whole, 3.25% milkfat, with added vitamin D").
  'fluid', 'vitamin', 'vitamins', 'fortified', 'milkfat', 'withskin', 'noskin', 'cured', 'year', 'round', 'average',
  // Colours of the common form ("Grapes, red or green", "Tomatoes, red, ripe").
  'red', 'green',
  'heatcooked', 'generic', 'bottled', 'tap',
]);

/**
 * Broad leading words USDA puts before the food ("Pork, cured, bacon", "Potatoes, french fried"):
 * when the name starts with one, the food word may come right after it.
 */
const FOOD_GROUPS = new Set(['pork', 'beef', 'lamb', 'veal', 'chicken', 'turkey', 'potatoes', 'potato']);

/** Phrases marking the default form of a food ("all varieties", "year round average"). */
const DEFAULT_FORM = /\b(all varieties|all commercial varieties|year round average|nfs|ns as to)\b/;

/** A different product that only borrows the food's name, unless the user asked for it. */
const IMITATION_WORDS = new Set(['meatless', 'imitation', 'substitute', 'vegetarian', 'vegan']);

/** Restaurant, fast-food and snack entries: a different recipe than the plain food. */
function isOutOfHome(nameLower: string): boolean {
  return /^(fast foods|snacks)\b/.test(nameLower) || /\brestaurant/.test(nameLower) || /^[a-z.'&\s-]*'s,/.test(nameLower);
}

/** USDA category prefixes ("Beverages, …", "Nuts, almonds") that name a group, not the food. */
const CATEGORY = new Set([
  'beverages', 'beverage', 'cereals', 'cereal', 'snacks', 'spices', 'soup', 'soups', 'candies', 'babyfood', 'alcoholic',
  'fast', 'foods', 'restaurant', 'nuts', 'seeds', 'crustaceans', 'mollusks', 'fish', 'shellfish',
]);

const COOKED_WORDS = new Set(['cooked', 'boiled', 'steamed', 'grilled', 'roasted', 'baked', 'broiled', 'fried', 'scrambled', 'poached', 'microwaved']);

/** Dry, powdered or concentrated forms: priced per 100 g of powder, not of the drink or dish. */
const DRY_WORDS = new Set(['dry', 'powder', 'powdered', 'mix', 'dehydrated', 'concentrate', 'unprepared', 'granules', 'flour', 'evaporated', 'condensed', 'dried']);
const PREPARED_WORDS = new Set(['prepared', 'ready', 'cooked', 'reconstituted', 'brewed']);

function isGeneric(t: string): boolean {
  // Single letters are label fragments ("vitamin D", "A").
  return t.length === 1 || GENERIC.has(t) || GENERIC.has(singular(t));
}

/** Name words that are not the user's words but are built on one ("buttermilk" for "milk"). */
function compoundExtras(queryTokens: string[], nameTokens: string[]): string[] {
  return nameTokens.filter(
    (x) => !isGeneric(x) && !queryTokens.some((t) => sameWord(t, x)) && queryTokens.some((t) => compoundOf(t, x)),
  );
}

/** "Instant" without "prepared" is the dry product ("tea, instant, lemon" = the powder). */
function isDryForm(nameTokens: string[]): boolean {
  if (nameTokens.some((t) => DRY_WORDS.has(t))) return true;
  return nameTokens.includes('instant') && !nameTokens.some((t) => PREPARED_WORDS.has(t));
}

/** Entries that are one part of the food on its own ("Chicken, skin …", "Grape leaves"). */
const PART_WORDS = new Set(['skin', 'leaves', 'leaf', 'peel', 'stems', 'hulls', 'germ']);
function isPartOnly(nameTokens: string[]): boolean {
  return nameTokens.some((t) => PART_WORDS.has(t));
}

/**
 * True when the name's main food word is one the user said. After a broad leading word ("Pork,
 * cured, bacon") the food word may be one of the next two words.
 */
function headMatches(queryTokens: string[], nameTokens: string[]): boolean {
  const heads = nameTokens.filter((t) => !CATEGORY.has(t) && !isGeneric(t) && !/^\d+$/.test(t));
  if (!heads.length) return false;
  const candidates = FOOD_GROUPS.has(heads[0]) ? heads.slice(0, 3) : heads.slice(0, 1);
  return candidates.some((h) => queryTokens.some((q) => sameWord(q, h)));
}

/** Share of the query's non-generic words found in the name (all words when every word is generic). */
function coreCoverage(queryTokens: string[], nameTokens: string[]): number {
  const core = queryTokens.filter((t) => !isGeneric(t));
  const qs = core.length ? core : queryTokens;
  if (!qs.length) return 0;
  return qs.filter((q) => nameTokens.some((n) => tokenMatches(q, n))).length / qs.length;
}

/**
 * True when a database entry is the food the user named: its main word appears in the query and
 * it covers at least half of the query's distinguishing words. "Rose-apples" is not "apple";
 * "Cereals, WHEATENA" is not "oatmeal"; "Beets, raw" is not "banana, raw".
 */
/**
 * The leading food name must be one the user said in full: "Water convolvulus" is not "water",
 * "Sweet potato" is not "potato", "Almond butter" is not "almonds". Checks the first two
 * defining words of the first segment that names a food, skipping category and group prefixes.
 */
function leadNameCovered(queryTokens: string[], name: string): boolean {
  const segments = name.replace(/\([^)]*\)/g, ' ').split(',');
  for (const seg of segments) {
    const defining = tokens(seg).filter((t) => !CATEGORY.has(t) && !isGeneric(t) && !/^\d+$/.test(t));
    if (!defining.length) continue;
    const covered = (t: string) => queryTokens.some((q) => sameWord(q, t));
    // "Pork, cured, bacon": a group word the user did not say is a prefix; the food comes later.
    if (defining.length === 1 && FOOD_GROUPS.has(defining[0]) && !covered(defining[0])) continue;
    return defining.slice(0, 2).every(covered);
  }
  return false;
}

export function isRelevantMatch(query: string, name: string): boolean {
  const qt = tokens(query);
  const nt = tokens(name);
  if (!headMatches(qt, nt) || !leadNameCovered(qt, name)) return false;
  if ((isDryForm(nt) && !isDryForm(qt)) || (isPartOnly(nt) && !isPartOnly(qt))) return false;
  if (nt.some((t) => IMITATION_WORDS.has(t)) && !qt.some((t) => IMITATION_WORDS.has(t))) return false;
  if (compoundExtras(qt, nt).length) return false;
  // Short names need every key word: "oat milk" is not "Milk, whole", "skim milk" is not
  // "Milk, sheep". Longer AI names may carry a detail the database lacks ("glazed"), so allow
  // one missing word in three.
  const core = qt.filter((t) => !isGeneric(t)).length;
  return coreCoverage(qt, nt) >= (core <= 3 ? 1 : 2 / 3);
}

/**
 * 0..1 similarity of a food name to the query. Rewards covering the query's words and penalises
 * words the user did not ask for that change the food ("glutinous", "Florida", "pita"), plus a
 * raw/cooked mismatch, so "white rice, cooked" picks regular long-grain rice, not glutinous rice.
 */
export function nameSimilarity(query: string, name: string): number {
  const q = query.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!q || !n) return 0;
  if (n === q) return 1;
  const qt = tokens(q);
  const nt = tokens(n);
  if (!qt.length || !nt.length) return 0;
  // An exact cooking method counts fully; a different plain method ("boiled" for "baked") half.
  const credit = (t: string) =>
    nt.some((x) => tokenMatches(t, x)) ? 1 : PLAIN_COOKING.has(t) && nt.some((x) => PLAIN_COOKING.has(x)) ? 0.5 : 0;
  const covered = qt.reduce((acc, t) => acc + credit(t), 0) / qt.length;
  if (covered === 0) return 0;

  // Parenthetical explanations and a leading food group ("Pork, cured, bacon") are not variants.
  const extras = mainTokens(n).filter(
    (x, i) => !isGeneric(x) && !CATEGORY.has(x) && !/^\d+$/.test(x) && !(i === 0 && FOOD_GROUPS.has(x)) && !qt.some((t) => tokenMatches(t, x)),
  );
  // A missing requested word ("skim") costs more than extra label words ("calcium fortified"):
  // coverage weighs 1.0 below, each unrequested word only 0.05 (capped).
  const variantPenalty = Math.min(0.25, extras.length * 0.05);
  const queryCooked = qt.some((t) => COOKED_WORDS.has(t));
  const queryRaw = qt.includes('raw');
  const nameRaw = nt.includes('raw');
  const nameCooked = nt.some((t) => COOKED_WORDS.has(t));
  const statePenalty = (queryCooked && nameRaw && !nameCooked) || (queryRaw && nameCooked && !nameRaw) ? 0.15 : 0;
  // Unasked-for powder or a lone part of the food is a different calorie density entirely.
  const formPenalty = (isDryForm(nt) && !isDryForm(qt) ? 0.3 : 0) + (isPartOnly(nt) && !isPartOnly(qt) ? 0.3 : 0);
  // "Buttermilk" for "milk", "eggplant" for "egg": a different food built on the same word.
  const compoundPenalty = compoundExtras(qt, nt).length ? 0.25 : 0;
  const imitationPenalty = nt.some((t) => IMITATION_WORDS.has(t)) && !qt.some((t) => IMITATION_WORDS.has(t)) ? 0.3 : 0;
  // A plain "scrambled egg" is not the fast-food one; "coffee" is not the restaurant espresso.
  const outOfHomePenalty = isOutOfHome(n) && !isOutOfHome(q) && !qt.some((t) => ['restaurant', 'fast', 'snack', 'snacks'].includes(t)) ? 0.1 : 0;
  const defaultBonus = DEFAULT_FORM.test(n) ? 0.05 : 0;
  const prefixBonus = n.startsWith(q) ? 0.1 : 0;
  return Math.max(
    0.01,
    Math.min(
      0.99,
      (covered * 1.0 + 0.2 + prefixBonus + defaultBonus - variantPenalty - statePenalty - formPenalty - compoundPenalty - imitationPenalty - outOfHomePenalty) / 1.3,
    ),
  );
}

/**
 * Dedupe, rank and cap. Entries that are the food the user named come first; among those,
 * curated reference data (USDA Foundation / SR Legacy) beats branded or crowd-sourced data, then
 * the closest name wins. An unrelated reference entry no longer outranks a real match.
 */
export function rankFoods(query: string, foods: NormalizedFood[], cap = 20): RemoteFoodCandidate[] {
  const seen = new Set<string>();
  const unique = foods.filter((f) => {
    if (seen.has(f.candidate.sourceRef)) return false;
    seen.add(f.candidate.sourceRef);
    return true;
  });
  const sorted = unique
    .map((f) => ({
      f,
      relevant: isRelevantMatch(query, f.candidate.name) ? 0 : 1,
      score: nameSimilarity(query, f.candidate.name),
    }))
    .sort(
      (a, b) =>
        a.relevant - b.relevant ||
        a.f.tier - b.f.tier ||
        b.score - a.score ||
        a.f.candidate.name.length - b.f.candidate.name.length,
    );
  return withConsensusFirst(sorted).slice(0, cap).map((x) => x.f.candidate);
}

/**
 * Among matches that score almost the same as the best one (same relevance and data tier), put
 * the one closest to their median calories first. Several equally plausible entries ("salmon":
 * Atlantic, sockeye, chum) then resolve to a typical value instead of whichever variety happened
 * to have the shortest name.
 */
function withConsensusFirst<T extends { f: NormalizedFood; relevant: number; score: number }>(sorted: T[]): T[] {
  const best = sorted[0];
  if (!best || best.relevant !== 0) return sorted;
  const near = sorted.filter((x) => x.relevant === 0 && x.f.tier === best.f.tier && x.score >= best.score - 0.05);
  if (near.length < 3) return sorted;
  const kcals = near.map((x) => x.f.candidate.per100g.calories).sort((a, b) => a - b);
  const median = kcals[Math.floor(kcals.length / 2)];
  const pick = near.reduce((a, b) => (Math.abs(b.f.candidate.per100g.calories - median) < Math.abs(a.f.candidate.per100g.calories - median) ? b : a));
  return [pick, ...sorted.filter((x) => x !== pick)];
}
