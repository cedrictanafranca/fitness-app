/**
 * Client side of the conversational assistant: builds the snapshot from the local DB,
 * talks to POST /api/ai/chat, and applies validated actions through the repositories.
 * The server never writes; everything persistent happens here via repos + the engine.
 */

import {
  buildSnapshot,
  createIdempotencyGuard,
  previewDeleteItem,
  previewDeleteMeal,
  previewLog,
  previewRepeat,
  previewUpdateGrams,
  removeItem,
  repeatMealInput,
  snapshotRange,
  timestampForDate,
  updateItemGrams,
  type AssistantAction,
  type AssistantReply,
  type AssistantSnapshot,
  type ChangePreview,
  type ChatTurn,
} from '@/core/assistant';
import type { AnalyzedMeal, DateKey, Meal, MealItem } from '@/core/types';
import { newId } from '@/data/ids';
import { activityRepo, calibrationsRepo, mealsRepo, profileRepo, recipesRepo } from '@/data/repos';
import { resolveAnalyzedMeal } from '@/features/log/resolve';
import { assistantReplySchema } from '@/server/schemas';
import { apiFetchJson } from './api-base';

// ---------- Snapshot ----------

export async function loadAssistantSnapshot(now = new Date()): Promise<AssistantSnapshot> {
  const { from, to } = snapshotRange(now);
  const [meals, profile, recipes, calibrations] = await Promise.all([
    mealsRepo.listRange(from, to),
    profileRepo.get(),
    recipesRepo.list(),
    calibrationsRepo.list(),
  ]);
  const dates = Array.from(new Set(meals.map((m) => m.date)));
  const activity = await Promise.all(dates.map((d) => activityRepo.caloriesForDate(d)));
  const activityByDate: Record<DateKey, number> = {};
  dates.forEach((d, i) => (activityByDate[d] = activity[i]));
  return buildSnapshot({ now, meals, profile, recipes, calibrations, activityByDate });
}

// ---------- Chat ----------

export async function sendAssistantMessage(messages: ChatTurn[], snapshot: AssistantSnapshot): Promise<AssistantReply> {
  const raw = await apiFetchJson('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, snapshot }),
  });
  const parsed = assistantReplySchema.safeParse(raw);
  if (!parsed.success) throw new Error('The server returned an unexpected assistant reply.');
  return parsed.data;
}

// ---------- Applying actions ----------

export interface PreparedAction {
  action: AssistantAction;
  preview: ChangePreview;
  /** Items that still need a weight (log_meal only); the action cannot be committed until they do. */
  blockers: string[];
  /** Performs the repository write exactly once. Safe to call again after a failure. */
  commit: () => Promise<void>;
}

/** Keys of actions already applied this session, so a retried turn never writes twice. */
const applied = createIdempotencyGuard();

export function wasApplied(key: string): boolean {
  return applied.has(key);
}

async function requireMeal(id: string): Promise<Meal> {
  const meal = await mealsRepo.get(id);
  if (!meal) throw new Error('That meal is no longer in your log.');
  return meal;
}

function once(key: string, write: () => Promise<void>): () => Promise<void> {
  return async () => {
    if (!applied.tryClaim(key)) return;
    try {
      await write();
    } catch (e) {
      applied.release(key);
      throw e;
    }
  };
}

/**
 * Resolve an action against the live DB: load the affected meal, compute the preview with
 * the engine, and return a one-shot commit. `key` is the idempotency key for this turn.
 */
export async function prepareAction(action: AssistantAction, key: string, now = new Date()): Promise<PreparedAction> {
  switch (action.type) {
    case 'repeat_meal': {
      const source = await requireMeal(action.sourceMealId);
      const input = repeatMealInput(source, action.date, action.mealType, now, newId);
      return {
        action,
        preview: previewRepeat(source, action.date, action.mealType),
        blockers: [],
        commit: once(key, async () => {
          await mealsRepo.create(input);
        }),
      };
    }
    case 'update_item_grams': {
      const meal = await requireMeal(action.mealId);
      const change = updateItemGrams(meal, action.itemId, action.grams);
      return {
        action,
        preview: previewUpdateGrams(meal, change, action.grams),
        blockers: [],
        commit: once(key, async () => {
          await mealsRepo.update(meal.id, { items: change.items });
        }),
      };
    }
    case 'delete_item': {
      const meal = await requireMeal(action.mealId);
      const change = removeItem(meal, action.itemId);
      return {
        action,
        preview: previewDeleteItem(meal, change),
        blockers: [],
        commit: once(key, async () => {
          if (change.items.length === 0) await mealsRepo.remove(meal.id);
          else await mealsRepo.update(meal.id, { items: change.items });
        }),
      };
    }
    case 'delete_meal': {
      const meal = await requireMeal(action.mealId);
      return {
        action,
        preview: previewDeleteMeal(meal),
        blockers: [],
        commit: once(key, async () => {
          await mealsRepo.remove(meal.id);
        }),
      };
    }
    case 'log_meal': {
      const [recipes, calibrations] = await Promise.all([recipesRepo.list(), calibrationsRepo.list()]);
      // Same resolution path as the Log flow: recipe → food database → AI per-100 g estimate.
      const analyzed: AnalyzedMeal = {
        items: action.items.map((i) => ({
          name: i.name,
          estimatedGrams: i.grams,
          statedGrams: null,
          quantity: i.quantity,
          unitLabel: i.unitLabel,
          recipeMatch: i.recipeMatch,
          confidence: 0.8,
          estimatedPer100g: i.estimatedPer100g,
          gramsRange: null,
          portionBasis: null,
        })),
        mealType: action.mealType,
        clarification: null,
        notes: null,
      };
      const items: MealItem[] = await resolveAnalyzedMeal(analyzed, { recipes, calibrations });
      const blockers = items.filter((i) => i.grams == null || !(i.grams > 0)).map((i) => i.name);
      const name = action.name ?? items.map((i) => i.name).join(', ');
      return {
        action,
        preview: previewLog(items, action.date, action.mealType, action.name),
        blockers,
        commit: once(key, async () => {
          if (blockers.length) throw new Error(`No weight for ${blockers.join(', ')}. Tell me the grams and I'll log it.`);
          await mealsRepo.create({
            date: action.date,
            timestamp: timestampForDate(action.date, action.mealType, now),
            mealType: action.mealType,
            name,
            inputText: `assistant: ${name}`,
            items,
          });
        }),
      };
    }
  }
}
