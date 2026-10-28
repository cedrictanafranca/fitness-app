/** USDA FoodData Central search. Server-only (API key from USDA_API_KEY). */

import { normalizeUsdaFood, type NormalizedFood, type UsdaFood } from './normalize';

const ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search';
export const FETCH_TIMEOUT_MS = 6000;

export function hasUsdaKey(): boolean {
  return Boolean(process.env.USDA_API_KEY);
}

export async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Returns null when the key is missing (skipped silently); throws on network/HTTP failure. */
export async function searchUsda(query: string): Promise<NormalizedFood[] | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({
    query,
    dataType: 'Foundation,SR Legacy,Branded',
    pageSize: '15',
  });
  // Key goes in a header so it never appears in a URL that could be logged.
  const res = await fetchWithTimeout(`${ENDPOINT}?${params.toString()}`, {
    headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`USDA responded ${res.status}`);
  const body = (await res.json()) as { foods?: UsdaFood[] };
  return (body.foods ?? []).map(normalizeUsdaFood).filter((f): f is NormalizedFood => f !== null);
}
