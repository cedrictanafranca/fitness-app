/**
 * Conversational assistant contract (PRD §10). Pure types shared by the API route,
 * the client service and the UI.
 *
 * Protocol: the client sends the conversation plus a compact AssistantSnapshot of the
 * on-device database; the model answers with text and, optionally, ONE structured
 * action. The server never touches the database — the client applies the action
 * through the repositories, and the nutrition engine computes every number.
 */

import type { DateKey, Macros, MealType, NutritionSource, Units } from '../types';

// ---------- Snapshot (client → model) ----------

export interface SnapshotItem {
  id: string;
  name: string;
  grams: number | null;
  quantity: number | null;
  unitLabel: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimated: boolean;
  source: NutritionSource;
}

export interface SnapshotMeal {
  id: string;
  date: DateKey;
  /** "Monday" … "Sunday", so "last Tuesday" needs no date arithmetic from the model. */
  weekday: string;
  mealType: MealType;
  name: string;
  items: SnapshotItem[];
  totals: Macros;
}

export interface SnapshotDay {
  date: DateKey;
  weekday: string;
  consumed: Macros;
  remainingCalories: number;
  remainingProtein: number;
  mealCount: number;
}

export interface SnapshotRecipe {
  id: string;
  name: string;
  totals: Macros;
  per100g: Macros;
  cookedWeightG: number | null;
  servings: number | null;
  perServing: Macros | null;
}

export interface SnapshotCalibration {
  name: string;
  foodName: string | null;
  grams: number;
}

export interface AssistantSnapshot {
  today: DateKey;
  yesterday: DateKey;
  weekday: string;
  localHour: number;
  units: Units;
  targets: { calories: number; protein: number; carbs: number | null; fat: number | null };
  /** Daily totals for the last 7 days (today first). Computed by the engine. */
  days: SnapshotDay[];
  /** Every meal from the last 14 days, newest first. */
  meals: SnapshotMeal[];
  recipes: SnapshotRecipe[];
  calibrations: SnapshotCalibration[];
}

// ---------- Actions (model → client) ----------

export interface LogMealItemSpec {
  name: string;
  /** Grams eaten. The model must always provide its best estimate. */
  grams: number | null;
  quantity: number | null;
  unitLabel: string | null;
  /** Exact name of a saved recipe, when the item is one. */
  recipeMatch: string | null;
  /** Per-100 g fallback for dishes that will not be in a food database. */
  estimatedPer100g: Macros | null;
}

export type AssistantAction =
  | { type: 'log_meal'; date: DateKey; mealType: MealType; name: string | null; items: LogMealItemSpec[] }
  | { type: 'repeat_meal'; sourceMealId: string; date: DateKey; mealType: MealType }
  | { type: 'update_item_grams'; mealId: string; itemId: string; grams: number }
  | { type: 'delete_meal'; mealId: string }
  | { type: 'delete_item'; mealId: string; itemId: string };

export type AssistantActionType = AssistantAction['type'];

/** One possible target when the model could not pick a single meal/item. */
export interface ActionCandidate {
  mealId: string;
  itemId: string | null;
}

export interface AssistantProposal {
  action: AssistantAction;
  /** Show a confirmation card before applying. Always true for deletions. */
  needsConfirmation: boolean;
  /** More than one entry means the user must choose; the action then targets the chosen one. */
  candidates: ActionCandidate[];
  /** One sentence describing the change, e.g. "Log yesterday's lunch as today's lunch". */
  summary: string;
}

export interface AssistantReply {
  reply: string;
  proposal: AssistantProposal | null;
  /** 'mock' when the server answered with the offline rule-based assistant. */
  mode: 'claude' | 'mock';
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The flat shape the model emits (structured outputs work best without unions).
 * `toProposal` turns it into a validated AssistantProposal or rejects it.
 */
export interface ModelAction {
  type: AssistantActionType;
  date: string | null;
  mealType: MealType | null;
  name: string | null;
  items: LogMealItemSpec[] | null;
  sourceMealId: string | null;
  mealId: string | null;
  itemId: string | null;
  grams: number | null;
  candidates: ActionCandidate[] | null;
  needsConfirmation: boolean;
  summary: string;
}

export interface ModelReply {
  reply: string;
  action: ModelAction | null;
}
