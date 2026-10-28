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

// ---------- POST /api/ai/chat (conversational assistant) ----------

const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const snapshotItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  grams: z.number().nullable(),
  quantity: z.number().nullable(),
  unitLabel: z.string().nullable(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  estimated: z.boolean(),
  source: z.enum(['usda', 'openfoodfacts', 'recipe', 'custom', 'ai_estimate']),
});

const snapshotMealSchema = z.object({
  id: z.string(),
  date: dateKeySchema,
  weekday: z.string(),
  mealType: mealTypeSchema,
  name: z.string(),
  items: z.array(snapshotItemSchema).max(100),
  totals: macrosSchema,
});

export const assistantSnapshotSchema = z.object({
  today: dateKeySchema,
  yesterday: dateKeySchema,
  weekday: z.string(),
  localHour: z.number().int().min(0).max(23),
  units: z.enum(['metric', 'imperial']),
  targets: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number().nullable(),
    fat: z.number().nullable(),
  }),
  days: z
    .array(
      z.object({
        date: dateKeySchema,
        weekday: z.string(),
        consumed: macrosSchema,
        remainingCalories: z.number(),
        remainingProtein: z.number(),
        mealCount: z.number(),
      }),
    )
    .max(31),
  meals: z.array(snapshotMealSchema).max(200),
  recipes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        totals: macrosSchema,
        per100g: macrosSchema,
        cookedWeightG: z.number().nullable(),
        servings: z.number().nullable(),
        perServing: macrosSchema.nullable(),
      }),
    )
    .max(300),
  calibrations: z
    .array(z.object({ name: z.string(), foodName: z.string().nullable(), grams: z.number() }))
    .max(200),
});

export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatTurnSchema).min(1).max(40),
  snapshot: assistantSnapshotSchema,
});

const logMealItemSpecSchema = z.object({
  name: z.string(),
  grams: z.number().nullable(),
  quantity: z.number().nullable(),
  unitLabel: z.string().nullable(),
  recipeMatch: z.string().nullable(),
  estimatedPer100g: macrosSchema.nullable(),
});

const actionCandidateSchema = z.object({ mealId: z.string(), itemId: z.string().nullable() });

/** Flat model-facing shape (no unions, no min/max: structured outputs reject those). */
export const modelReplySchema = z.object({
  reply: z.string(),
  action: z
    .object({
      type: z.enum(['log_meal', 'repeat_meal', 'update_item_grams', 'delete_meal', 'delete_item']),
      date: z.string().nullable(),
      mealType: mealTypeSchema.nullable(),
      name: z.string().nullable(),
      items: z.array(logMealItemSpecSchema).nullable(),
      sourceMealId: z.string().nullable(),
      mealId: z.string().nullable(),
      itemId: z.string().nullable(),
      grams: z.number().nullable(),
      candidates: z.array(actionCandidateSchema).nullable(),
      needsConfirmation: z.boolean(),
      summary: z.string(),
    })
    .nullable(),
});

/** Validated discriminated union the client applies through the repositories. */
export const assistantActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('log_meal'),
    date: dateKeySchema,
    mealType: mealTypeSchema,
    name: z.string().nullable(),
    items: z.array(logMealItemSpecSchema).min(1),
  }),
  z.object({ type: z.literal('repeat_meal'), sourceMealId: z.string(), date: dateKeySchema, mealType: mealTypeSchema }),
  z.object({ type: z.literal('update_item_grams'), mealId: z.string(), itemId: z.string(), grams: z.number().positive() }),
  z.object({ type: z.literal('delete_meal'), mealId: z.string() }),
  z.object({ type: z.literal('delete_item'), mealId: z.string(), itemId: z.string() }),
]);

export const assistantProposalSchema = z.object({
  action: assistantActionSchema,
  needsConfirmation: z.boolean(),
  candidates: z.array(actionCandidateSchema),
  summary: z.string(),
});

export const assistantReplySchema = z.object({
  reply: z.string(),
  proposal: assistantProposalSchema.nullable(),
  mode: z.enum(['claude', 'mock']),
});
