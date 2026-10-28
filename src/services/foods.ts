/**
 * Food database lookup. Searches local saved foods first, then the remote route
 * (/api/foods/search → USDA FoodData Central + Open Food Facts).
 * CONTRACT — screens depend on these signatures.
 */

import type { Food } from '@/core/types';
import { foodsRepo } from '@/data/repos';
import { foodSearchResponseSchema } from '@/server/schemas';
import { apiFetchJson } from './api-base';

/** A remote match that has not been saved locally yet (no id until `cacheFood`). */
export type FoodCandidate = Omit<Food, 'id' | 'createdAt' | 'saved'> & { sourceRef: string };

export interface FoodSearchResult {
  local: Food[];
  remote: FoodCandidate[];
  /**
   * Set when the remote lookup failed (offline, server down). `local` is still valid, so the
   * search never throws just because the network is unavailable. Optional; safe to ignore.
   */
  remoteError?: string;
}

export async function searchFoods(query: string): Promise<FoodSearchResult> {
  const q = query.trim();
  const local = await foodsRepo.search(q);
  if (q.length < 2) return { local, remote: [] };

  try {
    const raw = await apiFetchJson(`/api/foods/search?q=${encodeURIComponent(q)}`);
    const parsed = foodSearchResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error('The server returned unexpected food results.');
    const localRefs = new Set(local.map((f) => f.sourceRef).filter((r): r is string => Boolean(r)));
    const remote = parsed.data.candidates.filter((c) => !localRefs.has(c.sourceRef));
    // Foods cached earlier but not matched by the local name search (e.g. renamed) are filtered too.
    const known = await Promise.all(remote.map((c) => foodsRepo.bySourceRef(c.sourceRef)));
    return { local, remote: remote.filter((_, i) => !known[i]) };
  } catch (err) {
    return { local, remote: [], remoteError: err instanceof Error ? err.message : 'Food search failed.' };
  }
}

/**
 * Persist a remote candidate locally (idempotent on sourceRef) and return the stored Food,
 * so MealItems can reference a stable id.
 */
export async function cacheFood(candidate: FoodCandidate, saved = false): Promise<Food> {
  const existing = await foodsRepo.bySourceRef(candidate.sourceRef);
  if (existing) {
    if (saved && !existing.saved) return foodsRepo.upsert({ ...existing, saved: true });
    return existing;
  }
  return foodsRepo.create({ ...candidate, saved });
}
