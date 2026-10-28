# Fuel — personal AI nutrition & fitness tracker

Log meals with any mix of **photo, text, voice, and measured weight**. Claude identifies the
foods; the app computes nutrition deterministically from USDA / Open Food Facts / your own
family recipes, and keeps a calorie + protein dashboard up to date. Built with Expo (SDK 58),
Expo Router, TypeScript and SQLite.

Product requirements: [docs/PRD.md](docs/PRD.md). Build plan and agent assignments:
[docs/PLAN.md](docs/PLAN.md). API routes: [docs/API.md](docs/API.md).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the keys below
```

| Variable | Required for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI meal analysis and recipe extraction | https://console.anthropic.com |
| `USDA_API_KEY` | USDA FoodData Central search (Open Food Facts needs no key) | https://fdc.nal.usda.gov/api-key-signup |
| `EXPO_PUBLIC_API_URL` | Optional. Absolute origin of the API routes when not using the Metro dev server | — |

Keys are read only by the server-side API routes in `src/app/api/**` and never ship in the app
bundle. `GET /api/health` reports which keys are configured.

## Running

**On your iPhone with Expo Go (fastest, no Xcode):**

```bash
npx expo start
```

Scan the QR code with Expo Go. Camera, photo library, SQLite and the dashboard all work.
On-device speech recognition needs a native module, so the mic button is hidden in Expo Go.

**Dev build (full features, needs Xcode or Android Studio):**

```bash
npx expo run:ios
```

**Web preview:**

```bash
npx expo start --web
```

## Checks

```bash
npm run typecheck   # tsc
npm run lint        # eslint
npm test            # vitest — nutrition engine + food normalizers
```

## Layout

```
src/
  app/            Expo Router: (tabs)/ Home · Log · Recipes · Progress · Settings; log/ and recipes/ stacks; api/ server routes
  core/           Pure TS domain: types, deterministic nutrition engine (+ tests)
  data/           SQLite migrations, JSON-document repositories, live-query hook
  server/         Claude client, prompts, zod schemas, USDA/OFF normalizers (server only)
  services/       Client wrappers: ai, foods, camera, speech, api-base
  features/       Screen components and hooks per tab
  components/ui/  Shared primitives (Ring, MacroCard, Button, Sheet, EstimateBadge…)
```

## Status

Phase 1 (MVP) is implemented: dashboard, universal log flow, food search + custom foods, family
recipes with batches and portion calibration, settings, weight log. Phase 2's conversational
assistant (✦ on Home, or "Ask the assistant" on Log) answers questions about your log and proposes
structured changes that the app applies through the repositories; without `ANTHROPIC_API_KEY` it
runs an offline rule-based mode (see `docs/API.md`, `POST /api/ai/chat`). Apple Health / Apple Watch
integration is Phase 3 and not yet wired — activity credit settings exist but no activity data is
imported. See `docs/PLAN.md` for the phase roadmap.
