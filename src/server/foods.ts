/** Merge + rank USDA and Open Food Facts results, with a 10-minute in-memory cache. Server-only. */

import { rankFoods, type NormalizedFood } from './normalize';
import { searchOpenFoodFacts } from './openfoodfacts';
import type { RemoteFoodCandidate } from './schemas';
import { searchUsda } from './usda';
import { ApiError } from './http';

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; value: RemoteFoodCandidate[] }>();

export async function searchRemoteFoods(rawQuery: string): Promise<RemoteFoodCandidate[]> {
  const query = rawQuery.trim();
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const [usda, off] = await Promise.allSettled([searchUsda(query), searchOpenFoodFacts(query)]);

  const merged: NormalizedFood[] = [];
  let anySucceeded = false;
  if (usda.status === 'fulfilled') {
    if (usda.value !== null) anySucceeded = true; // null = key missing, skipped silently
    merged.push(...(usda.value ?? []));
  } else {
    console.warn('[foods] USDA lookup failed:', usda.reason instanceof Error ? usda.reason.message : usda.reason);
  }
  if (off.status === 'fulfilled') {
    anySucceeded = true;
    merged.push(...off.value);
  } else {
    console.warn('[foods] Open Food Facts lookup failed:', off.reason instanceof Error ? off.reason.message : off.reason);
  }

  // Don't cache or mask a total outage as "no results".
  if (!anySucceeded) throw new ApiError(502, 'Food databases are unavailable right now. Please try again.');

  const ranked = rankFoods(query, merged, 20);
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value: ranked });
  return ranked;
}
