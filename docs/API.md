# API routes

Expo Router API routes in `src/app/api/**` (server-only). Shared server code lives in `src/server/**`;
client wrappers are `src/services/ai.ts` and `src/services/foods.ts`. All schemas are in `src/server/schemas.ts` (zod).

Errors are always `{ "error": string }` with: `400` invalid request, `500` server misconfigured
(e.g. `ANTHROPIC_API_KEY` not set), `502` upstream failure (Anthropic or both food databases).

## Environment

| Var | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | server (`.env`) | Claude calls. Never exposed to the client. |
| `USDA_API_KEY` | server (`.env`) | USDA FoodData Central. If unset, USDA is skipped silently and only Open Food Facts is used. |
| `EXPO_PUBLIC_API_URL` | client, optional | Absolute origin of the API server. Unset in dev. |

Copy `.env.example` to `.env` and restart `npx expo start`. `GET /api/health` shows which keys are configured.

### How the app reaches the routes

`src/services/api-base.ts#apiUrl(path)` resolves: `EXPO_PUBLIC_API_URL` -> on native, the Metro host from
`Constants.expoConfig.hostUri` (`http://<lan-ip>:8081`) -> relative path (web). A production native build has no
dev host: set `EXPO_PUBLIC_API_URL` to the deployed server (`npx expo export --platform web` + EAS Hosting),
and set the `origin` option on the `expo-router` plugin in `app.json` when deploying.

## `GET /api/health`

`200 { "ok": true, "anthropic": boolean, "usda": boolean }`. Booleans only; values are never returned.

## `POST /api/ai/analyze-meal`

Model: `claude-sonnet-5-5` (constant `ANTHROPIC_MODEL` in `src/server/anthropic.ts`), vision + structured output
(`output_config.format`), low effort. Output is validated with zod and post-processed (`src/server/sanitize.ts`).

Request (`AnalyzeMealRequest`):
```json
{
  "imageBase64": "<base64, no data: prefix>", "imageMimeType": "image/jpeg",
  "text": "200 g chicken adobo and 2 scoops of rice",
  "statedTotalGrams": 450,
  "recipeNames": ["Mom's chicken adobo"],
  "calibrations": [{ "name": "scoop", "foodName": "rice", "grams": 145 }],
  "localHour": 13
}
```
At least one of `imageBase64` / `text` is required. `recipeNames` and `calibrations` default to `[]`.

Response (`AnalyzedMeal`, see `src/core/types.ts`):
```json
{
  "items": [
    { "name": "chicken adobo", "estimatedGrams": null, "statedGrams": 200, "quantity": null, "unitLabel": null,
      "recipeMatch": "Mom's chicken adobo", "confidence": 0.9, "estimatedPer100g": null },
    { "name": "white rice, cooked", "estimatedGrams": 290, "statedGrams": null, "quantity": 2, "unitLabel": "scoop",
      "recipeMatch": null, "confidence": 0.9, "estimatedPer100g": null }
  ],
  "mealType": "lunch", "clarification": null, "notes": null
}
```
Guarantees enforced server-side regardless of model output: `statedGrams` is dropped when no text was sent;
`recipeMatch` must be one of `recipeNames` (exact string); `estimatedGrams` is filled from a matching calibration
(`quantity x grams`) if the model left it null; confidence clamped to 0-1; implausible `estimatedPer100g` dropped.

## `POST /api/ai/extract-recipe`

Request (`ExtractRecipeRequest`): `{ "text": string, "imageBase64"?: string, "imageMimeType"?: "image/jpeg"|"image/png" }`
(text or image required). Response (`ExtractedRecipe`):
```json
{ "name": "Chicken adobo",
  "ingredients": [{ "name": "olive oil", "grams": 28, "quantityText": "2 tbsp", "confidence": 0.7 }],
  "cookedWeightG": null, "servings": 4, "clarification": "How much chicken did you use?" }
```
Quantities with a standard conversion are converted to grams (original kept in `quantityText`); otherwise `grams: null`.

## `GET /api/foods/search?q=<query>`

`q` is 2-100 chars. Queries USDA FoodData Central (Foundation, SR Legacy, Branded; 15) and Open Food Facts (10) in
parallel, 6 s timeout each, merges, drops entries without calories, ranks (Foundation/SR Legacy first, then name
similarity), caps at 20, and caches 10 minutes per query in memory.

`200 { "candidates": FoodCandidate[] }` where a candidate is
`{ name, brand?, per100g: {calories, protein, carbs, fat}, source: "usda"|"openfoodfacts", sourceRef: "usda:<fdcId>"|"off:<code>", servings: {label, grams}[] }`.
`502` only if every available source failed.

## Client services

- `analyzeMeal(req)` / `extractRecipe(req)`: POST + zod-validate; throw `Error` with the server's message on non-2xx.
- `searchFoods(q)`: `{ local, remote, remoteError? }`. `remote` excludes foods already stored locally (by `sourceRef`).
  A failed remote lookup does not throw: `local` is returned with `remoteError` set so search works offline.
- `cacheFood(candidate, saved?)`: idempotent on `sourceRef`; returns the stored `Food`.
