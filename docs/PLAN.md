# Build Plan — Personal AI Nutrition & Fitness Tracker

Source of truth for scope: the PRD (`docs/PRD.md`). Visual reference: the Figma board
screenshots in `docs/reference/figma/` (Cal AI screens — use for layout and flow only,
never copy assets or branding).

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| App | Expo SDK 58 + Expo Router + TypeScript | Already scaffolded; camera/mic/photos via Expo modules; HealthKit later via dev build |
| Local DB | `expo-sqlite` with hand-written migrations | Offline-first, durable, no cloud needed for MVP |
| Backend | Expo Router API routes (`src/app/api/**/*+api.ts`) | Keeps AI + USDA keys server-side without a second repo |
| AI | Claude (vision + structured JSON) via `@anthropic-ai/sdk` on the server | Vision-capable, tool-use for structured meal extraction |
| Nutrition data | USDA FoodData Central + Open Food Facts | Verified values; OFF needs no key |
| Voice | `expo-speech-recognition` (on-device) | No audio upload; needs dev build, not Expo Go |
| Validation | `zod` | Shared schemas between API routes and client |
| Tests | `vitest` on `src/core/**` (pure TS, no RN imports) | Fast, no simulator |

Nutrition math is **deterministic application code** (`src/core/nutrition`). The AI only
identifies and structures foods; it never emits final calorie totals that the app trusts.

## Architecture

```
src/
  app/                       Expo Router
    (tabs)/                  Home · Log · Recipes · Progress · Settings
    api/                     server-only routes (AI, food search)
  core/                      pure TS domain — types, nutrition engine, tests
  data/                      SQLite open/migrate + repositories (one per aggregate)
  services/                  client wrappers for API routes, speech, camera, health
  features/<area>/           screen components + hooks for one tab
  components/ui/             shared primitives (Ring, MacroCard, Button, Sheet…)
  constants/theme.ts         design tokens
```

Data flow: screen → `features/*` hook → `data/repos` (SQLite) → `core/nutrition` for math.
Repos emit a `dataChanged` event; `useLiveQuery` re-reads on change.

## Phases

**Phase 1 — MVP (this build)**
1. Domain types, DB schema, repositories, nutrition engine + tests
2. Home dashboard: calorie/protein rings, macro cards, meal history by meal type, day nav
3. Universal Log flow: photo (camera/library) + text + voice + weight → AI analyze →
   review/fix → save
4. Food search (USDA/OFF) + custom foods + saved meals
5. Recipes: create (ingredients, batch weight), per-100 g math, log a portion
6. Settings: profile, targets, units
7. Edit/delete meals; history persists across restarts

**Phase 2 — Personalization**: recipe batches/versions, portion calibration ("scoop" =
145 g), conversational assistant with structured tools, repeat-yesterday, corrections.

**Phase 3 — Fitness**: HealthKit (active energy, workouts, steps) via dev build,
activity-adjusted remaining calories with a credit %, weekly trends, weight log.

**Phase 4 — Advanced**: barcode, portion estimation, widgets/shortcuts, cloud sync.

## Agent assignments (Phase 1)

Opus (lead, this session) owns anything shared: `package.json`, `src/core/**`,
`src/data/**`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `constants/theme.ts`.
Agents never add dependencies — they list needed ones in their report.

| Agent | Model | Owns | Deliverable |
|---|---|---|---|
| UI kit + Home | Sonnet | `src/components/ui/**`, `src/features/home/**`, `src/app/(tabs)/index.tsx` | Dashboard matching ring/macro layout; meal list grouped by type; day navigation |
| Log flow | Sonnet | `src/features/log/**`, `src/app/(tabs)/log.tsx`, `src/app/log/**`, `src/services/speech.ts`, `src/services/camera.ts` | Capture screen → review sheet → save; manual food search/add |
| AI + food APIs | Sonnet | `src/app/api/**`, `src/services/ai.ts`, `src/services/foods.ts`, `.env.example` | `/api/ai/analyze-meal`, `/api/foods/search`; zod schemas; estimate flags |
| Recipes | Sonnet | `src/features/recipes/**`, `src/app/(tabs)/recipes.tsx`, `src/app/recipes/**` | Create/edit recipe, batch weight, per-100 g display, log a portion |
| Settings + Progress | Haiku | `src/features/settings/**`, `src/features/progress/**`, `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/progress.tsx` | Profile/targets form; weight log + simple trend list |

Usage rationale: Opus only for the correctness-critical shared core; Sonnet for screens
that need design judgment and multi-file coordination; Haiku for form-heavy screens with
a fixed spec.

## Environment

```
ANTHROPIC_API_KEY=   # server-side only (API routes)
USDA_API_KEY=        # https://fdc.nal.usda.gov/api-key-signup
```

Run: `npm run ios` (dev build required for speech recognition: `npx expo run:ios`).
Tests: `npm test`.

## Acceptance (Phase 1)

Photo + text + weight → structured multi-food meal → calories/protein from real food
values, estimates labeled → saved once, editable, survives restart → dashboard shows
remaining calories and protein. Recipes save and log by portion weight.
