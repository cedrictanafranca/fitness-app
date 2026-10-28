# Personal AI Nutrition & Fitness Tracking App — Product Requirements Document

## 1. Product Overview

Build a personal nutrition and fitness tracking app that combines the best features of **Cal AI, MyFitnessPal, and a conversational AI assistant**. The app should make tracking calories, protein, macronutrients, and physical activity as effortless and accurate as possible.

**Core concept:** Users log meals using any combination of photos, text, voice, and measured food weights. The AI interprets the available information, identifies foods, references saved recipes and nutrition databases, calculates nutrition, and automatically updates daily totals.

Priorities: convenience, accuracy, personalization, minimal manual data entry.

### Primary User

Single personal user initially (architecture should allow future multi-user).

- Height 5'9", weight 149 lb (~67.6 kg)
- Goal: body recomposition — build muscle, reduce skinny-fat appearance
- Protein target 145 g/day (adjustable); calorie target personalized and adjustable
- Meals mostly home-cooked by a parent
- Apple Watch Series 4 + Apple Health

## 2. Core Principles

1. **Minimal friction** — as few interactions as possible to log a meal
2. **Flexible input** — photo, voice, text, scale weight, independently or together
3. **Accuracy first** — verified nutrition data and measured quantities over AI guesses
4. **Personalization** — remember frequent meals, family recipes, serving sizes, corrections
5. **Actionable tracking** — daily calories, protein, activity-adjusted remaining calories

The UX should feel like talking to ChatGPT, not filling in a database.

## 3. Core Features

### 3.1 Multimodal AI Meal Logging (highest priority)

Universal logging interface supporting any combination of: photo, typed text, voice, measured grams, saved meals/recipes, calibrated portions.

| Input | Behavior |
|---|---|
| Photo only | Identify foods, estimate portions |
| Text only | Parse description, estimate nutrition |
| Voice only | Transcribe, then parse |
| Photo + text/voice | Identify foods, use details to refine |
| Photo + weight | Identify foods, use measured weight |
| Text + weight | Identify named food, compute from weight |
| Photo + text + weight | Combine all |
| Saved meal reference | Retrieve previous entry |

Examples: "200 g of chicken adobo and one scoop of rice, same adobo recipe my mom made last week" → match saved recipe, use 200 g, look up calibrated scoop, compute, show breakdown, save. "Same breakfast as yesterday" → copy yesterday's breakfast for today. "Actually it was 300 g of rice, not 200" → find entry, update, recalc totals.

AI requirements: conversational; multiple foods per sentence; remembers recent meals; distinguishes measured vs estimated; handles units; asks follow-ups only when important info is missing; supports edit/replace/delete; prevents duplicates. **Never invent exact nutrient values when quantities/recipes are unknown — label as estimates.**

### 3.2 AI Photo Recognition

Camera or library image. Identify food items, components, likely ingredients, approximate portions, saved-recipe matches, whether more info is needed. Separate entries per component where practical.

**Priority order for quantities:** 1) user measured weights 2) saved recipes with known quantities 3) verified database entries 4) calibrated portions 5) user descriptions 6) AI visual estimates. Measured weight beats visual estimate. If a whole plate is weighed, do not assume component weights — let the user specify, or accept a clearly-labeled approximate breakdown.

Future: camera-based portion estimation; no LiDAR for v1.

## 4. Family Recipe Database (major differentiator)

Reusable recipes for dishes cooked in bulk by a parent.

**4.1 Create:** via text/voice/photo/form. AI extracts ingredients, asks for missing quantities that materially affect accuracy. Fields: name, ingredients + weights, oils/sauces, total cooked batch weight, servings, photos, notes. App computes batch totals and per-100 g (calories, protein, carbs, fat). Distinguish raw vs cooked weights.

**4.2 Reuse:** "250 g of Mom's chicken adobo" → retrieve recipe, compute for serving, log.

**4.3 Batches/versions:** distinguish recipe template, specific cooked batch, individual serving. Allow adjusting quantities per batch; preserve history. **Previously logged meals must not change when a recipe is updated.**

**4.4 Mixed dishes:** acknowledge non-uniform density; optionally separate components (rice/meat/sauce); never force weighing every ingredient daily.

## 5. Personalized Portion Calibration

Learn household serving sizes: scoop, bowl, plate, spoon, snacks. "One scoop of rice = 145 g" → "two scoops" = 290 g. Save name + weight, associate with food when needed, allow updates, keep history, distinguish measured vs estimated. **Never assume the same scoop weighs the same across different foods.**

## 6. Daily Nutrition Dashboard

Prominent: calorie target / consumed / activity adjustment / remaining; protein target / consumed / remaining; carbs and fat (optional targets). Progress bars; meals grouped by breakfast/lunch/dinner/snack with photos; expand to breakdown; edit/delete; previous-day navigation; weekly summaries; daily & weekly average protein; optional streaks. Calories and protein dominate visually.

## 7. Apple Health / Apple Watch (Phase 3)

HealthKit read: active energy, workouts, steps, distance. **Remaining = base target + credited activity − consumed.** Avoid double-counting baseline expenditure: toggle on/off, credit percentage, show reported vs credited, dedupe, handle missing permissions. Label as estimates.

## 8. Goals & Personalization

Settings: weight, height, age, goal (muscle gain / fat loss / recomposition / maintenance), calorie/protein/carb/fat targets, activity credit prefs, units. Optional progress: body weight + weekly average, waist, photos, strength, protein consistency, average intake. Secondary to logging for MVP.

## 9. Food Database

USDA FoodData Central + Open Food Facts. Search by name, branded products, serving sizes, gram↔household conversion, save frequent products, custom entries, barcode later, preserve source. AI estimates allowed only when no reliable entry exists, and must be labeled.

Per logged food store: name, quantity, grams (if known), calories, protein, carbs, fat, source, estimate status. **Calculation is deterministic once food + quantity are known. AI structures foods; app logic computes nutrition.**

## 10. Conversational Assistant (Phase 2)

Lightweight chat over the nutrition DB: "How many calories today?", "How much protein left?", "Log the same lunch as yesterday", "Remove the protein shake", "Change dinner from 200 g to 250 g", "Average protein this week?", "What did I eat last Tuesday?". Must read history, retrieve meals/recipes, create/update/delete entries via **structured application functions**, compute remaining targets. Ask for confirmation when ambiguous.

## 11. UX

Modern, polished, minimal iOS. Inspired by Cal AI (photo logging), MyFitnessPal (tracking depth), ChatGPT (conversation). **Do not copy proprietary assets or branding.**

Tabs: **Home** (dashboard + history), **Log** (camera/voice/text/weight), **Recipes** (recipes, foods, calibrations), **Progress** (weight, trends, activity), **Settings**.

Requirements: fast startup, minimal taps, auto meal-type by time with override, clear estimated-vs-measured, one-tap corrections, reuse previous meals, loading states, accessibility, dark mode, offline access to saved records.

## 12. Architecture

AI: existing vision-capable model for recognition, parsing, extraction, matching, chat; speech recognition for voice; no custom models. Nutrition engine: independent, structured, deterministic (calculations, conversions, recipe totals, scaling, daily aggregation). Local persistent storage with optional future cloud sync. Security: API keys server-side only; minimal Health permissions; user controls photos/history; export/delete; minimal health data collection.

## 13. Data Models

UserProfile, Food (nutrients per 100 g, source, servings), Recipe (ingredients, notes, photos), RecipeBatch (actual quantities, cooked weight, totals), Meal (timestamp, type, photo, original text/transcript), MealItem (food/batch ref, weight, quantity, macros, source, estimate status), PortionCalibration (name, food, grams, history), ActivityRecord, WeightRecord. **Snapshot nutrition values at logging time.**

## 14. Phases

**Phase 1 MVP:** dashboard; photo + text logging; voice; manual weight; multi-food extraction; nutrition DB; calorie/protein calc; saved foods + history; basic recipes; edit/delete. Success: photo + description + weight → reliable calorie/protein entry with minimal interaction.

**Phase 2:** recipe batches; calibration; conversational retrieval; AI corrections; repeat meals; frequent-food recognition; confidence handling.

**Phase 3:** HealthKit; Watch; activity-adjusted allowance; weekly trends; weight trends; progress.

**Phase 4:** barcode; portion estimation; multi-photo; advanced recipe recognition; widgets/shortcuts; voice-first; more integrations; cloud sync.

## 15. Edge Cases

Multiple foods per image; plate weight without component weights; unknown recipes; missing quantities; invisible cooking oil; bone-in meat; uneven bulk recipes; raw vs cooked; mixed densities; no exact weights; wrong AI identification; repeated logging; "same as yesterday"; missing Health permissions; offline; recipe edits after logging. When info is insufficient: ask for the most useful missing detail, or label clearly as estimate.

## 16. Acceptance Criteria (Phase 1)

- [ ] Take or upload a meal photo
- [ ] Add typed description alongside photo
- [ ] Add spoken description alongside photo
- [ ] Enter measured weights
- [ ] Combine inputs into one structured meal
- [ ] Identify multiple foods
- [ ] Match foods to saved recipes
- [ ] Calculate from real nutrition values
- [ ] Show estimates when exact info unavailable
- [ ] Save without duplicates
- [ ] Edit/delete meals
- [ ] Save and reuse recipes
- [ ] Nutrition from portion weight
- [ ] Reuse saved meals
- [ ] Remaining calories and protein shown
- [ ] History survives restart
- [ ] Data and API credentials protected

## 17. Instructions for the Development Agent

Build incrementally, starting with: **Open app → photo → text/voice → optional weight → AI recognizes → nutrition computed → review and log → dashboard updates.** Functional + reliable persistence + accurate math before polish. Modular so AI, food DB, and engine are replaceable. No hardcoded example meals as real data. Reasonable decisions without approval for minor choices. Document env vars and setup. Tests for recipe calc, portion scaling, daily totals, meal updates. Clear error handling. Never present estimates as exact. Never fake Health integration. Deliver a functioning project, not a mockup.
