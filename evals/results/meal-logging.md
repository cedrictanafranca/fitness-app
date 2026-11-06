# Meal logging evals

Run 2026-11-06T05:59:59.650Z: **36 of 38 passed**.

- Reference nutrition: USDA FoodData Central values for the described portion.
- Portion error prices Claude's grams at reference nutrition; database error prices reference grams at the entry the app picked.

## Text descriptions (15/16)

| Case | Result | Runs | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| banana | pass | 2/2 | 105 / 105 | +0% | +0% | +0% | 1 / 1 g | banana 118/118 g | Bananas, raw (usda): 89/89 |  |
| eggs-boiled | pass | 2/2 | 155 / 155 | +0% | +0% | +0% | 13 / 13 g | egg 100/100 g | Egg, whole, cooked, hard-boiled (usda): 155/155 |  |
| chicken-150g | pass | 2/2 | 227 / 248 | -8% | +0% | -8% | 46 / 47 g | chicken 150/150 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165 |  |
| rice-cup | pass | 2/2 | 208 / 205 | +1% | +1% | +0% | 4 / 4 g | rice 160/158 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| apple | **fail** | 1/2 (flaky) | 111 / 95 | +17% | +0% | +17% | 0 / 1 g | apple 182/182 g | Apples, gala, with skin, raw (usda): 61/52 |  |
| peanut-butter | pass | 2/2 | 95 / 94 | +1% | +0% | +1% | 4 / 4 g | peanut butter 16/16 g | Peanut butter, chunky, vitamin and mineral fortified (usda): 593/588 |  |
| greek-yogurt | pass | 2/2 | 118 / 118 | +0% | +0% | +0% | 20 / 20 g | yogurt 200/200 g | Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program) (usda): 59/59 |  |
| ww-bread | pass | 2/2 | 84 / 81 | +4% | +0% | +4% | 3 / 4 g | bread 32/32 g | Bread, pita, whole-wheat (usda): 262/252 |  |
| whole-milk | pass | 2/2 | 149 / 149 | +0% | -2% | +2% | 8 / 8 g | milk 240/244 g | Whole Milk (usda): 62/61 |  |
| almonds | pass | 2/2 | 182 / 174 | +5% | +0% | +5% | 6 / 6 g | almond 30/30 g | Nuts, almonds, oil roasted, with salt added (usda): 607/579 |  |
| coke-can | pass | 2/2 | 149 / 140 | +6% | -4% | +11% | 0 / 0 g | coca 355/368 g | Beverages, carbonated, cola, regular (usda): 42/38 |  |
| bowl-mixed | pass | 2/2 | 595 / 581 | +2% | +6% | -4% | 52 / 52 g | chicken 150/150 g; rice 160/158 g; avocado 100/80 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165; Rice, white, medium-grain, enriched, cooked (usda): 130/130; Avocados, raw, all commercial varieties (usda): 160/160 |  |
| oatmeal-breakfast | pass | 2/2 | 366 / 365 | +0% | +0% | +0% | 11 / 11 g | oat 234/234 g; banana 118/118 g; peanut butter 16/16 g | Cereals, oats, regular and quick, unenriched, cooked with water (includes boiling and microwaving), without salt (usda): 71/71; Bananas, raw (usda): 89/89; Peanut butter, chunky, vitamin and mineral fortified (usda): 593/588 |  |
| vague-rice-bowl | pass | 2/2 | 260 / 260 | +0% | +0% | +0% | 5 / 5 g | rice 200/200 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| vague-chicken-breast | pass | 2/2 | 204 / 284 | -28% | -22% | -8% | 41 / 53 g | chicken 135/172 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165 |  |
| plate-weight | pass | 2/2 | 325 / 325 | +0% | +0% | +0% | 6 / 7 g | rice 250/250 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |

Failures:

- **apple**: calories 111 vs 95 (+17%, allowed ±15%)

## Voice-style transcripts (5/5)

| Case | Result | Runs | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| voice-eggs-banana | pass | 2/2 | 260 / 260 | +0% | +0% | +0% | 14 / 14 g | egg 100/100 g; banana 118/118 g | Egg, whole, cooked, hard-boiled (usda): 155/155; Bananas, raw (usda): 89/89 |  |
| voice-number-words | pass | 2/2 | 435 / 453 | -4% | +1% | -5% | 50 / 51 g | chicken 150/150 g; rice 160/158 g | Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled (usda): 151/165; Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| voice-two-hundred-grams | pass | 2/2 | 300 / 292 | +3% | +0% | +3% | 27 / 27 g | yogurt 200/200 g; almond 30/30 g | Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program) (usda): 59/59; Nuts, almonds, oil roasted, with salt added (usda): 607/579 |  |
| voice-self-correction | pass | 2/2 | 86 / 83 | +4% | +0% | +3% | 8 / 8 g | skim 245/245 g | Milk, nonfat, fluid, without added vitamin A and vitamin D (fat free or skim) (usda): 35/34 |  |
| voice-run-on | pass | 2/2 | 202 / 189 | +7% | +0% | +7% | 5 / 5 g | apple 182/182 g; peanut butter 16/16 g | Apples, raw, red delicious, with skin (Includes foods for USDA's Food Distribution Program) (usda): 59/52; Peanut butter, chunky, vitamin and mineral fortified (usda): 593/588 |  |

## Plant milks, own data, units, brands (11/12)

| Case | Result | Runs | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| oat-milk-unsweetened | pass | 2/2 | 118 / 115 | +3% | +2% | +1% | 2 / 2 g | oat 244/240 g | Oat milk, unsweetened, plain, refrigerated (usda): 48/48 |  |
| oat-milk-vanilla | pass | 2/2 | 103 / 113 | -9% | +0% | -9% | 3 / 1 g | oat 240/240 g | Vanilla Milked Oats, Vanilla (usda): 43/47 |  |
| oat-milk-latte | **fail** | 1/2 (flaky) | 241 / 150 | +61% | +18% | +42% | 5 / 3 g | oat 355/300 g | Oat Latte Cold Coffee + Oat Milk, Oat Latte (usda): 68/48 |  |
| saved-grocery | pass | 2/2 | 110 / 110 | +0% | +0% | +0% | 1 / 1 g | oat 250/250 g | oat milk, vanilla (custom): 44/44 |  |
| calibrated-scoop | pass | 2/2 | 377 / 377 | +0% | +0% | +0% | 7 / 8 g | rice 290/290 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| saved-recipe | pass | 2/2 | 426 / 426 | +0% | +0% | +0% | 80 / 80 g | adobo 225/225 g | recipe: 189/189.2 |  |
| ounces | pass | 2/2 | 303 / 350 | -13% | +0% | -14% | 41 / 37 g | salmon 170/170 g | Fish, salmon, coho, farmed, cooked, dry heat (usda): 178/206 |  |
| beer | pass | 2/2 | 153 / 153 | +0% | 0% | +0% | 2 / 2 g | beer 355/356 g | Alcoholic beverage, beer, regular, all (usda): 43/43 |  |
| red-wine | pass | 2/2 | 126 / 125 | +1% | +0% | +0% | 0 / 0 g | wine 148/148 g | Alcoholic beverage, wine, table, red (usda): 85/85 |  |
| cheddar-oz | pass | 2/2 | 116 / 114 | +2% | +1% | +1% | 7 / 7 g | cheddar 28/28 g | Cheese, cheddar (usda): 408/403 |  |
| big-mac | pass | 2/2 | 553 / 563 | -2% | -2% | +0% | 25 / 26 g | big mac 215/219 g | McDONALD'S, BIG MAC (usda): 257/257 |  |
| water | pass | 2/2 | 0 / 0 | +0% | +0% | +0% | 0 / 0 g |  |  | water (0 kcal) |

Failures:

- **oat-milk-latte**: calories 241 vs 150 (+61%, allowed ±40%)

## Photos (5/5)

| Case | Result | Runs | Calories | Total | Portion | Database | Protein | Grams | Database entry (kcal/100 g: got/ref) | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| photo-banana | pass | 2/2 | 105 / 105 | +0% | +0% | +0% | 1 / 1 g | banana 118/118 g | Bananas, raw (usda): 89/89 |  |
| photo-apple | pass | 2/2 | 116 / 95 | +22% | +4% | +17% | 0 / 1 g | apple 190/182 g | Apples, gala, with skin, raw (usda): 61/52 |  |
| photo-fried-eggs | pass | 2/2 | 196 / 180 | +9% | +9% | +0% | 14 / 13 g | egg 100/92 g | Egg, whole, cooked, fried (usda): 196/196 |  |
| photo-rice-bowl | pass | 2/2 | 286 / 260 | +10% | +10% | +0% | 5 / 5 g | rice 220/200 g | Rice, white, medium-grain, enriched, cooked (usda): 130/130 |  |
| photo-plated-meal | pass | 2/2 | 910 / 875 | +4% | -13% | +10% | 52 / 54 g | rice 180/250 g; egg 100/92 g; bok choy 70/80 g; tea 200/200 g; missed pork, flagged for the user: chicken thigh, grilled, with skin, glazed, soy sauce, sweet dark drizzle, cooking oil, absorbed in frying | Rice, white, medium-grain, enriched, cooked (usda): 130/130; Egg, whole, cooked, fried (usda): 196/196; Teff, cooked (usda): 101/13; Beverages, tea, instant, lemon, sweetened, prepared with water (usda): 35/40 | chicken thigh, grilled, with skin, glazed (240 kcal); soy sauce, sweet dark drizzle (11 kcal); cooking oil, absorbed in frying (88 kcal) |
