# Assistant evals

Run 2026-11-06T05:20:08.728Z: **11 of 11 passed**.

- Snapshot: 4 meals over 8 days; today has 2 meals, 982 kcal eaten.

## Assistant (11/11)

| Case | Result | Request | Expected | Action | Reply |
| --- | --- | --- | --- | --- | --- |
| protein-left | pass | How much protein do I still need today? | No action; quotes 24 g | none | You still need 23.8 g of protein today (121.2 g of your 145 g target so far). You also have 1518 kcal remaining. |
| calories-left | pass | How many calories do I have left? | No action; quotes 1518 kcal | none | You have 1518 kcal left today (982 of 2500 eaten so far). You also have 23.8 g of protein left to reach your 145 g target. |
| last-tuesday | pass | What did I eat last Tuesday? | No action; mentions salmon | none | Last Tuesday (Oct 20) you logged one meal, dinner: salmon, 150 g, for 309 kcal, 33 g protein, 0 g carbs and 18 g fat. Nothing else was logge |
| recipe-serving | pass | How many calories are in a serving of Mom's chicken adobo? | No action; quotes 426 kcal | none | One serving of Mom's chicken adobo is 426 kcal, with 79.5 g protein, 1.3 g carbs and 9 g fat. The full recipe (4 servings, 900 g cooked) is  |
| log-eggs | pass | Log 2 hard boiled eggs as a snack | log_meal, snack, eggs × 2 or ~100 g | log_meal | I'll log 2 hard boiled eggs (about 100 g) as a snack for today. I'll have the app look up the calories and protein when it adds them, since  |
| repeat-lunch | pass | Log the same lunch as yesterday | repeat_meal of yesterday's lunch | repeat_meal | I'll copy yesterday's Adobo lunch (chicken adobo 200 g, white rice 150 g) to today's lunch. That adds 525 kcal and 66.1 g protein. |
| update-grams | pass | Change the rice at dinner to 250 g | update_item_grams on dinner rice → 250 | update_item_grams | I'll change the white rice at today's dinner from 180 g to 250 g. The meal's rice portion is currently 234 kcal, and the app will recalculat |
| delete-item | pass | Remove the protein shake I had this morning | delete_item on the breakfast shake | delete_item | I'll remove the protein shake (200 g, 240 kcal, 48 g protein) from this morning's breakfast. Your breakfast would drop to 178 kcal and 6.3 g |
| delete-meal | pass | Delete today's dinner | delete_meal on dinner, needs confirmation | delete_meal | I'll remove today's dinner (grilled chicken breast and white rice), which takes off 564 kcal and 66.9 g protein from today's total. |
| ambiguous-rice | pass | Change the rice to 200 g | Asks which rice (two today/yesterday) or offers candidates | update_item_grams | I found rice in two meals: today's dinner (180 g, 234 kcal) and yesterday's Adobo lunch (150 g, 195 kcal). Which one should I change to 200  |
| no-invented-log | pass | Is white rice or brown rice better for building muscle? | No action (general question) | none | I can only help with your food log, so I can't compare white and brown rice for muscle building. I can tell you that today you have 23.8 g o |
