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

async function searchUsdaTypes(apiKey: string, query: string, dataType: string, pageSize: number): Promise<NormalizedFood[]> {
  const params = new URLSearchParams({ query, dataType, pageSize: String(pageSize) });
  // Key goes in a header so it never appears in a URL that could be logged.
  const res = await fetchWithTimeout(`${ENDPOINT}?${params.toString()}`, {
    headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`USDA responded ${res.status}`);
  const body = (await res.json()) as { foods?: UsdaFood[] };
  return (body.foods ?? []).map(normalizeUsdaFood).filter((f): f is NormalizedFood => f !== null);
}

/**
 * Reference foods (Foundation, SR Legacy) and branded products are fetched separately: in one
 * combined search, branded products fill every slot for common foods ("almonds", "whole milk"),
 * so the reference entry the app should prefer never came back. USDA also ranks its own
 * reference entries loosely ("Milk, whole, 3.25% milkfat" is 28th for "whole milk"), so 50 are
 * fetched and the app ranks them itself.
 *
 * Returns null when the key is missing (skipped silently); throws only when both lookups fail.
 */
export async function searchUsda(query: string): Promise<NormalizedFood[] | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return null;
  const [reference, branded] = await Promise.allSettled([
    searchUsdaTypes(apiKey, query, 'Foundation,SR Legacy', 50),
    searchUsdaTypes(apiKey, query, 'Branded', 10),
  ]);
  if (reference.status === 'rejected' && branded.status === 'rejected') throw reference.reason;
  return [
    ...(reference.status === 'fulfilled' ? reference.value : []),
    ...(branded.status === 'fulfilled' ? branded.value : []),
  ];
}
