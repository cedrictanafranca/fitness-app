/** Open Food Facts search (no API key). Server-only. */

import { normalizeOffProduct, type NormalizedFood, type OffProduct } from './normalize';
import { fetchWithTimeout } from './usda';

const ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

export async function searchOpenFoodFacts(query: string): Promise<NormalizedFood[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    fields: 'code,product_name,brands,nutriments,serving_quantity,serving_size',
  });
  const url = `${ENDPOINT}?${params.toString()}`;
  const init = {
    // OFF asks API consumers to identify themselves.
    headers: { accept: 'application/json', 'user-agent': 'fitness-app/1.0 (personal nutrition tracker)' },
  };
  let res = await fetchWithTimeout(url, init);
  // OFF intermittently answers 503 under load; one quick retry is usually enough.
  if (res.status >= 500) res = await fetchWithTimeout(url, init);
  if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`);
  const body = (await res.json()) as { products?: OffProduct[] };
  return (body.products ?? []).map(normalizeOffProduct).filter((f): f is NormalizedFood => f !== null);
}
