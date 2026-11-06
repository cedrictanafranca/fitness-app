/** Calls the running dev server's API routes, exactly as the app does. */

import type { AnalyzedMeal } from '@/core/types';
import { analyzedMealSchema, assistantReplySchema, foodSearchResponseSchema } from '@/server/schemas';

/** Origin of the dev server (`npx expo start`). Override with EVAL_API_URL. */
export const API = process.env.EVAL_API_URL ?? 'http://localhost:8081';

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new Error(`${path}: ${message}`);
  }
  return data;
}

export async function health(): Promise<{ anthropic: boolean; usda: boolean } | null> {
  try {
    const res = await fetch(`${API}/api/health`);
    return (await res.json()) as { anthropic: boolean; usda: boolean };
  } catch {
    return null;
  }
}

export async function analyzeMeal(input: {
  text?: string;
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png';
  statedTotalGrams?: number;
  localHour?: number;
}): Promise<AnalyzedMeal> {
  const raw = await postJson('/api/ai/analyze-meal', {
    ...input,
    recipeNames: [],
    calibrations: [],
    localHour: input.localHour ?? 12,
    recentPortions: [],
  });
  return analyzedMealSchema.parse(raw) as AnalyzedMeal;
}

export async function searchRemote(query: string) {
  const res = await fetch(`${API}/api/foods/search?q=${encodeURIComponent(query)}`);
  const raw = (await res.json()) as unknown;
  return foodSearchResponseSchema.parse(raw).candidates;
}

export async function chat(body: unknown) {
  return assistantReplySchema.parse(await postJson('/api/ai/chat', body));
}
