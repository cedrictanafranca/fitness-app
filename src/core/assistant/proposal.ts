/**
 * Turns the model's flat ModelAction into a validated AssistantProposal, checked against
 * the snapshot it was produced from (ids must exist, dates must be real, grams sane).
 * Pure; runs on the server before the reply is sent and is unit-tested.
 */

import type { MealType } from '../types';
import type {
  ActionCandidate,
  AssistantAction,
  AssistantProposal,
  AssistantSnapshot,
  LogMealItemSpec,
  ModelAction,
} from './types';

const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MAX_GRAMS = 20000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ProposalResult = { ok: true; proposal: AssistantProposal } | { ok: false; reason: string };

function isMealType(v: unknown): v is MealType {
  return typeof v === 'string' && (MEAL_TYPES as readonly string[]).includes(v);
}

function validDate(v: string | null, snapshot: AssistantSnapshot): string | null {
  if (!v || !DATE_RE.test(v)) return null;
  // Never log into the future.
  return v <= snapshot.today ? v : null;
}

function validGrams(v: number | null): number | null {
  return v !== null && Number.isFinite(v) && v > 0 && v <= MAX_GRAMS ? Math.round(v * 10) / 10 : null;
}

function hasMeal(snapshot: AssistantSnapshot, mealId: string | null): mealId is string {
  return !!mealId && snapshot.meals.some((m) => m.id === mealId);
}

function hasItem(snapshot: AssistantSnapshot, mealId: string, itemId: string | null): itemId is string {
  const meal = snapshot.meals.find((m) => m.id === mealId);
  return !!meal && !!itemId && meal.items.some((i) => i.id === itemId);
}

function cleanItems(items: LogMealItemSpec[] | null, snapshot: AssistantSnapshot): LogMealItemSpec[] {
  const recipeNames = new Set(snapshot.recipes.map((r) => r.name));
  return (items ?? [])
    .filter((i) => i.name?.trim())
    .map((i) => {
      const quantity = i.quantity !== null && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : null;
      const p = i.estimatedPer100g;
      const per100 =
        p && [p.calories, p.protein, p.carbs, p.fat].every((v) => Number.isFinite(v) && v >= 0) && p.calories <= 900
          ? p
          : null;
      return {
        name: i.name.trim(),
        grams: validGrams(i.grams),
        quantity,
        unitLabel: quantity !== null && i.unitLabel?.trim() ? i.unitLabel.trim() : null,
        recipeMatch: i.recipeMatch && recipeNames.has(i.recipeMatch) ? i.recipeMatch : null,
        estimatedPer100g: per100,
      };
    });
}

/** Candidates the snapshot can vouch for, de-duplicated, excluding the primary target. */
function cleanCandidates(raw: ActionCandidate[] | null, snapshot: AssistantSnapshot, needsItem: boolean): ActionCandidate[] {
  const seen = new Set<string>();
  const out: ActionCandidate[] = [];
  for (const c of raw ?? []) {
    if (!hasMeal(snapshot, c.mealId)) continue;
    const itemId = c.itemId && hasItem(snapshot, c.mealId, c.itemId) ? c.itemId : null;
    if (needsItem && !itemId) continue;
    const key = `${c.mealId}:${itemId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ mealId: c.mealId, itemId });
  }
  return out;
}

export function toProposal(raw: ModelAction, snapshot: AssistantSnapshot): ProposalResult {
  const summary = raw.summary?.trim() || 'Apply this change';
  let action: AssistantAction;
  let candidates: ActionCandidate[] = [];

  switch (raw.type) {
    case 'log_meal': {
      const items = cleanItems(raw.items, snapshot);
      if (items.length === 0) return { ok: false, reason: 'log_meal without items' };
      const date = validDate(raw.date, snapshot) ?? snapshot.today;
      const mealType = isMealType(raw.mealType) ? raw.mealType : null;
      if (!mealType) return { ok: false, reason: 'log_meal without mealType' };
      action = { type: 'log_meal', date, mealType, name: raw.name?.trim() || null, items };
      break;
    }
    case 'repeat_meal': {
      candidates = cleanCandidates(raw.candidates, snapshot, false);
      const sourceMealId = hasMeal(snapshot, raw.sourceMealId) ? raw.sourceMealId : candidates[0]?.mealId;
      if (!sourceMealId) return { ok: false, reason: 'repeat_meal: unknown source meal' };
      const source = snapshot.meals.find((m) => m.id === sourceMealId)!;
      const date = validDate(raw.date, snapshot) ?? snapshot.today;
      const mealType = isMealType(raw.mealType) ? raw.mealType : source.mealType;
      action = { type: 'repeat_meal', sourceMealId, date, mealType };
      break;
    }
    case 'update_item_grams': {
      candidates = cleanCandidates(raw.candidates, snapshot, true);
      const grams = validGrams(raw.grams);
      if (grams === null) return { ok: false, reason: 'update_item_grams without grams' };
      const target = pickTarget(raw, snapshot, candidates, true);
      if (!target) return { ok: false, reason: 'update_item_grams: unknown meal/item' };
      action = { type: 'update_item_grams', mealId: target.mealId, itemId: target.itemId!, grams };
      break;
    }
    case 'delete_item': {
      candidates = cleanCandidates(raw.candidates, snapshot, true);
      const target = pickTarget(raw, snapshot, candidates, true);
      if (!target) return { ok: false, reason: 'delete_item: unknown meal/item' };
      action = { type: 'delete_item', mealId: target.mealId, itemId: target.itemId! };
      break;
    }
    case 'delete_meal': {
      candidates = cleanCandidates(raw.candidates, snapshot, false);
      const target = pickTarget(raw, snapshot, candidates, false);
      if (!target) return { ok: false, reason: 'delete_meal: unknown meal' };
      action = { type: 'delete_meal', mealId: target.mealId };
      break;
    }
    default:
      return { ok: false, reason: `unknown action type ${String((raw as { type: unknown }).type)}` };
  }

  const destructive = action.type === 'delete_meal' || action.type === 'delete_item';
  return {
    ok: true,
    proposal: {
      action,
      needsConfirmation: Boolean(raw.needsConfirmation) || destructive || candidates.length > 1,
      candidates: candidates.length > 1 ? candidates : [],
      summary,
    },
  };
}

function pickTarget(
  raw: ModelAction,
  snapshot: AssistantSnapshot,
  candidates: ActionCandidate[],
  needsItem: boolean
): ActionCandidate | null {
  if (hasMeal(snapshot, raw.mealId)) {
    if (!needsItem) return { mealId: raw.mealId, itemId: null };
    if (hasItem(snapshot, raw.mealId, raw.itemId)) return { mealId: raw.mealId, itemId: raw.itemId };
    // A meal with exactly one item needs no itemId.
    const meal = snapshot.meals.find((m) => m.id === raw.mealId)!;
    if (meal.items.length === 1) return { mealId: raw.mealId, itemId: meal.items[0].id };
  }
  return candidates[0] ?? null;
}

/** Re-target a proposal at the candidate the user picked. */
export function withCandidate(proposal: AssistantProposal, pick: ActionCandidate): AssistantProposal {
  const a = proposal.action;
  let action: AssistantAction = a;
  if (a.type === 'repeat_meal') action = { ...a, sourceMealId: pick.mealId };
  else if (a.type === 'delete_meal') action = { ...a, mealId: pick.mealId };
  else if ((a.type === 'delete_item' || a.type === 'update_item_grams') && pick.itemId) {
    action = { ...a, mealId: pick.mealId, itemId: pick.itemId };
  }
  return { ...proposal, action, candidates: [] };
}
