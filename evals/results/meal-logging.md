# Meal logging evals

Run 2026-11-06T05:19:45.036Z: **25 of 26 passed**.

- Reference nutrition: USDA FoodData Central values for the described portion.
- Portion error prices Claude's grams at reference nutrition; database error prices reference grams at the entry the app picked.

## Text descriptions (16/16)

| Case | Result | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| banana | pass | 105 / 105 | +0% | +0% | +0% | 1 / 1 g | banana 118/118 g | Bananas, raw (usda): 89/89 |  |
| eggs-boiled | pass | 155 / 155 | +0% | +0% | +0% | 13 / 13 g | egg 100/100 g | Egg, whole, cooked, hard-boiled (usda): 155/155 |  |
| chicken-150g | pass | 227 / 248 | -8% | +0% | -8% | 46 / 47 g | chicken 150/150 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165 |  |
| rice-cup | pass | 208 / 205 | +1% | +1% | +0% | 4 / 4 g | rice 160/158 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| apple | pass | 87 / 95 | -8% | +0% | -8% | 1 / 1 g | apple 182/182 g | Apples, raw, without skin (usda): 48/52 |  |
| peanut-butter | pass | 96 / 94 | +2% | +0% | +2% | 4 / 4 g | peanut butter 16/16 g | Peanut butter, smooth style, without salt (usda): 598/588 |  |
| greek-yogurt | pass | 122 / 118 | +3% | +0% | +3% | 21 / 20 g | yogurt 200/200 g | Yogurt, Greek, plain, nonfat (usda): 61/59 |  |
| ww-bread | pass | 78 / 81 | -4% | -6% | +4% | 4 / 4 g | bread 30/32 g | Bread, 100% whole wheat, commercial (usda): 261/252 |  |
| whole-milk | pass | 151 / 149 | +1% | +0% | +2% | 8 / 8 g | milk 244/244 g | Milk, buttermilk, fluid, whole (usda): 62/61 |  |
| almonds | pass | 200 / 174 | +15% | +0% | +15% | 6 / 6 g | almond 30/30 g | Almonds (usda): 667/579 |  |
| coke-can | pass | 155 / 140 | +11% | +1% | +11% | 0 / 0 g | coca 370/368 g | Beverages, carbonated, cola, regular (usda): 42/38 |  |
| bowl-mixed | pass | 595 / 581 | +2% | +6% | -4% | 52 / 52 g | chicken 150/150 g; rice 160/158 g; avocado 100/80 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165; Rice, white, medium-grain, enriched, cooked (usda): 130/130; Avocados, raw, all commercial varieties (usda): 160/160 |  |
| oatmeal-breakfast | pass | 371 / 365 | +2% | +1% | +1% | 11 / 11 g | oat 240/234 g; banana 118/118 g; peanut butter 16/16 g | Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt (usda): 71/71; Bananas, raw (usda): 89/89; Peanut Butter (usda): 600/588 |  |
| vague-rice-bowl | pass | 260 / 260 | +0% | +0% | +0% | 5 / 5 g | rice 200/200 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| vague-chicken-breast | pass | 204 / 284 | -28% | -22% | -8% | 41 / 53 g | chicken 135/172 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165 |  |
| plate-weight | pass | 325 / 325 | +0% | +0% | +0% | 6 / 7 g | rice 250/250 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |

## Voice-style transcripts (5/5)

| Case | Result | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| voice-eggs-banana | pass | 260 / 260 | +0% | +0% | +0% | 14 / 14 g | egg 100/100 g; banana 118/118 g | Egg, whole, cooked, hard-boiled (usda): 155/155; Bananas, raw (usda): 89/89 |  |
| voice-number-words | pass | 435 / 453 | -4% | +1% | -5% | 50 / 51 g | chicken 150/150 g; rice 160/158 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165; Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| voice-two-hundred-grams | pass | 320 / 292 | +10% | +0% | +10% | 27 / 27 g | yogurt 200/200 g; almond 30/30 g | Yogurt, Greek, plain, nonfat (usda): 61/59; Almonds (openfoodfacts): 659/579 |  |
| voice-self-correction | pass | 86 / 83 | +4% | +0% | +3% | 8 / 8 g | skim 245/245 g | Milk, fluid, nonfat, calcium fortified (fat free or skim) (usda): 35/34 |  |
| voice-run-on | pass | 183 / 189 | -3% | +0% | -3% | 4 / 5 g | apple 182/182 g; peanut butter 16/16 g | Apples, raw, without skin (usda): 48/52; Peanut Butter (usda): 600/588 |  |

## Photos (4/5)

| Case | Result | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| photo-banana | pass | 105 / 105 | +0% | +0% | +0% | 1 / 1 g | banana 118/118 g | Bananas, raw (usda): 89/89 |  |
| photo-apple | pass | 86 / 95 | -9% | -1% | -8% | 1 / 1 g | apple 180/182 g | Apples, raw, without skin (usda): 48/52 |  |
| photo-fried-eggs | pass | 180 / 180 | +0% | +0% | +0% | 13 / 13 g | egg 92/92 g | Egg, whole, cooked, fried (usda): 196/196 |  |
| photo-rice-bowl | pass | 286 / 260 | +10% | +10% | +0% | 5 / 5 g | rice 220/200 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| photo-plated-meal | **fail** | 771 / 875 | -12% | -15% | 0% | 44 / 54 g | rice 170/250 g; egg 100/92 g; bok choy 60/80 g; tea 200/200 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130; Egg, whole, cooked, fried (usda): 196/196; Bok Choy Blend (usda): 24/13; Beverages, tea, instant, lemon, sweetened, prepared with water (usda): 35/40 | chicken thigh, grilled, glazed (179 kcal); soy sauce, sweet dark glaze (20 kcal); frying oil (71 kcal) |

Failures:

- **photo-plated-meal**: missed pork
