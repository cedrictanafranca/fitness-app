/**
 * Client wrapper for the AI API routes in src/app/api/ai/**.
 * CONTRACT — screens depend on these signatures. The AI-service agent implements the bodies.
 */

import type { AnalyzedMeal, PortionCalibration } from '@/core/types';

export interface AnalyzeMealRequest {
  /** JPEG/PNG as base64 (no data: prefix). Optional. */
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png';
  /** Typed description or voice transcript. Optional. */
  text?: string;
  /** Total weight the user measured for the whole plate/meal, in grams. */
  statedTotalGrams?: number;
  /** Names of saved recipes so the model can propose a recipeMatch. */
  recipeNames: string[];
  /** Household units the user has calibrated, so "2 scoops" can be mapped. */
  calibrations: Pick<PortionCalibration, 'name' | 'foodName' | 'grams'>[];
  /** Local hour 0–23, to help infer mealType. */
  localHour: number;
}

export async function analyzeMeal(_req: AnalyzeMealRequest): Promise<AnalyzedMeal> {
  throw new Error('analyzeMeal not implemented yet');
}

export interface ExtractRecipeRequest {
  /** Free text or transcript describing the dish and ingredients. */
  text: string;
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png';
}

export interface ExtractedIngredient {
  name: string;
  grams: number | null;
  /** Non-gram quantity the user said, e.g. "2 cloves" — grams is the model's conversion. */
  quantityText: string | null;
  confidence: number;
}

export interface ExtractedRecipe {
  name: string;
  ingredients: ExtractedIngredient[];
  cookedWeightG: number | null;
  servings: number | null;
  /** Question to ask when a quantity that materially affects calories/protein is missing. */
  clarification: string | null;
}

export async function extractRecipe(_req: ExtractRecipeRequest): Promise<ExtractedRecipe> {
  throw new Error('extractRecipe not implemented yet');
}
