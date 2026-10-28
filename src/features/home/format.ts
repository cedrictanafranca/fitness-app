import { toDateKey } from '@/core/nutrition/engine';
import type { DateKey, Meal, MealItem, MealType } from '@/core/types';

export const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snacks' },
];

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** "Today", "Yesterday", otherwise "Mon, Oct 26". */
export function dayTitle(key: DateKey, today: DateKey): string {
  if (key === today) return 'Today';
  const date = parseDateKey(key);
  const yesterday = parseDateKey(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function mealTitle(meal: Meal): string {
  if (meal.name?.trim()) return meal.name.trim();
  const names = meal.items.map((i) => i.name).filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'Meal';
}

/** "150 g" when grams are known, else "2 scoops". */
export function itemAmount(item: MealItem): string {
  if (item.grams != null) return `${Math.round(item.grams)} g`;
  if (item.quantity != null) {
    const q = Math.round(item.quantity * 100) / 100;
    return item.unitLabel ? `${q} ${item.unitLabel}` : String(q);
  }
  return '';
}

export function mealHasEstimates(meal: Meal): boolean {
  return meal.items.some((i) => i.estimateStatus === 'estimated');
}

/** Monday-first week containing `key`. */
export function weekOf(key: DateKey): DateKey[] {
  const date = parseDateKey(key);
  const offset = (date.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset + i)));
}
