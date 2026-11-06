# Evals

Live accuracy checks for the AI features. Unlike `npm test`, these call the real Claude and
food-database APIs through the running dev server, so they cost API credit and results vary from
run to run.

**Cost:** about $0.50 of Anthropic credit per full run (38 meal cases and 11 assistant requests),
about $1 with `EVAL_REPEATS=2`. The database check makes no Claude calls and is free. To run only
that: `npx vitest run --config vitest.evals.config.ts evals/database.eval.ts`.

## Running

1. Put `ANTHROPIC_API_KEY` (and ideally `USDA_API_KEY`) in `.env`.
2. Start the dev server: `npx expo start`.
3. In another terminal: `npm run eval`.

Reports land in `evals/results/` as Markdown and JSON. Set `EVAL_API_URL` to point at another
server. Set `EVAL_REPEATS=2` (or more) to run each meal case several times: Claude's answers vary,
and a case that passes only some of the time is marked "flaky".

## What is covered

| Suite | File | What it checks |
| --- | --- | --- |
| Text descriptions | `cases/meals.ts` | Items found, grams, the database entry picked, final calories and protein vs USDA references. |
| Voice-style transcripts | `cases/meals.ts` | The same, phrased as speech recognition returns it (fillers, number words, a self-correction). |
| Plant milks, own data, units, brands | `cases/meals.ts` | Oat milk is not logged as dairy; a saved grocery, calibrated scoop and saved recipe are used; oz/ml sizes convert; beer, wine, a Big Mac, water. |
| Photos | `cases/photos.ts` | Foods identified and calories from photos alone. A wrong food the app flags for the user to check is reported, not failed. |
| Common foods | `database.eval.ts` | 68 everyday foods, named as the AI names them, through the app's lookup, against USDA kcal/100 g. No AI calls. |
| Assistant | `assistant.eval.ts` | Each request becomes the right action on the right meal or item, and answers quote the app's numbers. |

References come from USDA. Where its two datasets disagree (SR Legacy and the newer Foundation
data, e.g. apples, hummus, tuna, pineapple), the reference sits between them and the case notes say so.

Meal cases report three errors so a miss can be traced: **portion** (Claude's grams, priced at
reference nutrition), **database** (the entry the app picked, at reference grams) and **total**
(what the app would log).

## Not covered

- **Speech recognition itself**: transcription runs on the device. These evals start from the
  transcript, which is everything the app does after the microphone.
- **The camera**: photos are fed in as files, the same bytes the camera or library would provide.

## Photo sources

All from Wikimedia Commons, resized to 800 px wide:

| File | Source | License |
| --- | --- | --- |
| `photos/banana.jpg` | "Banana isolated on white" | CC BY 2.0 |
| `photos/apple.jpg` | "Red Apple" | CC BY 2.0 |
| `photos/eggs.jpg` | "Two sunny-side up eggs on a plate in the Franklin Farm section of Oak Hill, Fairfax County, Virginia" | CC BY-SA 4.0 |
| `photos/rice.jpg` | "Bowl of white rice 01" | CC0 |
| `photos/porkchop.jpg` | "Pork chop with two fried eggs rice with vegetables from Happy House HK style restaurant" | CC BY-SA 4.0 |
