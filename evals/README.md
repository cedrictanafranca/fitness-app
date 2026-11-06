# Evals

Live accuracy checks for the AI features. Unlike `npm test`, these call the real Claude and
food-database APIs through the running dev server, so they cost a little API credit (roughly a
cent or two per full run) and results vary slightly from run to run.

## Running

1. Put `ANTHROPIC_API_KEY` (and ideally `USDA_API_KEY`) in `.env`.
2. Start the dev server: `npx expo start`.
3. In another terminal: `npm run eval`.

Reports land in `evals/results/` as Markdown and JSON. Set `EVAL_API_URL` to point at another
server.

## What is covered

| Suite | File | What it checks |
| --- | --- | --- |
| Text descriptions | `cases/meals.ts` | Items found, grams, the database entry picked, final calories and protein vs USDA references. |
| Voice-style transcripts | `cases/meals.ts` | The same, phrased as speech recognition returns it (fillers, number words, a self-correction). |
| Photos | `cases/photos.ts` | Foods identified and calories from photos alone. |
| Assistant | `assistant.eval.ts` | Each request becomes the right action on the right meal or item, and answers quote the app's numbers. |

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
