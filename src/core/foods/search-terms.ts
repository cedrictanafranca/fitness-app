/**
 * Search terms to try for a food name, most specific first: the AI's name, then without
 * parentheses, then its first two parts. "milk, skim (nonfat), fluid" finds nothing in USDA;
 * "milk, skim" finds skim milk.
 */
export function searchTermsFor(name: string): string[] {
  const noParens = name.replace(/\([^)]*\)/g, ' ').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
  const parts = noParens.split(',').map((s) => s.trim()).filter(Boolean);
  const terms = [name.trim(), noParens, parts.slice(0, 2).join(', ')];
  return [...new Set(terms)].filter((t) => t.length >= 2);
}
