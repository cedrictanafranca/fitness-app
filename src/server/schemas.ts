/**
 * zod schemas for every API request/response. Pure (no native or server-only imports),
 * so both the API routes and the client services (src/services/*) import from here.
 *
 * Model-facing schemas (analyzedMealSchema, extractedRecipeSchema) deliberately avoid
 * min/max constraints, which structured outputs do not accept; ranges are enforced by
 * sanitizers in the routes instead.
 */

import { z } from 'zod';

const MAX_IMAGE_BASE64_CHARS = 14_000_000; // ~10 MB of image data

const imageMimeTypeSchema = z.enum(['image/jpeg', 'image/png']);

// ---------- Shared ----------

export const macrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export const apiErrorSchema = z.object({ error: z.string() });

// ---------- POST /api/ai/analyze-meal ----------

export const analyzeMealRequestSchema = z.object({
  imageBase64: z.string().max(MAX_IMAGE_BASE64_CHARS).optional(),
  imageMimeType: imageMimeTypeSchema.optional(),
  text: z.string().max(4000).optional(),
  statedTotalGrams: z.number().positive().max(20000).optional(),
  recipeNames: z.array(z.string().max(200)).max(200).default([]),
  calibrations: z
    .array(
      z.object({
        name: z.string().max(100),
        foodName: z.string().max(200).optional(),
        grams: z.number().positive().max(5000),
      }),
    )
    .max(200)
    .default([]),
  localHour: z.number().int().min(0).max(23),
});

export const analyzedMealItemSchema = z.object({
  name: z.string(),
  estimatedGrams: z.number().nullable(),
  statedGrams: z.number().nullable(),
  quantity: z.number().nullable(),
  unitLabel: z.string().nullable(),
  recipeMatch: z.string().nullable(),
  confidence: z.number(),
  estimatedPer100g: macrosSchema.nullable(),
});

export const analyzedMealSchema = z.object({
  items: z.array(analyzedMealItemSchema),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable(),
  clarification: z.string().nullable(),
  notes: z.string().nullable(),
});

// ---------- POST /api/ai/extract-recipe ----------

export const extractRecipeRequestSchema = z
  .object({
    text: z.string().max(6000),
    imageBase64: z.string().max(MAX_IMAGE_BASE64_CHARS).optional(),
    imageMimeType: imageMimeTypeSchema.optional(),
  })
  .refine((v) => v.text.trim().length > 0 || Boolean(v.imageBase64), {
    message: 'Provide text or an image.',
    path: ['text'],
  });

export const extractedIngredientSchema = z.object({
  name: z.string(),
  grams: z.number().nullable(),
  quantityText: z.string().nullable(),
  confidence: z.number(),
});

export const extractedRecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(extractedIngredientSchema),
  cookedWeightG: z.number().nullable(),
  servings: z.number().nullable(),
  clarification: z.string().nullable(),
});

// ---------- GET /api/foods/search ----------

export const servingSizeSchema = z.object({ label: z.string(), grams: z.number() });

export const foodCandidateSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  per100g: macrosSchema,
  source: z.enum(['usda', 'openfoodfacts']),
  sourceRef: z.string(),
  servings: z.array(servingSizeSchema),
});

export const foodSearchResponseSchema = z.object({
  candidates: z.array(foodCandidateSchema),
});

// ---------- GET /api/health ----------

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  anthropic: z.boolean(),
  usda: z.boolean(),
});

export type RemoteFoodCandidate = z.infer<typeof foodCandidateSchema>;
