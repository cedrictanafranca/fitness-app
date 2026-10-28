/**
 * Offline, rule-based assistant used when ANTHROPIC_API_KEY is missing or ASSISTANT_MOCK=1.
 * It understands the PRD §10 example commands against the snapshot so the whole
 * client flow (proposal → confirmation → repositories) can be exercised without Claude.
 * Pure: no I/O, no SDK.
 */

import { resolveDatePhrase } from '../core/assistant/dates';
import type {
  ActionCandidate,
  AssistantSnapshot,
  ModelAction,
  ModelReply,
  SnapshotItem,
  SnapshotMeal,
} from '../core/assistant/types';
import type { MealType } from '../core/types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const STOP = new Set([
  'the', 'a', 'an', 'my', 'i', 'that', 'this', 'logged', 'earlier', 'today', 'yesterday', 'please', 'remove',
  'delete', 'from', 'log', 'of', 'in', 'were', 'was', 'is', 'how', 'many', 'much', 'calories', 'calorie', 'protein',
  'did', 'eat', 'have', 'had', 'what', 'me', 'it', 'again', 'same', 'as', 'and', 'for', 'to', 'kcal', 'g', 'grams',
  'gram', 'on', 'last', 'change', 'update', 'set', 'make', 'ate', 'with', 'entry', 'item', 'meal',
]);

const emptyAction = (type: ModelAction['type'], summary: string): ModelAction => ({
  type,
  date: null,
  mealType: null,
  name: null,
  items: null,
  sourceMealId: null,
  mealId: null,
  itemId: null,
  grams: null,
  candidates: null,
  needsConfirmation: false,
  summary,
});

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w) && !MEAL_TYPES.includes(w as MealType));
}

function mealTypeIn(text: string): MealType | null {
  const t = text.toLowerCase();
  for (const m of MEAL_TYPES) if (new RegExp(`\\b${m}s?\\b`).test(t)) return m;
  if (/\bsnacks?\b/.test(t)) return 'snack';
  return null;
}

function kcal(n: number): string {
  return `${Math.round(n)} kcal`;
}
function g1(n: number): string {
  return `${Math.round(n * 10) / 10} g`;
}

function describeMeal(m: SnapshotMeal): string {
  const items = m.items.map((i) => `${i.name}${i.grams != null ? ` ${Math.round(i.grams)} g` : ''}`).join(', ');
  return `${m.mealType}: ${items} (${kcal(m.totals.calories)}, ${g1(m.totals.protein)} protein)`;
}

function scoreName(name: string, terms: string[]): number {
  const n = name.toLowerCase();
  return terms.reduce((s, t) => s + (n.includes(t) ? 1 : 0), 0);
}

function findItems(snapshot: AssistantSnapshot, terms: string[]): { meal: SnapshotMeal; item: SnapshotItem }[] {
  const hits: { meal: SnapshotMeal; item: SnapshotItem; score: number }[] = [];
  for (const meal of snapshot.meals) {
    for (const item of meal.items) {
      const score = scoreName(item.name, terms);
      if (score > 0) hits.push({ meal, item, score });
    }
  }
  if (hits.length === 0) return [];
  const best = Math.max(...hits.map((h) => h.score));
  const top = hits.filter((h) => h.score === best);
  // Prefer today's entries when the best score ties across days.
  const today = top.filter((h) => h.meal.date === snapshot.today);
  return (today.length ? today : top).map(({ meal, item }) => ({ meal, item }));
}

export function mockAssistant(messages: { role: string; content: string }[], snapshot: AssistantSnapshot): ModelReply {
  const text = messages.filter((m) => m.role === 'user').at(-1)?.content.trim() ?? '';
  const t = text.toLowerCase();
  const today = snapshot.days.find((d) => d.date === snapshot.today);

  // "How much protein do I still need?" / "How many calories are left?"
  if (/\b(protein|calories?)\b/.test(t) && /\b(still|left|remaining|need|to go)\b/.test(t) && today) {
    if (/protein/.test(t)) {
      const r = today.remainingProtein;
      return {
        reply:
          r > 0
            ? `You still need ${g1(r)} of protein today (${g1(today.consumed.protein)} of ${snapshot.targets.protein} g so far).`
            : `You've hit your protein target: ${g1(today.consumed.protein)} of ${snapshot.targets.protein} g.`,
        action: null,
      };
    }
    const r = today.remainingCalories;
    return {
      reply:
        r >= 0
          ? `You have ${kcal(r)} left today (${kcal(today.consumed.calories)} eaten).`
          : `You're ${kcal(-r)} over your target today (${kcal(today.consumed.calories)} eaten).`,
      action: null,
    };
  }

  // "Log the same lunch as yesterday" / "repeat Tuesday's dinner"
  if (/\b(log|repeat|again|same|copy)\b/.test(t) && mealTypeIn(t) && resolveDatePhrase(t, snapshot.today)) {
    const mealType = mealTypeIn(t)!;
    const date = resolveDatePhrase(t, snapshot.today)!;
    const sources = snapshot.meals.filter((m) => m.date === date && m.mealType === mealType);
    if (sources.length === 0) {
      return { reply: `I can't find a ${mealType} logged on ${date} to repeat.`, action: null };
    }
    const action = emptyAction('repeat_meal', `Log ${date}'s ${mealType} as today's ${mealType}`);
    action.sourceMealId = sources[0].id;
    action.date = snapshot.today;
    action.mealType = mealType;
    if (sources.length > 1) {
      action.candidates = sources.map((m) => ({ mealId: m.id, itemId: null }));
      action.needsConfirmation = true;
      return { reply: `There are ${sources.length} ${mealType} entries on ${date}. Which one should I repeat?`, action };
    }
    const s = sources[0];
    return {
      reply: `I'll log ${s.name} as today's ${mealType}: ${kcal(s.totals.calories)} and ${g1(s.totals.protein)} protein.`,
      action,
    };
  }

  // "Change my dinner from 200 g to 250 g"
  const change = t.match(/\bfrom\s+(\d+(?:\.\d+)?)\s*(?:g|grams?)?\s+to\s+(\d+(?:\.\d+)?)\s*(?:g|grams?)?\b/);
  if (change) {
    const from = Number(change[1]);
    const to = Number(change[2]);
    const mealType = mealTypeIn(t);
    const date = resolveDatePhrase(t, snapshot.today) ?? snapshot.today;
    const hits: ActionCandidate[] = [];
    for (const meal of snapshot.meals) {
      if (meal.date !== date || (mealType && meal.mealType !== mealType)) continue;
      for (const item of meal.items) if (item.grams != null && Math.abs(item.grams - from) < 0.5) hits.push({ mealId: meal.id, itemId: item.id });
    }
    if (hits.length === 0) {
      return { reply: `I couldn't find a ${mealType ?? 'meal'} item weighing ${from} g on ${date}.`, action: null };
    }
    const action = emptyAction('update_item_grams', `Change ${from} g to ${to} g`);
    action.mealId = hits[0].mealId;
    action.itemId = hits[0].itemId;
    action.grams = to;
    if (hits.length > 1) {
      action.candidates = hits;
      action.needsConfirmation = true;
      return { reply: `Several ${from} g items match. Which one should I change to ${to} g?`, action };
    }
    const meal = snapshot.meals.find((m) => m.id === hits[0].mealId)!;
    const item = meal.items.find((i) => i.id === hits[0].itemId)!;
    return { reply: `I'll change ${item.name} in your ${meal.mealType} from ${from} g to ${to} g.`, action };
  }

  // "Remove the protein shake I logged earlier" / "delete today's dinner"
  if (/\b(remove|delete|undo|get rid of)\b/.test(t)) {
    const mealType = mealTypeIn(t);
    const terms = words(t);
    if (terms.length === 0 && mealType) {
      const date = resolveDatePhrase(t, snapshot.today) ?? snapshot.today;
      const meals = snapshot.meals.filter((m) => m.date === date && m.mealType === mealType);
      if (meals.length === 0) return { reply: `There's no ${mealType} logged on ${date}.`, action: null };
      const action = emptyAction('delete_meal', `Delete ${date}'s ${mealType}`);
      action.mealId = meals[0].id;
      action.needsConfirmation = true;
      if (meals.length > 1) action.candidates = meals.map((m) => ({ mealId: m.id, itemId: null }));
      return { reply: `Delete your ${mealType} (${meals[0].name}, ${kcal(meals[0].totals.calories)})?`, action };
    }
    const hits = findItems(snapshot, terms);
    if (hits.length === 0) return { reply: `I couldn't find "${terms.join(' ')}" in your recent meals.`, action: null };
    const [{ meal, item }] = hits;
    const whole = meal.items.length === 1;
    const action = emptyAction(whole ? 'delete_meal' : 'delete_item', `Remove ${item.name} from ${meal.mealType}`);
    action.mealId = meal.id;
    action.itemId = whole ? null : item.id;
    action.needsConfirmation = true;
    if (hits.length > 1) action.candidates = hits.map((h) => ({ mealId: h.meal.id, itemId: h.meal.items.length === 1 ? null : h.item.id }));
    return {
      reply:
        hits.length > 1
          ? `I found ${hits.length} matching entries. Which one should I remove?`
          : `Remove ${item.name} (${kcal(item.calories)}, ${g1(item.protein)} protein) from your ${meal.mealType} on ${meal.date}?`,
      action,
    };
  }

  // "What did I eat last Tuesday?"
  if (/\b(what|which)\b.*\b(eat|ate|have|had|log|logged)\b/.test(t)) {
    const date = resolveDatePhrase(t, snapshot.today) ?? snapshot.today;
    const meals = snapshot.meals.filter((m) => m.date === date);
    const day = snapshot.days.find((d) => d.date === date);
    if (meals.length === 0) return { reply: `Nothing is logged for ${date}.`, action: null };
    const total = day ? ` Total: ${kcal(day.consumed.calories)}, ${g1(day.consumed.protein)} protein.` : '';
    return { reply: `On ${date} you logged ${meals.map(describeMeal).join('; ')}.${total}`, action: null };
  }

  // "How many calories were in Mom's chicken adobo?"
  if (/\b(how many|how much|calories|protein)\b/.test(t)) {
    const terms = words(t);
    const recipe = snapshot.recipes
      .map((r) => ({ r, score: scoreName(r.name, terms) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.r;
    if (recipe) {
      const per = recipe.perServing ? ` Per serving: ${kcal(recipe.perServing.calories)}, ${g1(recipe.perServing.protein)} protein.` : '';
      return {
        reply: `${recipe.name}: ${kcal(recipe.totals.calories)} and ${g1(recipe.totals.protein)} protein for the whole recipe; ${kcal(recipe.per100g.calories)} per 100 g.${per}`,
        action: null,
      };
    }
    const hits = findItems(snapshot, terms);
    if (hits.length) {
      const { meal, item } = hits[0];
      return {
        reply: `${item.name} (${meal.mealType}, ${meal.date}): ${kcal(item.calories)} and ${g1(item.protein)} protein${item.grams != null ? ` for ${Math.round(item.grams)} g` : ''}.`,
        action: null,
      };
    }
    return { reply: `I couldn't find a recipe or logged food matching "${terms.join(' ')}".`, action: null };
  }

  return {
    reply:
      'Offline assistant: I can answer "How much protein do I still need?", "What did I eat last Tuesday?", "How many calories were in <recipe>?", and do "Log the same lunch as yesterday", "Change my dinner from 200 g to 250 g" or "Remove the <food> I logged earlier". Add ANTHROPIC_API_KEY to .env for free-form chat.',
    action: null,
  };
}
