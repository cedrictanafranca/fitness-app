/**
 * Domain types shared by the nutrition engine, repositories, API routes and UI.
 * Pure TypeScript — no React Native imports allowed in src/core.
 */

export type ID = string;

/** ISO date without time, e.g. "2026-10-27". Day boundaries use the device's local timezone. */
export type DateKey = string;

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** Where a nutrition value came from. Preserved on every logged item. */
export type NutritionSource = 'usda' | 'openfoodfacts' | 'recipe' | 'custom' | 'ai_estimate';

/** Whether the quantity was measured (scale / known serving) or estimated (visual / description). */
export type EstimateStatus = 'measured' | 'estimated';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'recomposition' | 'maintenance';

export type Units = 'metric' | 'imperial';

// ---------- Profile ----------

export interface UserProfile {
  id: 'me';
  heightCm: number;
  weightKg: number;
  age?: number;
  goal: FitnessGoal;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget?: number;
  fatTarget?: number;
  units: Units;
  /** Whether Apple Health activity calories add to the daily allowance. */
  activityCreditEnabled: boolean;
  /** 0–100: share of reported active calories credited back to the allowance. */
  activityCreditPercent: number;
  updatedAt: string;
}

// ---------- Foods ----------

export interface ServingSize {
  label: string; // "1 scoop", "1 slice", "1 cup"
  grams: number;
}

export interface Food {
  id: ID;
  name: string;
  brand?: string;
  per100g: Macros;
  source: NutritionSource;
  /** External identifier, e.g. USDA fdcId or OFF barcode. */
  sourceRef?: string;
  servings: ServingSize[];
  /** True for foods the user saved to "My foods". */
  saved: boolean;
  createdAt: string;
}

// ---------- Recipes ----------

export interface RecipeIngredient {
  id: ID;
  name: string;
  foodId?: ID;
  /** Raw weight in grams, as added to the pot. */
  grams: number;
  per100g: Macros;
  source: NutritionSource;
  estimateStatus: EstimateStatus;
}

/** Reusable template (e.g. "Mom's chicken adobo"). */
export interface Recipe {
  id: ID;
  name: string;
  notes?: string;
  photoUri?: string;
  ingredients: RecipeIngredient[];
  /** Weight of the finished dish, if weighed. Enables per-100 g cooked values. */
  cookedWeightG?: number;
  servings?: number;
  createdAt: string;
  updatedAt: string;
}

/** A specific cooked instance of a recipe with its own quantities. Immutable once meals reference it. */
export interface RecipeBatch {
  id: ID;
  recipeId: ID;
  note?: string;
  ingredients: RecipeIngredient[];
  cookedWeightG: number;
  totals: Macros;
  per100g: Macros;
  createdAt: string;
}

// ---------- Meals ----------

export type MealItemRef =
  | { kind: 'food'; id: ID }
  | { kind: 'recipe'; id: ID }
  | { kind: 'batch'; id: ID }
  | { kind: 'none' };

export interface MealItem {
  id: ID;
  mealId: ID;
  name: string;
  ref: MealItemRef;
  /** Grams actually eaten, if known. Takes priority over quantity × unit. */
  grams?: number;
  /** Household quantity, e.g. 2 (scoops). */
  quantity?: number;
  unitLabel?: string;
  /** Snapshot of the per-100 g values used at logging time, so history never drifts. */
  per100g: Macros;
  totals: Macros;
  source: NutritionSource;
  estimateStatus: EstimateStatus;
  /** 0–1 from the AI, when the item came from photo/text analysis. */
  confidence?: number;
}

export interface Meal {
  id: ID;
  date: DateKey;
  timestamp: string;
  mealType: MealType;
  name?: string;
  photoUri?: string;
  /** Original typed text or voice transcript, kept for corrections. */
  inputText?: string;
  items: MealItem[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Portion calibration ----------

export interface CalibrationSample {
  grams: number;
  at: string;
}

/** "1 scoop of rice = 145 g". Calibrations are per food when foodName/foodId is set. */
export interface PortionCalibration {
  id: ID;
  name: string; // "scoop", "bowl", "serving spoon"
  foodId?: ID;
  foodName?: string;
  grams: number;
  history: CalibrationSample[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Progress ----------

export interface WeightRecord {
  id: ID;
  date: DateKey;
  weightKg: number;
  note?: string;
}

export interface ActivityRecord {
  id: ID;
  date: DateKey;
  source: 'healthkit' | 'manual';
  activityType: string;
  caloriesBurned: number;
  durationMin?: number;
  timestamp: string;
  /** Prevents double-import from HealthKit. */
  externalId?: string;
}

// ---------- Derived ----------

export interface DailyTotals {
  date: DateKey;
  consumed: Macros;
  targets: { calories: number; protein: number; carbs?: number; fat?: number };
  /** Raw active calories reported for the day. */
  activityCalories: number;
  /** Portion of activityCalories added to the allowance after the credit % is applied. */
  creditedActivityCalories: number;
  remainingCalories: number;
  remainingProtein: number;
  /** True when any item in the day is an estimate. */
  hasEstimates: boolean;
}

// ---------- AI contract ----------

/** What the AI returns for a meal before the app resolves it against the food database. */
export interface AnalyzedMealItem {
  name: string;
  /** Best guess at grams; null when the model has no basis. */
  estimatedGrams: number | null;
  /** Grams the user explicitly stated (text/voice/scale). Overrides estimatedGrams. */
  statedGrams: number | null;
  quantity: number | null;
  unitLabel: string | null;
  /** Name of a saved recipe the model thinks this matches, if any. */
  recipeMatch: string | null;
  confidence: number;
  /** Per-100 g fallback the model proposes when no database match exists. Always labeled ai_estimate. */
  estimatedPer100g: Macros | null;
}

export interface AnalyzedMeal {
  items: AnalyzedMealItem[];
  mealType: MealType | null;
  /** Question to ask the user when a materially important detail is missing. */
  clarification: string | null;
  notes: string | null;
}
