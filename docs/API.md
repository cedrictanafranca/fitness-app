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
| `ASSISTANT_MOCK` | server, optional | `1` forces the offline rule-based assistant for `/api/ai/chat`. Automatic when `ANTHROPIC_API_KEY` is unset. |

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

## `POST /api/ai/chat`

Conversational assistant (PRD §10). The database lives on the device, so the server cannot run tools against it.
Instead the client sends the conversation plus a compact **snapshot** (built by `src/core/assistant/snapshot.ts`:
targets, engine-computed daily totals for the last 7 days, every meal of the last 14 days with ids, saved recipes with
their nutrition, calibrated units) and the model answers with text plus at most one structured **action**. The client
(`src/services/assistant.ts`) applies the action through the repositories using the nutrition engine — the model never
emits totals the app trusts, and nothing is written on the server.

Request (`chatRequestSchema`):
```json
{ "messages": [{ "role": "user", "content": "Log the same lunch as yesterday" }],
  "snapshot": { "today": "2026-10-27", "yesterday": "2026-10-26", "weekday": "Tuesday", "localHour": 13, "units": "metric",
                "targets": { "calories": 2500, "protein": 145, "carbs": null, "fat": null },
                "days": [ { "date": "2026-10-27", "weekday": "Tuesday", "consumed": {"calories": 1249, "protein": 145.7, "carbs": 90, "fat": 30 },
                            "remainingCalories": 1451, "remainingProtein": -0.7, "mealCount": 2 } ],
                "meals": [ { "id": "m1", "date": "2026-10-26", "weekday": "Monday", "mealType": "lunch", "name": "Adobo lunch",
                             "items": [ { "id": "i1", "name": "chicken adobo", "grams": 200, "quantity": null, "unitLabel": null,
                                          "calories": 330, "protein": 62, "carbs": 0, "fat": 7.2, "estimated": false, "source": "recipe" } ],
                             "totals": { "calories": 525, "protein": 66, "carbs": 42, "fat": 7.6 } } ],
                "recipes": [ { "id": "r1", "name": "Mom's chicken adobo", "totals": {"calories": 1703, "protein": 318, "carbs": 5, "fat": 36 },
                               "per100g": {"calories": 189, "protein": 35.3, "carbs": 0.6, "fat": 4 }, "cookedWeightG": 900, "servings": 4,
                               "perServing": {"calories": 426, "protein": 79.5, "carbs": 1.3, "fat": 9 } } ],
                "calibrations": [ { "name": "scoop", "foodName": "rice", "grams": 145 } ] } }
```

Response (`assistantReplySchema`):
```json
{ "reply": "I'll log Adobo lunch as today's lunch: 525 kcal and 66 g protein.",
  "proposal": { "action": { "type": "repeat_meal", "sourceMealId": "m1", "date": "2026-10-27", "mealType": "lunch" },
                "needsConfirmation": false, "candidates": [], "summary": "Log yesterday's lunch as today's lunch" },
  "mode": "claude" }
```

`proposal` is `null` for pure questions. `action` is a discriminated union:

| type | fields | client applies as |
|---|---|---|
| `log_meal` | `date`, `mealType`, `name`, `items[{name, grams, quantity, unitLabel, recipeMatch, estimatedPer100g}]` | resolve like the Log flow (recipe → food DB → AI per-100 g), `mealsRepo.create` |
| `repeat_meal` | `sourceMealId`, `date`, `mealType` | copy items with new ids, `mealsRepo.create` |
| `update_item_grams` | `mealId`, `itemId`, `grams` | `withGrams` + `mealsRepo.update` |
| `delete_item` | `mealId`, `itemId` | `mealsRepo.update` (or `remove` when the meal becomes empty) |
| `delete_meal` | `mealId` | `mealsRepo.remove` |

Guarantees enforced server-side (`src/core/assistant/proposal.ts`): every id must exist in the snapshot that was sent,
dates are never in the future, grams are 0–20 000, `recipeMatch` must be a saved recipe name, duplicate/unknown candidates
are dropped. Deletions always have `needsConfirmation: true`; more than one `candidates` entry means the user must pick.
The client shows a confirmation card in both cases and applies each assistant turn at most once (idempotency key per
turn). The model is called with `effort: "medium"` via the same structured-output helper as the other routes.

**Mock mode.** When `ANTHROPIC_API_KEY` is unset (or `ASSISTANT_MOCK=1`) the route answers with
`src/server/assistant-mock.ts`, a rule-based assistant that understands the PRD example commands ("How much protein do I
still need?", "Log the same lunch as yesterday", "Remove the protein shake I logged earlier", "Change my dinner from
200 g to 250 g", "What did I eat last Tuesday?", "How many calories were in <recipe>?") against the same snapshot and
returns `"mode": "mock"`; the chat screen shows an "Offline mode" banner.

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
- `loadAssistantSnapshot()` / `sendAssistantMessage(messages, snapshot)` / `prepareAction(action, key)`: assistant
  snapshot, chat call, and a one-shot `commit()` with an engine-computed before/after preview (`src/services/assistant.ts`).
