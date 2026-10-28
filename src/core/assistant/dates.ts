/** Natural-language date phrases → DateKey. Pure; used by the offline assistant and tests. */

import { shiftDateKey } from '../nutrition/engine';
import type { DateKey } from '../types';

export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Tuesday" for a DateKey. */
export function weekdayName(key: DateKey): string {
  const name = WEEKDAYS[parseDateKey(key).getDay()];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Days back to the most recent `weekday` strictly before today (1–7). */
function daysBackTo(todayDow: number, targetDow: number): number {
  const diff = (todayDow - targetDow + 7) % 7;
  return diff === 0 ? 7 : diff;
}

/**
 * Resolve "today", "yesterday", "last Tuesday", "on Tuesday", "Tuesday", "2 days ago" or an
 * ISO date in `text`. Bare weekdays mean the most recent occurrence (today when it matches).
 * Returns null when no date phrase is present.
 */
export function resolveDatePhrase(text: string, today: DateKey): DateKey | null {
  const t = text.toLowerCase();
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  if (/\byesterday\b/.test(t)) return shiftDateKey(today, -1);
  if (/\btoday\b/.test(t)) return today;
  const ago = t.match(/\b(\d+)\s+days?\s+ago\b/);
  if (ago) return shiftDateKey(today, -Number(ago[1]));
  const todayDow = parseDateKey(today).getDay();
  for (let dow = 0; dow < WEEKDAYS.length; dow++) {
    const name = WEEKDAYS[dow];
    const re = new RegExp(`\\b(last\\s+)?(${name}|${name.slice(0, 3)})\\b`);
    const m = t.match(re);
    if (!m) continue;
    if (m[1]) return shiftDateKey(today, -daysBackTo(todayDow, dow));
    const diff = (todayDow - dow + 7) % 7;
    return shiftDateKey(today, -diff);
  }
  return null;
}
